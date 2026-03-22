const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveEvent, EVENTS } = require('../../utils/seasons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('View current and upcoming seasonal events'),

    async execute(interaction) {
        await interaction.deferReply();
        const active = getActiveEvent();

        const embed = new EmbedBuilder()
            .setTitle('🎉 Seasonal events')
            .setColor(active ? 0xffd700 : 0x7c4dff);

        if (active) {
            embed.setDescription(
                `**${active.name}** is active!\n\n` +
                `⚡ XP multiplier: **${active.xpMultiplier}x**\n` +
                `💴 Yen multiplier: **${active.yenMultiplier}x**\n\n` +
                `Earn bonus rewards from dungeons, daily, and farm!`
            );
        } else {
            embed.setDescription('No seasonal event is currently active.\n\nCheck back during holidays for bonus XP and yen!');
        }

        return interaction.editReply({ embeds: [embed] });
    },
};