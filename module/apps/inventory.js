import { moduleId, localizationID } from '../const.js';
import { Currency } from '../currency.js';
import { Scratchpad } from '../scratchpad.js';
import { SplitCurrency } from './split-currency.js';
import { TakeCurrency } from './take-currency.js';

export class PartyInventory extends FormApplication {
    static instance = null;

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            classes: ['dnd5e', 'sheet', 'actor'],
            height: 480,
            width: 600,
            resizable: true,
            editable: true,
            id: moduleId,
            template: `modules/${moduleId}/templates/party-inventory.hbs`,
            title: `${localizationID}.window-title`,
            userId: game.userId,
            closeOnSubmit: false,
            submitOnChange: true,
            scrollY: ['.items-list'],
            dragDrop: [
                {
                    dragSelector: '.scratchpad .item',
                }
            ]
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    static activate() {
        if (!this.instance) {
            this.instance = new PartyInventory();
        }

        if (!this.instance.rendered) {
            this.instance.render(true);
        } else {
            this.instance.bringToTop();
        }
    }

    static async refresh() {
        const focus = this.instance?.element.find("input:focus, textarea:focus");
        const focusElement = focus?.length ? focus[0] : null;
        const focusContent = focus?.val();

        await this.instance?.render();

        if (focusElement && focusElement.name) {
            setTimeout(() => { 
                const input = this.instance?.form[focusElement.name];
                $(input).val(focusContent);
                $(input).trigger('change');
                if (input && (input.focus instanceof Function)) input.focus();
            }, 0);
        }
    }

    _items = null;

    detectQuantity(input) {
        if (input) {
            const re =/(?:(\d+)\s+)?(.+?)(?:\s+\((\d+)\)|$)/;
            const matches = input.match(re);

            if (matches) {
                if (matches[1]) {
                    return { name: matches[2], quantity: parseInt(matches[1]), style: 'prefix' };
                } else if (matches[3]) {
                    return { name: matches[2], quantity: parseInt(matches[3]), style: 'suffix' };
                }
            }
        }

        return { name: input, quantity: 1 };
    }

    splitItem(input) {
        const source = this.detectQuantity(input);

        const makeName = (name, quantity, style) => {
            if (quantity > 1) {
                if (style == 'suffix') {
                    return `${name} (${quantity})`;
                } else {
                    return `${quantity} ${name}`;
                }
            }
            return name;
        }

        if (source.style) {
            return {
                source: makeName(source.name, Math.ceil(source.quantity / 2), source.style),
                target: makeName(source.name, Math.floor(source.quantity / 2), source.style)
            }
        }

        return null;
    }

    getData(options) {
        const items = game
            .actors
                .filter(a => a.hasPlayerOwner)
            .flatMap(a => a.items.contents)
            .filter(i => i.getFlag(moduleId, 'inPartyInventory'))

        items.sort((a, b) => a.name.localeCompare(b.name));

        this._items = items;

        items.forEach(i => { i.isStack = i.system.quantity > 1 });
        items.forEach(i => { i.charName = i.actor.name.split(' ')[0] });

        const typeLabels = CONFIG.Item.typeLabels;

        const scratchpadItems = foundry.utils.deepClone(Scratchpad.items);
        scratchpadItems.forEach(i => {
            const qr = this.detectQuantity(i.name);
            if (qr.quantity > 1) {
                i.quantity = qr.quantity;
            }

            if (qr.quantity > 1 || i.sourceData) {
                i.hasFootnote = true;
            }
        })

        const currency = Currency.values;
        const isGM = game.user.isGM;

        return { items, typeLabels, scratchpadItems, currency, isGM };
    }

    async _updateObject(event, formData) {
        const { scratchpad, currency } = foundry.utils.expandObject(formData);

        for (let id in scratchpad) {
            const existing = Scratchpad.getItem(id);
            const diff = foundry.utils.diffObject(existing, scratchpad[id]);
            if (!foundry.utils.isEmpty(diff)) {
                Scratchpad.requestUpdate(id, diff);
            }
        }

        Currency.requestUpdate(currency);
    }

    activateListeners(html) {
        super.activateListeners(html);

        const self = this;

        html.find('.currency-input').change(this._onChangeCurrencyDelta.bind(this));

        // Open summary from name
        html.find('h4').on('click', this._onItemSummary.bind(this));

        // Button handling
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));

        // Image browsing
        html.find('img[data-edit]').click(ev => this._onEditImage(ev));

        let IconPicker = game.modules.get('icon-picker')?.api;
        if (IconPicker) {
            if (!game.user.can("FILES_BROWSE")) {
                html.find('img[data-edit]').click(async function (ev) {
                    const picker = new IconPicker();

                    try {
                        let result = await picker.pick();
                        $(this).attr('src', result);
                        $(this).closest('form').submit();
                    } catch { }
                });
            } else {
                html.find('img[data-edit]').on("contextmenu", async function (ev) {
                    const picker = new IconPicker();

                    try {
                        let result = await picker.pick();
                        $(this).attr('src', result);
                        $(this).closest('form').submit();
                    } catch { }
                });
            }
        }
    
        // Text area resize
        html.find("textarea").each(function () {
            this.setAttribute("style", "height:" + (this.scrollHeight) + "px;overflow-y:hidden;");
            // The is needed to render properly on the first time
            requestAnimationFrame(() => {
                this.style.height = "auto";
                this.style.height = (this.scrollHeight) + "px";
            });
        }).on("input", function () {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });

        // Preview item with data
        html.find(".preview-item").click(function () {
            const itemId = this.closest('[data-item-id]').dataset.itemId;
            const data = self._constructExportableData(itemId);
            const item = new CONFIG.Item.documentClass(data);
            item.testUserPermission = () => true;
            item.update = () => {};
            const sheet = item.sheet
            sheet.render(true, { editable: false });
        });
    }

    _onChangeCurrencyDelta(event) {
        const input = event.target;
        const value = input.value;
        if (["+", "-"].includes(value[0])) {
            let delta = parseFloat(value);
            input.value = Currency.values[input.name.split('.')[1]] + delta;
        } else if (value[0] === "=") {
            input.value = value.slice(1);
        }
    }

    _onItemSummary(event) {
        event.preventDefault();
        const li = $(event.currentTarget).parents(".item");
        const item = this._items.find(i => i.id == li.data("item-id"));
        const chatData = item.getChatData();

        // Toggle summary
        if (li.hasClass("expanded")) {
            let summary = li.children(".item-summary");
            summary.slideUp(200, () => summary.remove());
        } else {
            let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
            let props = $('<div class="item-properties"></div>');
            chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass("expanded");
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const itemId = clickedElement.parents('[data-item-id]').data()?.itemId;
        const item = Scratchpad.getItem(itemId);

        switch (action) {
            case 'create':
                Scratchpad.requestCreate({
                    img: CONFIG.Item.documentClass.schema.DEFAULT_ICON
                });
                break;
            case 'delete':
                Scratchpad.requestDelete(itemId);
                break;
            case 'split':
                const split = this.splitItem(item.name);
                if (split) {
                    Scratchpad.requestUpdate(itemId, { name: split.source });
                    Scratchpad.requestCreate({
                        img: item.img,
                        name: split.target,
                        description: item.description,
                        type: item.type,
                        sourceData: item.sourceData
                    }, { after: itemId });
                }
                break;
            case 'collapse':
                item.isCollapsed = !item.isCollapsed;
                Scratchpad.requestUpdate(itemId, item);
                break;
            case 'take-currency':
                const takeApp = new TakeCurrency();
                takeApp.render(true);
                break;
            case 'split-currency':
                const splitApp = new SplitCurrency();
                splitApp.render(true);
                break;
        }
    }

    _onEditImage(event) {
        const li = $(event.currentTarget).parents(".item");
        const itemId = li.data("item-id");
        const current = Scratchpad.getItem(itemId)?.img

        const fp = new FilePicker({
            type: "image",
            current: current,
            callback: path => {
                event.currentTarget.src = path;
                if (this.options.submitOnChange) {
                    this._onSubmit(event);
                }
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        return fp.browse();
    }

    _canDragStart(event) {
        return true;
    }

    _canDragDrop(event) {
        return true;
    }

    _constructExportableData(itemId) {
        const item = Scratchpad.getItem(itemId);

        const quantityInfo = this.detectQuantity(item.name);

        let data = {
            type: item.type,
            name: quantityInfo.name,
            img: item.img,
            system: {
                quantity: quantityInfo.quantity
            },
            flags: {
                [moduleId]: {
                    scratchpadId: itemId
                }
            }
        };
        if (item.description && item.description.trim()) {
            data = foundry.utils.mergeObject(data, {
                data: {
                    description: { value: `<p>${item.description}</p>` }
                }
            });
        }
        if (item.sourceData) {
            data = foundry.utils.mergeObject(item.sourceData, data);
        }

        return data;
    }

    _onDragStart(event) {
        const li = $(event.currentTarget);
        const itemId = li.data("item-id");
        const data = this._constructExportableData(itemId);

        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: "Item",
            data: data
        }));
        event.dataTransfer.setDragImage(
            li[0],
            event.pageX - li.offset().left,
            event.pageY - li.offset().top);
    }

    async _onDrop(event) {
        const dataStr = event.dataTransfer.getData('text/plain');
        const dragData = JSON.parse(dataStr);

        function createFromData(data) {
            const name = data.system.quantity > 1 ? `${data.system.quantity} ${data.name}` : data.name;

            Scratchpad.requestCreate({
                type: data.type,
                name: name,
                img: data.img,
                sourceData: duplicate(data)
            });
        }

        if (dragData.data) {
            const itemData = dragData.data;
            const scratchpadId = itemData.flags?.[moduleId]?.scratchpadId;
            const onScratchpad = !!Scratchpad.items.find(i => i.id === scratchpadId)
    
            // Reorder
            if (onScratchpad) {
                const targetId = event.target.closest('.item')?.dataset?.itemId;
                if (targetId) {
                    Scratchpad.requestReorder(scratchpadId, targetId);
                }
                return false;
            }
    
            createFromData(itemData);
            return false;
        } else if (dragData.uuid) {
            const item = fromUuidSync(dragData.uuid);

            if (dragData.type !== 'Item') { return false; }
    
            if (item.pack && item._id) {
                const pack = game.packs.get(item.pack);
                if (pack.documentName == 'Item') {
                    const packItem = await pack.getDocument(item._id);
                    createFromData(packItem._source);
                    return false;
                }
            } else if (item.system) {
                createFromData(item._source);
    
                if (item.actor && game.settings.get(moduleId, 'deleteActorItemOnDrag')) {
                    if (item.actor.isOwner) {
                        item.delete();
                    }
                }
    
                return false;
            }
        }

        return true;
    }
}
