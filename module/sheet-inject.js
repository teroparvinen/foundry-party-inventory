import { moduleId, localizationID } from './const.js';

export function addTogglePartyButton(html, actor) {
    const enableTitle = game.i18n.localize(`${localizationID}.enable-item-title`);
    const disableTitle = game.i18n.localize(`${localizationID}.disable-item-title`);

    html.find(".inventory ol:not(.currency-list)  .item-control.item-edit").each(function() {
        const currentItemId = this.closest(".item").dataset.itemId;
        const currentItem = actor.items.find(item => item.id === currentItemId);
        const isInPartyInventory = currentItem.getFlag(moduleId, 'inPartyInventory');

        const title = isInPartyInventory ? disableTitle : enableTitle;
        const active = isInPartyInventory ? 'active' : '';

        $(`
            <a class="item-control party-inventory-module item-toggle ${active}" title="${title}">
            <i class="fas fa-users"></i>
            </a>
        `).insertAfter(this);

        $(this.nextElementSibling).on('click', function() {
            currentItem.setFlag(moduleId, 'inPartyInventory', !isInPartyInventory);
        });
    });
}

export function addTogglePartyButtonTidy(html, actor) {
    const enableTitle = game.i18n.localize(`${localizationID}.enable-item-title`);
    const disableTitle = game.i18n.localize(`${localizationID}.disable-item-title`);

    const title = enableTitle;

    html.find(".inventory .item-control.item-edit").each(function() {
        const currentItemId = this.closest(".item").dataset.itemId;
        const currentItem = actor.items.find(item => item.id === currentItemId);
        const isInPartyInventory = currentItem.getFlag(moduleId, 'inPartyInventory');

        const title = isInPartyInventory ? disableTitle : enableTitle;
        const active = isInPartyInventory ? 'active' : '';

        $(`
            <a class="item-control party-inventory-module" title="${title}">
                <i class="fas fa-users"></i>
                <span class="control-label">${title}</span>
            </a>
        `).insertAfter(this);

        $(this.nextElementSibling).on('click', function() {
            currentItem.setFlag(moduleId, 'inPartyInventory', !isInPartyInventory);
        });
    });
}

export function addGroupInventoryIndicatorTidy(html, actor) {
    const title = game.i18n.localize(`${localizationID}.is-in-party-inventory`);

    html.find(".inventory .item .item-name").each(function () {
        const currentItemId = this.closest(".item").dataset.itemId;
        const currentItem = actor.items.find(item => item.id === currentItemId);
        const isInPartyInventory = currentItem.getFlag(moduleId, 'inPartyInventory');

        if (isInPartyInventory) {
            $(`
                <div class="item-state-icon" title="${title}">
                    <i class="fas fa-users"></i>
                </div>
            `).insertAfter(this);
        }
    });
}
