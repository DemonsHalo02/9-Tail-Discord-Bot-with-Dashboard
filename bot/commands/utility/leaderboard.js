const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top players'),

    async execute(interaction) {
        await interaction.deferReply();
        const players = db.prepare(
            'SELECT username, level, xp, yen FROM players ORDER BY level DESC, xp DESC LIMIT 10'
        ).all();

        const medals = ['🥇', '🥈', '🥉'];
        const lines = players.map((p, i) =>
            `${medals[i] ?? `\`${i + 1}\``} **${p.username}** — Lv ${p.level} | ${p.xp} XP | 💴 ${p.yen}`
        );

        const embed = new EmbedBuilder()
            .setTitle('🏆 Leaderboard')
            .setColor(0xffd700)
            .setDescription(lines.join('\n'));
        return interaction.editReply({ embeds: [embed] });
    },
};