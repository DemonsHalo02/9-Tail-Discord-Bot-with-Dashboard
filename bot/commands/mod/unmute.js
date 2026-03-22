const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('Member to unmute').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('user');
        if (!target.isCommunicationDisabled()) return interaction.editReply('❌ That member is not muted.');
        await target.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle('🔊 Member Unmuted')
            .setColor(0x00e676)
            .addFields({ name: 'User', value: target.user.tag });
        return interaction.editReply({ embeds: [embed] });
    },
};