import { moduleId, localizationID } from './const.js';
import { addTogglePartyButton, addTogglePartyButtonTidy, addGroupInventoryIndicatorTidy } from './sheet-inject.js';
import { PartyInventory } from './apps/inventory.js';
import { SplitCurrency } from './apps/split-currency.js';

Hooks.on('setup', () => {
    const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);

    game.settings.register(moduleId, 'scratchpad', { 
        scope: 'world',
        type: Object,
        default: {
            items: {},
            order: []
        },
        onChange: value => {
            PartyInventory.refresh();
        }
    });
    game.settings.register(moduleId, 'currency', { 
        scope: 'world',
        type: Object,
        default: {
            pp: 0,
            gp: 0,
            ep: 0,
            sp: 0,
            cp: 0
        },
        onChange: value => {
            PartyInventory.refresh();
        }
    });
    game.settings.register(moduleId, 'excludedActors', { 
        scope: 'world',
        type: Object,
        default: [],
        onChange: value => {
            Object.values(ui.windows).filter(w => w instanceof SplitCurrency).forEach(w => w.render());
        }
    });
    game.settings.register(moduleId, 'controlButtonGroup', {
        name: `${localizationID}.setting-control-group`,
        scope: 'client',
        config: true,
        type: String,
        default: "token",
        choices: {
            "token": `${localizationID}.token-group`,
            "notes": `${localizationID}.notes-group`
        },
        onChange: debouncedReload
    });
    game.settings.register(moduleId, 'currencyNotifications', {
        name: `${localizationID}.setting-currency-notifications`,
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(moduleId, 'deleteActorItemOnDrag', {
        name: `${localizationID}.setting-delete-actor-item-on-drag`,
        hint: `${localizationID}.setting-delete-actor-item-on-drag-hint`,
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });
});

Hooks.on('renderActorSheet5eCharacter', (sheet, html, character) => {
    let sheetClasses = sheet.options.classes;
    if (sheetClasses[0] === "tidy5e") {
        addTogglePartyButtonTidy(html, sheet.actor);
        addGroupInventoryIndicatorTidy(html, sheet.actor);
    } else {
        addTogglePartyButton(html, sheet.actor);
    }
});

Hooks.on('getActorSheet5eCharacterHeaderButtons', (app, buttons) => {
    buttons.unshift({
        class: 'open-party-inventory-button',
        icon: 'fas fa-users',
        label: game.i18n.localize(`${localizationID}.button-title`),
        onclick: () => {
            PartyInventory.activate();
        }
    });
});
Hooks.on('getSceneControlButtons', (controls) => {
    const notes = controls.find((c) => c.name === game.settings.get(moduleId, 'controlButtonGroup'));
    if (notes) {
        notes.tools.push({
            name: moduleId,
            title: `${localizationID}.button-title`,
            icon: 'fas fa-users',
            visible: true,
            onClick: () => PartyInventory.activate(),
            button: true
        });
    }
});

Hooks.on('updateItem', (item) => {
    PartyInventory.refresh();
});
Hooks.on('deleteItem', (item) => {
    PartyInventory.refresh();
});

Hooks.on('init', () => {
    game.modules.get(moduleId).api = {
        openWindow: () => { PartyInventory.activate(); }
    }
});
