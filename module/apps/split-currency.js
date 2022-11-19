import { moduleId, localizationID } from '../const.js';
import { Currency } from '../currency.js';

export class SplitCurrency extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            classes: ['sheet'],
            height: 'auto',
            width: 550,
            resizable: true,
            editable: true,
            id: `${moduleId}-split-currency`,
            template: `modules/${moduleId}/templates/split-currency.hbs`,
            title: `${localizationID}.split-currency`,
            userId: game.userId,
            closeOnSubmit: true,
            submitOnChange: false
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    showNonSplitting = false

    activateListeners(html) {
        html.find('.party-inventory__actor-included').on('change', function(event) {
            Currency.requestActorState(this.dataset.actorId, !this.checked);
        });
        html.find('[data-action]').click(this._handleButtonClick.bind(this));
    }

    _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;

        switch (action) {
            case 'reveal-disabled':
                this.showNonSplitting = true;
                this.render();
                break;
        }
    }

    async _updateObject(event, formData) {
        const { actors } = foundry.utils.expandObject(formData);
        
        for (let actorId in actors) {
            Currency.requestTake(actors[actorId], actorId);
        }
    }

    getData(options) {
        const actorInfo = Currency.actorInfo;
        const actors = actorInfo.filter(i => i.isIncluded).map(i => i.actor);
        const nonSplittingActors = actorInfo.filter(i => !i.isIncluded).map(i => i.actor);

        const stash = Currency.values;

        const values = {};
        for (let currency in stash) {
            values[currency] = Math.floor(stash[currency] / actors.length);
        }

        return { 
            actors: actors.map(a => {
                return {
                    name: a.name,
                    id: a.id,
                    currency: { ...values }
                }
            }),
            nonSplittingActors,
            showNonSplitting: this.showNonSplitting
        };
    }

}
