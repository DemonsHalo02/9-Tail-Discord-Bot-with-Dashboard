const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription("View a user's mod history")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('User to look up').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        const logs = db.prepare(
            'SELECT * FROM modlogs WHERE guild_id = ? AND target_id = ? ORDER BY created_at DESC LIMIT 10'
        ).all(interaction.guildId, target.id);

        if (!logs.length) return interaction.editReply(`No mod actions found for ${target.tag}.`);

        const lines = logs.map(l =>
            `\`${l.action.toUpperCase()}\` — ${l.reason} — <@${l.mod_id}> • ${new Date(l.created_at).toLocaleDateString()}`
        );
        const embed = new EmbedBuilder()
            .setTitle(`📋 Mod log for ${target.tag}`)
            .setColor(0x7c4dff)
            .setDescription(lines.join('\n'));
        return interaction.editReply({ embeds: [embed] });
    },
};