import { moduleId, localizationID } from '../const.js';
import { Currency } from '../currency.js';

export class TakeCurrency extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            classes: ['sheet'],
            height: 120,
            width: 420,
            resizable: false,
            editable: true,
            id: `${moduleId}-take-currency`,
            template: `modules/${moduleId}/templates/take-currency.hbs`,
            title: `${localizationID}.take-currency`,
            userId: game.userId,
            closeOnSubmit: true,
            submitOnChange: false
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    async _updateObject(event, formData) {
        const { currency } = foundry.utils.expandObject(formData);
        Currency.requestTake(currency, game.user.character.id);
    }

    activateListeners(html) {
        const focus = html.find(':focus');
        if (focus.length == 0) {
            html.find("[name='currency.pp']").focus();
        }
    }

}
