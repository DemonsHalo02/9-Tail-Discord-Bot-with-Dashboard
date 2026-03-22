const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View server information'),

    async execute(interaction) {
        await interaction.deferReply();
        const { guild } = interaction;
        const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get();

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .setColor(0x7c4dff)
            .addFields(
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Created', value: guild.createdAt.toLocaleDateString(), inline: true },
                { name: 'RPG players', value: `${playerCount.count}`, inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};