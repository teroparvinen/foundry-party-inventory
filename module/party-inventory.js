import { moduleId, localizationID } from './const.js';
import { addTogglePartyButton, addTogglePartyButtonTidy, addGroupInventoryIndicatorTidy } from './sheet-inject.js';
import { PartyInventory } from './inventory.js';

Hooks.on('setup', () => {
	game.settings.register(moduleId, 'scratchpad', { scope: 'world', type: Object });
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

Hooks.on('updateItem', (item) => {
	PartyInventory.refresh();
});

Hooks.on('createSetting', (setting) => {
	if (setting.key == `${moduleId}.scratchpad`) {
		PartyInventory.refresh();
	}
});
Hooks.on('updateSetting', (setting) => {
	if (setting.key == `${moduleId}.scratchpad`) {
		PartyInventory.refresh();
	}
});
