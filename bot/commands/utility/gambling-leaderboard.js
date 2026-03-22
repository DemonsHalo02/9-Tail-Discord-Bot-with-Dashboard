const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gambleleaderboard')
        .setDescription('View the top gamblers')
        .addStringOption(o => o
            .setName('sort')
            .setDescription('Sort by')
            .setRequired(false)
            .addChoices(
                { name: 'Most won', value: 'total_won' },
                { name: 'Most lost', value: 'total_lost' },
                { name: 'Most games', value: 'games' },
            )),

    async execute(interaction) {
        await interaction.deferReply();
        const sort = interaction.options.getString('sort') ?? 'total_won';
        const rows = db.prepare(`
      SELECT g.*, p.username FROM gambling_stats g
      JOIN players p ON p.user_id = g.user_id
      ORDER BY g.${sort} DESC LIMIT 10
    `).all();

        if (!rows.length) return interaction.editReply('No gambling data yet!');

        const medals = ['🥇', '🥈', '🥉'];
        const lines = rows.map((r, i) =>
            `${medals[i] ?? `\`${i + 1}\``} **${r.username}** — Won: 💴 ${r.total_won.toLocaleString()} | Lost: 💴 ${r.total_lost.toLocaleString()} | Games: ${r.games}`
        );

        const titles = { total_won: 'Most won', total_lost: 'Most lost', games: 'Most games' };
        const embed = new EmbedBuilder()
            .setTitle(`🎰 Gambling leaderboard — ${titles[sort]}`)
            .setColor(0xffd700)
            .setDescription(lines.join('\n'));

        return interaction.editReply({ embeds: [embed] });
    },
};