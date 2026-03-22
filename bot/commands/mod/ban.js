const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addModLog } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!target.bannable) {
            return interaction.editReply({ content: '❌ I cannot ban that member.', ephemeral: true });
        }

        await target.ban({ reason });
        addModLog.run(interaction.guildId, target.id, interaction.user.id, 'ban', reason);

        const embed = new EmbedBuilder()
            .setTitle('🔨 Member Banned')
            .setColor(0xe53935)
            .addFields(
                { name: 'User', value: `${target.user.tag}`, inline: true },
                { name: 'Mod', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason },
            );

        await interaction.editReply({ embeds: [embed] });
    },
};