# Party Inventory add-on for Foundry VTT

Adds a party inventory sheet and party inventory management controls to the character sheet. Allows writing down descriptive/story-based loot on a scratchpad in the party inventory sheet before distribution to the actual character inventories.

Supports Tidy5e.

## Goal

Quest/story-based items all players need to remember and see are hard to track and when tracked separately don't work as part of the character sheet, don't incur encumbrance etc. This mod attempts to remedy that situation.

The party inventory list displays all items individual characters carry that have been flagged as being visible in the party inventory, while simultaneously functioning in all other aspects as stuff the character is carrying. The description of the items can be accessed and the current owner of the item is displayed.

When the DM hands out loot, not all of the items qualify as standard gear from the rule books. For this purpose, the party inventory sheet features a scratchpad where any player can write down items, giving them a name and a description and selecting the type of item from a drop-down. This is convenient, because the type of an item can't be easily changed once it's on the character sheet. The item can then be given to a character using drag and drop from the scratch pad, similar to how items are added from the compendiums.

## Usage

The party inventory sheet can be accessed through a header button on the character sheet.

Any item on a character sheet can be toggled to be visible in the party inventory. Only items owned by a character with a player owner are listed.

- For the default dnd5e character sheet: Using the group icon close to the "Equip item" toggle button
- For Tidy 5e: Using the item context menu

### Scratchpad

Use the add new scratchpad item button to create items.

Each item can be given

- a name
- a description
- a type
- an icon, if the [Icon Picker](https://github.com/teroparvinen/foundry-icon-picker) module is installed

Drag an item from the scratchpad onto a character sheet to actually create the item. Because most of the scratchpad is input fields, try to drag from or below the icon.

Technically, modifying the scratchpad requires message passing to a Gamemaster user and will not work unless a GM is logged in. In practice, you'd only run into this situation on a remotely hosted always-on server. Nothing will break, but you'll have to wait for the GM to log on if you want to use the scratchpad.

## Recommended complimentary modules

- [Tidy 5e sheet](https://github.com/sdenec/tidy5e-sheet) for nice and tidy character sheets
- [Give Item](https://github.com/Sepichat/FoundryVTT-GiveItem) by Sepichat for exchanging items between characters
- [Icon Picker](https://github.com/teroparvinen/foundry-icon-picker) for allowing players to pick icons for items

## License

This Foundry VTT module, written by Tero Parvinen, is licensed under a Creative Commons Attribution 4.0 International License.

This work is licensed under the Foundry Virtual Tabletop EULA - Limited License Agreement for module development.
