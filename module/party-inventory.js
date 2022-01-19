import { moduleId, localizationID } from './const.js';
import { addTogglePartyButton, addTogglePartyButtonTidy, addGroupInventoryIndicatorTidy } from './sheet-inject.js';
import { PartyInventory } from './inventory.js';

Hooks.on('setup', () => {
	game.settings.register(moduleId, 'scratchpad', { scope: 'world', type: Object });
});

Hooks.on('renderPlayerList', (playerList, html) => {
	const insertPoint = html.find(`[data-user-id="${game.userId}"]`)

	const tooltip = game.i18n.localize(`${localizationID}.button-title`);
	insertPoint.append(
		`<button type='button' class='open-party-inventory-button flex0' title='${tooltip}'><i class='fas fa-tasks'></i></button>`
	);

	html.on('click', '.open-party-inventory-button', (event) => {
		event.stopPropagation();

		PartyInventory.activate();

		return false;
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
