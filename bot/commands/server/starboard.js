const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setStarboard } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Configure the starboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(o => o.setName('channel').setDescription('Starboard channel').setRequired(true))
        .addIntegerOption(o => o.setName('threshold').setDescription('Stars needed (default 3)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const threshold = interaction.options.getInteger('threshold') ?? 3;
        setStarboard.run(interaction.guildId, channel.id, threshold);
        return interaction.editReply(`✅ Starboard set to ${channel} with threshold ⭐ ${threshold}`);
    },
};