const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getDaily, setDaily } = require('../../utils/db');

const DAILY_YEN = 200;
const DAILY_XP = 50;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily yen and XP reward'),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);

        const now = new Date();
        const daily = getDaily.get(user.id);

        if (daily) {
            const last = new Date(daily.last_claim);
            const diff = now - last;
            const ms24h = 24 * 60 * 60 * 1000;
            if (diff < ms24h) {
                const remaining = ms24h - diff;
                const hrs = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                return interaction.editReply(`⏳ You already claimed today! Come back in **${hrs}h ${mins}m**.`);
            }
        }

        const player = getPlayer.get(user.id);
        updatePlayer.run(player.level, player.xp + DAILY_XP, player.max_hp, player.yen + DAILY_YEN, player.attack, player.defense, user.id);
        setDaily.run(user.id, now.toISOString());

        const embed = new EmbedBuilder()
            .setTitle('📅 Daily reward claimed!')
            .setColor(0xffd700)
            .addFields(
                { name: 'Yen', value: `+💴 ${DAILY_YEN}`, inline: true },
                { name: 'XP', value: `+${DAILY_XP} XP`, inline: true },
                { name: 'HP', value: `❤️ Restored to ${player.max_hp}/${player.max_hp}`, inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};