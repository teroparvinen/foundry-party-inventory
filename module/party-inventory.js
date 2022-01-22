import { moduleId, localizationID } from './const.js';
import { addTogglePartyButton, addTogglePartyButtonTidy, addGroupInventoryIndicatorTidy } from './sheet-inject.js';
import { PartyInventory } from './inventory.js';

Hooks.on('setup', () => {
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
    const notes = controls.find((c) => c.name === 'notes');
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
