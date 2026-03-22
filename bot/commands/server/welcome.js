const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getWelcome, setWelcome, updateWelcome } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure welcome and goodbye messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s
            .setName('setup')
            .setDescription('Set up welcome/goodbye channels and messages')
            .addChannelOption(o => o.setName('welcome_channel').setDescription('Channel for welcome messages').setRequired(true))
            .addChannelOption(o => o.setName('goodbye_channel').setDescription('Channel for goodbye messages').setRequired(true))
            .addRoleOption(o => o.setName('welcome_role').setDescription('Role to give new members').setRequired(false))
            .addStringOption(o => o.setName('welcome_msg').setDescription('Welcome message. Use {user} and {server}').setRequired(false))
            .addStringOption(o => o.setName('goodbye_msg').setDescription('Goodbye message. Use {user} and {server}').setRequired(false)))
        .addSubcommand(s => s.setName('view').setDescription('View current welcome settings')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const { guildId } = interaction;
        setWelcome.run(guildId);
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const wCh = interaction.options.getChannel('welcome_channel');
            const gCh = interaction.options.getChannel('goodbye_channel');
            const role = interaction.options.getRole('welcome_role');
            const wMsg = interaction.options.getString('welcome_msg') ?? 'Welcome {user} to {server}!';
            const gMsg = interaction.options.getString('goodbye_msg') ?? '{user} has left {server}.';
            updateWelcome.run(wCh.id, gCh.id, wMsg, gMsg, role?.id ?? null, guildId);
            return interaction.editReply('✅ Welcome settings saved!');
        }

        if (sub === 'view') {
            const s = getWelcome.get(guildId);
            if (!s) return interaction.editReply('No welcome settings configured.');
            return interaction.editReply(
                `**Welcome channel:** <#${s.welcome_channel}>\n` +
                `**Goodbye channel:** <#${s.goodbye_channel}>\n` +
                `**Welcome role:** ${s.welcome_role ? `<@&${s.welcome_role}>` : 'None'}\n` +
                `**Welcome msg:** ${s.welcome_message}\n` +
                `**Goodbye msg:** ${s.goodbye_message}`
            );
        }
    },
};