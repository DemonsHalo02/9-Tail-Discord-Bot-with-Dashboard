const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addModLog } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!target.kickable) return interaction.editReply('❌ I cannot kick that member.');

        await target.kick(reason);
        addModLog.run(interaction.guildId, target.id, interaction.user.id, 'kick', reason);

        const embed = new EmbedBuilder()
            .setTitle('👢 Member Kicked')
            .setColor(0xff9800)
            .addFields(
                { name: 'User', value: target.user.tag, inline: true },
                { name: 'Mod', value: interaction.user.tag, inline: true },
                { name: 'Reason', value: reason },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};