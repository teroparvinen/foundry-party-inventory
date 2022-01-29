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

    static requestUpdate(currency) {
        if (game.user.isGM) {
            Currency.values = currency;
        } else {
            socket.emit(`module.${moduleId}`, {
                type: 'update-currency',
                transfer: currency
            });
        }
    }

    static requestTake(currency, actorId) {
        if (!game.user.isGM) {
            socket.emit(`module.${moduleId}`, {
                type: 'transfer-currency',
                transfer: {
                    currency,
                    actorId
                }
            });
        }
    }

    static handleTransfer(transfer) {
        this.mutex.acquire().then(async release => {
            const actor = game.actors.get(transfer.actorId);
            const currentCurrency = actor.data.data.currency;
            const transferCurrency = transfer.currency;
            const actorUpdate = {};
            const partyCurrency = this.values;
            const message = [];
    
            for (let currency in currentCurrency) {
                if (Number.isInteger(transferCurrency[currency])) {
                    actorUpdate[currency] = currentCurrency[currency] + transferCurrency[currency];
                    partyCurrency[currency] = partyCurrency[currency] - transferCurrency[currency];
                    message.push(`${transferCurrency[currency]} ${game.i18n.localize(`${localizationID}.${currency}`)}`);
                }
            }
    
            await actor.update({ 'data.currency': actorUpdate });
            await game.settings.set(moduleId, 'currency', partyCurrency);
    
            if (game.settings.get(moduleId, 'currencyNotifications')) {
                const notificationMessage = game.i18n.localize(`${localizationID}.took-currency-notification`)
                    .replace('{name}', actor.name)
                    .replace('{currency}', message.join(', '));
                socket.emit(`module.${moduleId}`, {
                    type: 'notify-transfer',
                    transfer: notificationMessage
                });
                ui.notifications.info(notificationMessage);
            }
    
            release();
        });
    }
}

Hooks.on('setup', () => {
    socket.on(`module.${moduleId}`, ({ type, transfer }) => {
        if (game.user.isGM) {
            switch (type) {
                case 'update-currency':
                    Currency.values = transfer;
                    break;
                case 'transfer-currency':
                    Currency.handleTransfer(transfer);
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
