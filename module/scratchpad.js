import { moduleId } from './const.js';
import { Mutex } from './dependencies/semaphore.js';

export class Scratchpad {
    static mutex = new Mutex();

    static get items() {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');
        return scratchpad.order?.map(id => scratchpad.items[id]) || [];
    }

    static getItem(itemId) {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');
        return scratchpad.items[itemId];
    }

    static createItem(itemData, options = {}) {
        this.mutex.acquire().then(async release => {
            const newItem = {
                ...itemData,
                id: foundry.utils.randomID(16)
            }
    
            let scratchpad = game.settings.get(moduleId, 'scratchpad') || {};
            if (scratchpad instanceof String || typeof scratchpad != 'object' || Array.isArray(scratchpad)) { scratchpad = {}; }
            if (!scratchpad.items || typeof(scratchpad.items) != 'object' || Array.isArray(scratchpad.items)) { scratchpad.items = {}; }
            if (!scratchpad.order || typeof(scratchpad.order) != 'object' || !Array.isArray(scratchpad.order)) { scratchpad.order = []; }
    
            scratchpad.items[newItem.id] = newItem;

            if (options.after) {
                const insertIndex = scratchpad.order.indexOf(options.after) + 1;
                scratchpad.order = [...scratchpad.order.slice(0, insertIndex), newItem.id, ...scratchpad.order.slice(insertIndex)];
            } else {
                scratchpad.order.push(newItem.id);
            }
    
            await game.settings.set(moduleId, 'scratchpad', scratchpad);
            release();
        });
    }

    static updateItem(itemId, itemData) {
        this.mutex.acquire().then(async release => {
            const scratchpad = game.settings.get(moduleId, 'scratchpad');
            scratchpad.items[itemId] = foundry.utils.mergeObject(scratchpad.items[itemId] || {}, itemData);
            await game.settings.set(moduleId, 'scratchpad', scratchpad);
            release();
        });
    }

    static deleteItem(itemId) {
        this.mutex.acquire().then(async release => {
            const scratchpad = game.settings.get(moduleId, 'scratchpad');
            if (scratchpad.items[itemId]) {
                delete scratchpad.items[itemId];
                scratchpad.order = scratchpad.order.filter(id => id !== itemId);
        
                await game.settings.set(moduleId, 'scratchpad', scratchpad);
                release();
            } else {
                release();
            }
        });
    }

    static reorderItem(movedItemId, targetItemId) {
        this.mutex.acquire().then(async release => {
            const scratchpad = game.settings.get(moduleId, 'scratchpad');
            const movedItemIndex = scratchpad.order.indexOf(movedItemId);
            const targetItemIndex = scratchpad.order.indexOf(targetItemId);
            if (movedItemIndex >= 0 && targetItemIndex >= 0 && movedItemIndex != targetItemIndex) {
                const filteredOrder = scratchpad.order.filter(o => o !== movedItemId);
                const insertIndex = movedItemIndex > targetItemIndex ? filteredOrder.indexOf(targetItemId) : filteredOrder.indexOf(targetItemId) + 1;
                if (insertIndex >= 0) {
                    scratchpad.order = [...filteredOrder.slice(0, insertIndex), movedItemId, ...filteredOrder.slice(insertIndex)];
                    await game.settings.set(moduleId, 'scratchpad', scratchpad);
                }
            }
            release();
        });
    }

    static requestCreate(itemData, options) {
        if (game.user.isGM) {
            Scratchpad.createItem(itemData, options);
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'create',
                itemData: itemData,
                options
            });
        }
    }

    static requestUpdate(itemId, itemData) {
        if (game.user.isGM) {
            Scratchpad.updateItem(itemId, itemData);
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'update',
                items: { [itemId]: itemData }
            });
        }
    }

    static requestDelete(itemId) {
        if (game.user.isGM) {
            Scratchpad.deleteItem(itemId);
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'delete',
                items: [itemId]
            });
        }
    }

    static requestReorder(movedItemId, targetItemId) {
        if (game.user.isGM) {
            Scratchpad.reorderItem(movedItemId, targetItemId);
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'reorder',
                items: [movedItemId, targetItemId]
            });
        }
    }
}

Hooks.on('setup', () => {
    game.socket.on(`module.${moduleId}`, ({ type, items, itemData, options }) => {
        if (game.user.isGM) {
            switch (type) {
                case 'create':
                    Scratchpad.createItem(itemData, options);
                    break;
                case 'update':
                    for (let id in items) {
                        Scratchpad.updateItem(id, items[id]);
                    }
                    break;
                case 'delete':
                    items.forEach(id => Scratchpad.deleteItem(id));
                    break;
                case 'reorder':
                    Scratchpad.reorderItem(items[0], items[1]);
                    break;
            }
        }
    });
});

Hooks.on('createItem', (item) => {
    if (game.user.isGM) {
        const id = item.getFlag(moduleId, 'scratchpadId');
        if (id) {
            Scratchpad.deleteItem(id);
        }
    }
});

Hooks.on('setup', () => {
    const ActorSheet5eCharacter = game.dnd5e.applications.actor.ActorSheet5eCharacter;
    const ActorSheet5e = Object.getPrototypeOf(ActorSheet5eCharacter);
    const prev = ActorSheet5e.prototype._onDropStackConsumables;
    if (prev) {
        ActorSheet5e.prototype._onDropStackConsumables = function(itemData) {
            const scratchpadId = itemData.flags['party-inventory']?.scratchpadId;
            const wrappedResult = prev.apply(this, [itemData]);

            if (wrappedResult && scratchpadId) {
                Scratchpad.requestDelete(scratchpadId);
            }

            return wrappedResult;
        };
    }
});
