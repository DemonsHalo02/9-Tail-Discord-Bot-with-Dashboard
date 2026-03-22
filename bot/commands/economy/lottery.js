const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getLotteryEntries, addLotteryEntry, getAllLottery, clearLottery, getJackpot, setJackpot } = require('../../utils/db');

const TICKET_COST = 100;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Lottery system')
        .addSubcommand(s => s.setName('buy').setDescription(`Buy a lottery ticket (💴 ${TICKET_COST} each)`))
        .addSubcommand(s => s.setName('info').setDescription('View current lottery pool and your tickets'))
        .addSubcommand(s => s.setName('draw').setDescription('Draw the lottery winner (admin only)')),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();
        const player = getPlayer.get(user.id);
        const jackpot = getJackpot.get() || { pool: 0 };

        if (sub === 'buy') {
            if (player.yen < TICKET_COST) return interaction.editReply(`❌ A ticket costs 💴 ${TICKET_COST}.`);
            addLotteryEntry.run(user.id);
            setJackpot.run(jackpot.pool + TICKET_COST);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - TICKET_COST, player.attack, player.defense, user.id);
            const entry = getLotteryEntries.get(user.id);
            return interaction.editReply(`🎟️ You now have **${entry.tickets}** ticket(s)! Pool: 💴 ${jackpot.pool + TICKET_COST}`);
        }

        if (sub === 'info') {
            const entries = getAllLottery.all();
            const myEntry = getLotteryEntries.get(user.id);
            const total = entries.reduce((s, e) => s + e.tickets, 0);
            const embed = new EmbedBuilder()
                .setTitle('🎰 Lottery')
                .setColor(0xffd700)
                .addFields(
                    { name: 'Jackpot', value: `💴 ${jackpot.pool}`, inline: true },
                    { name: 'Total tickets', value: `${total}`, inline: true },
                    { name: 'Your tickets', value: `${myEntry?.tickets ?? 0}`, inline: true },
                    { name: 'Your odds', value: total > 0 ? `${((myEntry?.tickets ?? 0) / total * 100).toFixed(1)}%` : '0%', inline: true },
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'draw') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.editReply('❌ Only admins can draw the lottery.');
            }
            const entries = getAllLottery.all();
            if (!entries.length) return interaction.editReply('❌ No tickets have been sold yet.');

            // Weighted random draw
            const pool = [];
            entries.forEach(e => { for (let i = 0; i < e.tickets; i++) pool.push(e.user_id); });
            const winnerId = pool[Math.floor(Math.random() * pool.length)];
            const winnerPlayer = getPlayer.get(winnerId);
            updatePlayer.run(winnerPlayer.level, winnerPlayer.xp, winnerPlayer.hp, winnerPlayer.yen + jackpot.pool, winnerPlayer.attack, winnerPlayer.defense, winnerId);
            clearLottery.run();
            setJackpot.run(0);

            return interaction.editReply(`🎉 <@${winnerId}> won the lottery jackpot of 💴 ${jackpot.pool}!`);
        }
    },
};