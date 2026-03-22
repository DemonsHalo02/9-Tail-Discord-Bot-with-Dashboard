const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addWarn, getWarns, addModLog } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn or view warns for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(s => s
            .setName('add')
            .setDescription('Warn a member')
            .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))
        .addSubcommand(s => s
            .setName('list')
            .setDescription('View warns for a member')
            .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');

        if (sub === 'add') {
            const reason = interaction.options.getString('reason');
            addWarn.run(interaction.guildId, target.id, interaction.user.id, reason);
            addModLog.run(interaction.guildId, target.id, interaction.user.id, 'warn', reason);
            const warns = getWarns.all(interaction.guildId, target.id);

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Member Warned')
                .setColor(0xffb300)
                .addFields(
                    { name: 'User', value: target.tag, inline: true },
                    { name: 'Mod', value: interaction.user.tag, inline: true },
                    { name: 'Total warns', value: `${warns.length}`, inline: true },
                    { name: 'Reason', value: reason },
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'list') {
            const warns = getWarns.all(interaction.guildId, target.id);
            if (!warns.length) return interaction.editReply(`${target.tag} has no warnings.`);

            const lines = warns.map((w, i) =>
                `\`${i + 1}\` **${w.reason}** — <@${w.mod_id}> • ${new Date(w.created_at).toLocaleDateString()}`
            );
            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Warns for ${target.tag}`)
                .setColor(0xffb300)
                .setDescription(lines.join('\n'));
            return interaction.editReply({ embeds: [embed] });
        }
    },
};