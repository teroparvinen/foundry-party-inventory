import { moduleId, localizationID } from './const.js';
import { Scratchpad } from './scratchpad.js';

export class PartyInventory extends FormApplication {
	static instance = null;

	static get defaultOptions() {
		const defaults = super.defaultOptions;

		const overrides = {
			classes: ['dnd5e', 'sheet', 'actor'],
			height: 400,
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
				},
				// TODO: Initialize based on compendium drop
				// {
				// 	dropSelector: '.scratchpad'
				// }
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

	static refresh() {
		this.instance?.render();
	}

	_items = null;

	getData(options) {
		const items = game
			.actors
				.filter(a => a.hasPlayerOwner)
			.flatMap(a => a.items.contents)
			.filter(i => i.getFlag(moduleId, 'inPartyInventory'))

		items.sort((a, b) => a.name.localeCompare(b.name));

		this._items = items;

		items.forEach(i => { i.isStack = i.data.data.quantity > 1 });

		const typeLabels = CONFIG.Item.typeLabels;

		const scratchpadItems = Scratchpad.items;

		return { items, typeLabels, scratchpadItems };
	}

	async _updateObject(event, formData) {
		const data = foundry.utils.expandObject(formData);

		console.log('_updateObject', data);

		for (let id in data) {
			Scratchpad.requestUpdate(id, data[id]);
		}
	}

	activateListeners(html) {
		super.activateListeners(html);

		// Open summary from name
		html.find('h4').on('click', this._onItemSummary.bind(this));

		// Button handling
		html.on('click', "[data-action]", this._handleButtonClick);

		// Image browsing
		html.find('img[data-edit]').click(ev => this._onEditImage(ev));
		if (!game.user.can("FILES_BROWSE")) {
			let IconPicker = game.modules.get('icon-picker')?.api;
			if (IconPicker) {
				html.find('img[data-edit]').click(async function (ev) {
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

		switch (action) {
			case 'create': {
				Scratchpad.requestCreate({
					img: CONFIG.Item.documentClass.schema.DEFAULT_ICON
				});
			}
			case 'delete': {
				Scratchpad.requestDelete(itemId);
			}
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

	_onDragStart(event) {
		const li = $(event.currentTarget);
		const itemId = li.data("item-id");
		const item = Scratchpad.getItem(itemId)

		event.dataTransfer.setData("text/plain", JSON.stringify({
			type: "Item",
			data: {
				type: item.type,
				name: item.name,
				img: item.img,
				data: {
					description: { value: `<p>${item.description}</p>` }
				}
			}
		}));
		event.dataTransfer.setDragImage(
			li[0],
			event.pageX - li.offset().left,
			event.pageY - li.offset().top);
	}

	_onDrop(event) {
		const dataStr = event.dataTransfer.getData('text/plain');
		const data = JSON.parse(dataStr);
		console.log('DROP', data);
	}
}
