const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, createPlayer } = require('../../utils/db');
const { xpToNextLevel } = require('../../utils/rpg');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your RPG character profile'),

    async execute(interaction) {
        await interaction.deferReply();

        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);

        const xpNeeded = xpToNextLevel(player.level);
        const bar = buildBar(player.xp, xpNeeded, 10);

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${user.username}'s Profile`)
            .setColor(0x7c4dff)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Level', value: `${player.level}`, inline: true },
                { name: 'HP', value: `${player.hp}/${player.max_hp}`, inline: true },
                { name: 'Yen', value: `🪙 ${player.yen}`, inline: true },
                { name: 'Attack', value: `⚔️ ${player.attack}`, inline: true },
                { name: 'Defense', value: `🛡️ ${player.defense}`, inline: true },
                { name: `XP — ${player.xp}/${xpNeeded}`, value: bar },
            )
            .setFooter({ text: 'Use /dungeon to fight and earn XP!' });

        await interaction.editReply({ embeds: [embed] });
    },
};

function buildBar(current, max, size) {
    const filled = Math.round((current / max) * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}