const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getInventory, getEquipped, setEquipped, db } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View and manage your inventory')
        .addSubcommand(s => s.setName('view').setDescription('View your items'))
        .addSubcommand(s => s
            .setName('equip')
            .setDescription('Equip an item')
            .addIntegerOption(o => o.setName('item_id').setDescription('Item ID to equip').setRequired(true)))
        .addSubcommand(s => s
            .setName('unequip')
            .setDescription('Unequip a slot')
            .addStringOption(o => o.setName('slot').setDescription('weapon or armor').setRequired(true)
                .addChoices({ name: 'Weapon', value: 'weapon' }, { name: 'Armor', value: 'armor' }))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'view') {
            const items = getInventory.all(user.id);
            const equipped = getEquipped.get(user.id);
            if (!items.length) return interaction.editReply('Your inventory is empty!');

            const lines = items.map(i => {
                const isWeapon = equipped?.weapon_id === i.id;
                const isArmor = equipped?.armor_id === i.id;
                const tag = isWeapon ? ' ⚔️ **[Equipped]**' : isArmor ? ' 🛡️ **[Equipped]**' : '';
                return `\`ID: ${i.id}\` **${i.item_name}** (${i.item_type}) — 💴 ${i.value}${tag}`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${user.username}'s Inventory`)
                .setColor(0x7c4dff)
                .setDescription(lines.join('\n'));
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'equip') {
            const itemId = interaction.options.getInteger('item_id');
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, user.id);
            if (!item) return interaction.editReply('❌ Item not found in your inventory.');

            const equipped = getEquipped.get(user.id) || { weapon_id: null, armor_id: null };
            if (item.item_type === 'weapon') {
                setEquipped.run(user.id, itemId, equipped.armor_id);
            } else if (item.item_type === 'armor') {
                setEquipped.run(user.id, equipped.weapon_id, itemId);
            } else {
                return interaction.editReply('❌ Only weapons and armor can be equipped.');
            }
            return interaction.editReply(`✅ Equipped **${item.item_name}**!`);
        }

        if (sub === 'unequip') {
            const slot = interaction.options.getString('slot');
            const equipped = getEquipped.get(user.id) || { weapon_id: null, armor_id: null };
            if (slot === 'weapon') setEquipped.run(user.id, null, equipped.armor_id);
            if (slot === 'armor') setEquipped.run(user.id, equipped.weapon_id, null);
            return interaction.editReply(`✅ Unequipped your ${slot}.`);
        }
    },
};