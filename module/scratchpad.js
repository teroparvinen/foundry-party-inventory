import { moduleId } from './const.js';

export class Scratchpad {
    static get items() {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');
        return scratchpad.order?.map(id => scratchpad.items[id]) || [];
    }

    static getItem(itemId) {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');
        return scratchpad.items[itemId];
    }

    static createItem(itemData) {
        const newItem = {
            ...itemData,
            id: foundry.utils.randomID(16)
        }

        let scratchpad = game.settings.get(moduleId, 'scratchpad') || {};
        if (scratchpad instanceof String || typeof scratchpad != 'object' || Array.isArray(scratchpad)) { scratchpad = {}; }
        if (!scratchpad.items || typeof(scratchpad.items) != 'object' || Array.isArray(scratchpad.items)) { scratchpad.items = {}; }
        if (!scratchpad.order || typeof(scratchpad.order) != 'object' || !Array.isArray(scratchpad.order)) { scratchpad.order = []; }

        scratchpad.items[newItem.id] = newItem;
        scratchpad.order.push(newItem.id);

        game.settings.set(moduleId, 'scratchpad', scratchpad);
    }

    static updateItem(itemId, itemData) {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');

        scratchpad.items[itemId] = foundry.utils.mergeObject(scratchpad.items[itemId] || {}, itemData);

        game.settings.set(moduleId, 'scratchpad', scratchpad);
    }

    static deleteItem(itemId) {
        const scratchpad = game.settings.get(moduleId, 'scratchpad');

        if (scratchpad.items[itemId]) {
            delete scratchpad.items[itemId];
            scratchpad.order = scratchpad.order.filter(id => id !== itemId);
    
            game.settings.set(moduleId, 'scratchpad', scratchpad);
        }
    }

    static requestCreate(itemData) {
        if (game.user.isGM) {
            Scratchpad.createItem(itemData);
        } else {
            socket.emit(`module.${moduleId}`, {
                type: 'create',
                itemData: itemData
            });
        }
    }

    static requestUpdate(itemId, itemData) {
        if (game.user.isGM) {
            Scratchpad.updateItem(itemId, itemData);
        } else {
            socket.emit(`module.${moduleId}`, {
                type: 'update',
                items: { [itemId]: itemData }
            });
        }
    }

    static requestDelete(itemId) {
        if (game.user.isGM) {
            Scratchpad.deleteItem(itemId);
        } else {
            socket.emit(`module.${moduleId}`, {
                type: 'delete',
                items: [itemId]
            });
        }
    }
}

Hooks.on('setup', () => {
    socket.on(`module.${moduleId}`, ({ type, items, itemData }) => {
        if (game.user.isGM) {
            switch (type) {
                case 'create':
                    Scratchpad.createItem(itemData);
                    break;
                case 'update':
                    for (let id in items) {
                        Scratchpad.updateItem(id, items[id]);
                    }
                    break;
                case 'delete':
                    items.forEach(id => Scratchpad.deleteItem(id));
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
