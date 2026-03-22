const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, createPlayer, updatePlayer } = require('../../utils/db');
const { rollDungeon, checkLevelUp } = require('../../utils/rpg');
const { getXpMultiplier, getYenMultiplier, getActiveEvent } = require('../../utils/seasons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('Enter the dungeon and fight an enemy!'),

    async execute(interaction) {
        await interaction.deferReply();

        const { checkCooldown } = require('../../utils/cooldowns');

        // inside execute():
        const cd = checkCooldown(user.id, 'dungeon', 120); // 30 second cooldown
        if (cd.onCooldown) return interaction.editReply({
            content: `⏳ You can use this again in **${cd.remaining}s**.`,
            ephemeral: true,
        });

        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);

        if (player.hp <= 0) {
            return interaction.editReply({ content: '💀 You are dead! Use `/heal` to restore HP.', ephemeral: true });
        }

        const result = rollDungeon(player);
        // When calculating rewards:
        const event = getActiveEvent();
        const xpMult = getXpMultiplier();
        const yenMult = getYenMultiplier();
        const xpGained = Math.floor(result.xpGained * xpMult);
        const yenGained = Math.floor(result.yenGained * yenMult);

        let newXp = player.xp + xpGained;
        let newYen = player.yen + yenGained;
        let newLevel = player.level;
        let newHp = result.remainingHp;
        let levelUpText = '';

        const lvlCheck = checkLevelUp({ ...player, xp: newXp });
        if (lvlCheck.leveled) {
            newLevel = lvlCheck.newLevel;
            newXp = lvlCheck.newXp;
            levelUpText = `\n🎉 **Level up! You are now level ${newLevel}!**`;
        }

        updatePlayer.run(newLevel, newXp, newHp, newYen, player.attack, player.defense, user.id);

        const embed = new EmbedBuilder()
            .setTitle(result.won ? `⚔️ Victory vs ${result.enemy.name}!` : `💀 Defeated by ${result.enemy.name}...`)
            .setColor(result.won ? 0x00e676 : 0xe53935)
            .setDescription(
                `The battle lasted **${result.rounds} rounds**.\n` +
                `HP remaining: **${newHp}**\n` +
                `XP gained: **+${result.xpGained}**\n` +
                `Yen gained: **+${result.yenGained}**` +
                levelUpText
            );

        if (event) {
            embed.addFields({ name: `🎉 ${event.name}!`, value: `${xpMult}x XP • ${yenMult}x Yen active!` });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};