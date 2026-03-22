const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addModLog } = require('../../utils/db');

function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return val * multipliers[unit];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h, 1d').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('user');
        const durStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const duration = parseDuration(durStr);

        if (!duration) return interaction.editReply('❌ Invalid duration. Use format: `10m`, `1h`, `2d`');
        if (duration > 28 * 24 * 60 * 60 * 1000) return interaction.editReply('❌ Max timeout is 28 days.');
        if (!target.moderatable) return interaction.editReply('❌ I cannot timeout that member.');

        await target.timeout(duration, reason);
        addModLog.run(interaction.guildId, target.id, interaction.user.id, 'mute', reason);

        const embed = new EmbedBuilder()
            .setTitle('🔇 Member Muted')
            .setColor(0xe53935)
            .addFields(
                { name: 'User', value: target.user.tag, inline: true },
                { name: 'Duration', value: durStr, inline: true },
                { name: 'Reason', value: reason },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};