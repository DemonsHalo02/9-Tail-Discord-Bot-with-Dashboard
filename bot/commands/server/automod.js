const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAutomod, setAutomod, updateAutomod } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure auto-moderation')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s
            .setName('setup')
            .setDescription('Configure automod settings')
            .addBooleanOption(o => o.setName('spam').setDescription('Filter spam messages').setRequired(false))
            .addBooleanOption(o => o.setName('links').setDescription('Filter links').setRequired(false))
            .addBooleanOption(o => o.setName('words').setDescription('Filter profanity (powered by leo-profanity)').setRequired(false))
            .addChannelOption(o => o.setName('log_channel').setDescription('Channel to log automod actions').setRequired(false)))
        .addSubcommand(s => s.setName('view').setDescription('View current automod settings')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const { guildId } = interaction;
        setAutomod.run(guildId);
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const current = getAutomod.get(guildId);
            const spam = interaction.options.getBoolean('spam') ?? current.filter_spam;
            const links = interaction.options.getBoolean('links') ?? current.filter_links;
            const words = interaction.options.getBoolean('words') ?? current.filter_words;
            const logCh = interaction.options.getChannel('log_channel');

            updateAutomod.run(
                spam ? 1 : 0,
                links ? 1 : 0,
                words ? 1 : 0,
                '',
                logCh?.id ?? current.log_channel,
                guildId
            );

            const embed = {
                title: '✅ Automod updated',
                color: 0x00e676,
                fields: [
                    { name: 'Spam filter', value: spam ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Link filter', value: links ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Profanity filter', value: words ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Log channel', value: logCh ? `<#${logCh.id}>` : current.log_channel ? `<#${current.log_channel}>` : 'None', inline: true },
                ],
            };

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'view') {
            const s = getAutomod.get(guildId);
            if (!s) return interaction.editReply('No automod settings configured yet.');

            const embed = {
                title: '🛡️ Automod settings',
                color: 0x7c4dff,
                fields: [
                    { name: 'Spam filter', value: s.filter_spam ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Link filter', value: s.filter_links ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Profanity filter', value: s.filter_words ? '✅ On' : '❌ Off', inline: true },
                    { name: 'Log channel', value: s.log_channel ? `<#${s.log_channel}>` : 'None', inline: true },
                ],
            };

            return interaction.editReply({ embeds: [embed] });
        }
    },
};