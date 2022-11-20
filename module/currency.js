import { localizationID, moduleId } from './const.js';
import { Mutex } from './dependencies/semaphore.js';

export class Currency {
    static mutex = new Mutex();

    static get values() {
        return game.settings.get(moduleId, 'currency');
    }

    static set values(newValues) {
        game.settings.set(moduleId, 'currency', newValues);
    }

    static get actorInfo() {
        const actors = game.actors.filter(a => a.hasPlayerOwner);
        const excluded = game.settings.get(moduleId, 'excludedActors');

        return actors.map(a => {
            return {
                actor: a,
                isIncluded: !excluded.includes(a.id)
            }
        })
    }

    static updateActorState(actorId, state) {
        const excluded = game.settings.get(moduleId, 'excludedActors').filter(i => i !== actorId);

        if (state) {
            excluded.push(actorId);
        }

        game.settings.set(moduleId, 'excludedActors', excluded);
    }

    static requestUpdate(currency) {
        if (game.user.isGM) {
            Currency.values = currency;
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'update-currency',
                transfer: currency
            });
        }
    }

    static requestTake(currency, actorId) {
        if (game.user.isGM) {
            this.handleTransfer({ currency, actorId });
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'transfer-currency',
                transfer: {
                    currency,
                    actorId
                }
            });
        }
    }

    static requestActorState(actorId, state) {
        if (game.user.isGM) {
            this.updateActorState(actorId, state);
        } else {
            game.socket.emit(`module.${moduleId}`, {
                type: 'update-actor-state',
                transfer: {
                    actorId,
                    state
                }
            });
        }
    }

    static handleTransfer(transfer) {
        this.mutex.acquire().then(async release => {
            const actor = game.actors.get(transfer.actorId);
            const currentCurrency = actor.system.currency;
            const transferCurrency = transfer.currency;
            const actorUpdate = {};
            const partyCurrency = this.values;
            const message = [];
    
            for (let currency in currentCurrency) {
                if (Number.isInteger(transferCurrency[currency]) && transferCurrency[currency] != 0) {
                    actorUpdate[currency] = currentCurrency[currency] + transferCurrency[currency];
                    partyCurrency[currency] = partyCurrency[currency] - transferCurrency[currency];
                    message.push(`${transferCurrency[currency]} ${game.i18n.localize(`${localizationID}.${currency}`)}`);
                }
            }
    
            await actor.update({ 'data.currency': actorUpdate });
            await game.settings.set(moduleId, 'currency', partyCurrency);
    
            if (game.settings.get(moduleId, 'currencyNotifications')) {
                if (message.length) {
                    const notificationMessage = game.i18n.format(`${localizationID}.took-currency-notification`, {
                        name: actor.name,
                        currency: message.join(', ')
                    })
                    game.socket.emit(`module.${moduleId}`, {
                        type: 'notify-transfer',
                        transfer: notificationMessage
                    });
                    ui.notifications.info(notificationMessage);
                }
            }
    
            release();
        });
    }
}

Hooks.on('setup', () => {
    game.socket.on(`module.${moduleId}`, ({ type, transfer }) => {
        if (game.user.isGM) {
            switch (type) {
                case 'update-currency':
                    Currency.values = transfer;
                    break;
                case 'transfer-currency':
                    Currency.handleTransfer(transfer);
                    break;
                case 'update-actor-state':
                    Currency.updateActorState(transfer.actorId, transfer.state);
                    break;
                }
        }

        switch (type) {
            case 'notify-transfer':
                ui.notifications.info(transfer)
                break;
        }
    });
});
