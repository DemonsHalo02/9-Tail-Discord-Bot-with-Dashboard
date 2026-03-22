const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, addItem, getInventory, db } = require('../../utils/db');
const { SHOP_ITEMS } = require('../../utils/rpg');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse and buy items')
        .addSubcommand(s => s.setName('browse').setDescription('View available items'))
        .addSubcommand(s => s
            .setName('buy')
            .setDescription('Buy an item')
            .addIntegerOption(o => o.setName('item').setDescription('Item number from shop').setRequired(true)))
        .addSubcommand(s => s
            .setName('sell')
            .setDescription('Sell an item from your inventory')
            .addIntegerOption(o => o.setName('item_id').setDescription('Item ID to sell').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'browse') {
            const lines = SHOP_ITEMS.map((item, i) =>
                `\`${i + 1}\` **${item.name}** — 💴 ${item.cost} | +${item.bonus} ${item.stat}`
            );
            const embed = new EmbedBuilder()
                .setTitle('🏪 Shop')
                .setColor(0xffd700)
                .setDescription(lines.join('\n'))
                .setFooter({ text: 'Use /shop buy <number> to purchase' });
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'buy') {
            const index = interaction.options.getInteger('item') - 1;
            const item = SHOP_ITEMS[index];
            if (!item) return interaction.editReply('❌ Invalid item number.');

            const player = getPlayer.get(user.id);
            if (player.yen < item.cost) return interaction.editReply(`❌ Not enough yen! You need 💴 ${item.cost}.`);

            updatePlayer.run(player.level, player.xp, player.hp, player.yen - item.cost, player.attack, player.defense, user.id);
            addItem.run(user.id, item.name, item.type, item.cost);
            return interaction.editReply(`✅ Bought **${item.name}** for 💴 ${item.cost}!`);
        }

        if (sub === 'sell') {
            const itemId = interaction.options.getInteger('item_id');
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, user.id);
            if (!item) return interaction.editReply('❌ Item not found in your inventory.');

            const sellPrice = Math.floor(item.value * 0.5);
            const player = getPlayer.get(user.id);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen + sellPrice, player.attack, player.defense, user.id);
            db.prepare('DELETE FROM inventory WHERE id = ?').run(itemId);
            return interaction.editReply(`✅ Sold **${item.item_name}** for 💴 ${sellPrice}!`);
        }
    },
};