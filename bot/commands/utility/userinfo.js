const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View info about a user')
        .addUserOption(o => o.setName('user').setDescription('User to look up').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('user') ?? interaction.member;
        const user = target.user;
        const player = getPlayer.get(user.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x7c4dff)
            .addFields(
                { name: 'ID', value: user.id, inline: true },
                { name: 'Joined', value: target.joinedAt?.toLocaleDateString() ?? 'N/A', inline: true },
                { name: 'Account age', value: user.createdAt.toLocaleDateString(), inline: true },
                { name: 'Roles', value: target.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(', ') || 'None' },
                { name: 'RPG level', value: player ? `${player.level}` : 'No character', inline: true },
                { name: 'RPG yen', value: player ? `💴 ${player.yen}` : 'N/A', inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};