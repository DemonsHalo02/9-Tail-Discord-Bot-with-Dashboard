const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getTicketSettings, setTicketSettings, createTicket, getTicket, closeTicket } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s
            .setName('setup')
            .setDescription('Configure the ticket system')
            .addChannelOption(o => o.setName('category').setDescription('Category for ticket channels').setRequired(true))
            .addChannelOption(o => o.setName('log_channel').setDescription('Log channel').setRequired(true))
            .addRoleOption(o => o.setName('support_role').setDescription('Support team role').setRequired(true)))
        .addSubcommand(s => s.setName('open').setDescription('Open a support ticket'))
        .addSubcommand(s => s.setName('close').setDescription('Close the current ticket')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const category = interaction.options.getChannel('category');
            const logChannel = interaction.options.getChannel('log_channel');
            const supportRole = interaction.options.getRole('support_role');
            setTicketSettings.run(interaction.guildId, category.id, logChannel.id, supportRole.id);
            return interaction.editReply('✅ Ticket system configured!');
        }

        if (sub === 'open') {
            const settings = getTicketSettings.get(interaction.guildId);
            if (!settings) return interaction.editReply('❌ Ticket system not set up. Ask an admin to use `/ticket setup`.');

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                parent: settings.category_id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                    { id: settings.support_role, allow: ['ViewChannel', 'SendMessages'] },
                ],
            });

            createTicket.run(interaction.guildId, interaction.user.id, channel.id);

            const closeBtn = new ButtonBuilder().setCustomId('ticket_close').setLabel('Close ticket').setStyle(ButtonStyle.Danger);
            const row = new ActionRowBuilder().addComponents(closeBtn);

            const embed = new EmbedBuilder()
                .setTitle('🎫 Support ticket')
                .setDescription(`Hello ${interaction.user}! Support will be with you shortly.\nClick the button below to close the ticket.`)
                .setColor(0x7c4dff);

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply(`✅ Ticket opened: ${channel}`);
        }

        if (sub === 'close') {
            const ticket = getTicket.get(interaction.channelId, 'open');
            if (!ticket) return interaction.editReply('❌ This is not an open ticket channel.');
            closeTicket.run('closed', interaction.channelId);
            await interaction.editReply('✅ Ticket closed. Channel will be deleted in 5 seconds.');
            setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
        }
    },
};