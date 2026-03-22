const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getInventory, db, createTrade, getTrade, updateTrade, getPendingTrades } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade items with other players')
        .addSubcommand(s => s
            .setName('offer')
            .setDescription('Send a trade offer')
            .addUserOption(o => o.setName('user').setDescription('Player to trade with').setRequired(true))
            .addIntegerOption(o => o.setName('offer_item').setDescription('Your item ID to offer').setRequired(true))
            .addIntegerOption(o => o.setName('request_item').setDescription('Their item ID you want').setRequired(true))
            .addIntegerOption(o => o.setName('offer_yen').setDescription('Bonus yen to include').setRequired(false)))
        .addSubcommand(s => s.setName('pending').setDescription('View incoming trade offers'))
        .addSubcommand(s => s
            .setName('accept')
            .setDescription('Accept a trade offer')
            .addIntegerOption(o => o.setName('trade_id').setDescription('Trade ID').setRequired(true)))
        .addSubcommand(s => s
            .setName('decline')
            .setDescription('Decline a trade offer')
            .addIntegerOption(o => o.setName('trade_id').setDescription('Trade ID').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'offer') {
            const target = interaction.options.getUser('user');
            const offerItemId = interaction.options.getInteger('offer_item');
            const reqItemId = interaction.options.getInteger('request_item');
            const offerYen = interaction.options.getInteger('offer_yen') ?? 0;

            if (target.id === user.id) return interaction.editReply('❌ You cannot trade with yourself.');
            if (target.bot) return interaction.editReply('❌ You cannot trade with a bot.');

            const myItem = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(offerItemId, user.id);
            const theirItem = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(reqItemId, target.id);

            if (!myItem) return interaction.editReply(`❌ You don't own item ID ${offerItemId}.`);
            if (!theirItem) return interaction.editReply(`❌ ${target.username} doesn't own item ID ${reqItemId}.`);

            const player = getPlayer.get(user.id);
            if (offerYen > 0 && player.yen < offerYen) return interaction.editReply(`❌ You don't have 💴 ${offerYen}.`);

            createTrade.run(user.id, target.id, offerItemId, reqItemId, offerYen);

            return interaction.editReply(
                `✅ Trade offer sent to **${target.username}**!\n\n` +
                `You offer: **${myItem.item_name}**${offerYen > 0 ? ` + 💴 ${offerYen}` : ''}\n` +
                `You want: **${theirItem.item_name}**\n\n` +
                `Tell them to use \`/trade pending\` to see it.`
            );
        }

        if (sub === 'pending') {
            const trades = getPendingTrades.all(user.id);
            if (!trades.length) return interaction.editReply('No pending trade offers.');

            const lines = trades.map(t => {
                const offerItem = db.prepare('SELECT * FROM inventory WHERE id=?').get(t.offer_item);
                const reqItem = db.prepare('SELECT * FROM inventory WHERE id=?').get(t.request_item);
                return (
                    `**Trade ID: ${t.id}** — from <@${t.sender_id}>\n` +
                    `They offer: **${offerItem?.item_name ?? 'Unknown'}**${t.offer_yen > 0 ? ` + 💴 ${t.offer_yen}` : ''}\n` +
                    `They want: **${reqItem?.item_name ?? 'Unknown'}**`
                );
            });

            return interaction.editReply(lines.join('\n\n'));
        }

        if (sub === 'accept') {
            const tradeId = interaction.options.getInteger('trade_id');
            const trade = getTrade.get(tradeId);

            if (!trade) return interaction.editReply('❌ Trade not found.');
            if (trade.receiver_id !== user.id) return interaction.editReply('❌ This trade is not for you.');
            if (trade.status !== 'pending') return interaction.editReply('❌ This trade is no longer pending.');

            const offerItem = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(trade.offer_item, trade.sender_id);
            const reqItem = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(trade.request_item, user.id);

            if (!offerItem) return interaction.editReply('❌ The offered item no longer exists.');
            if (!reqItem) return interaction.editReply('❌ The requested item no longer exists in your inventory.');

            const sender = getPlayer.get(trade.sender_id);
            const receiver = getPlayer.get(user.id);

            if (trade.offer_yen > 0 && sender.yen < trade.offer_yen) {
                updateTrade.run('cancelled', tradeId);
                return interaction.editReply('❌ The sender no longer has enough yen. Trade cancelled.');
            }

            // Swap items
            db.prepare('UPDATE inventory SET user_id=? WHERE id=?').run(user.id, trade.offer_item);
            db.prepare('UPDATE inventory SET user_id=? WHERE id=?').run(trade.sender_id, trade.request_item);

            // Transfer yen if any
            if (trade.offer_yen > 0) {
                updatePlayer.run(sender.level, sender.xp, sender.hp, sender.yen - trade.offer_yen, sender.attack, sender.defense, trade.sender_id);
                updatePlayer.run(receiver.level, receiver.xp, receiver.hp, receiver.yen + trade.offer_yen, receiver.attack, receiver.defense, user.id);
            }

            updateTrade.run('completed', tradeId);
            return interaction.editReply(`✅ Trade completed! You received **${offerItem.item_name}**${trade.offer_yen > 0 ? ` + 💴 ${trade.offer_yen}` : ''}.`);
        }

        if (sub === 'decline') {
            const tradeId = interaction.options.getInteger('trade_id');
            const trade = getTrade.get(tradeId);
            if (!trade) return interaction.editReply('❌ Trade not found.');
            if (trade.receiver_id !== user.id) return interaction.editReply('❌ This trade is not for you.');
            if (trade.status !== 'pending') return interaction.editReply('❌ This trade is no longer pending.');
            updateTrade.run('declined', tradeId);
            return interaction.editReply('✅ Trade declined.');
        }
    },
};