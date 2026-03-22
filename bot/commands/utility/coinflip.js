const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, updateGamblingStats } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Bet yen on a coin flip')
        .addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true))
        .addStringOption(o => o.setName('side').setDescription('heads or tails').setRequired(true)
            .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),

    async execute(interaction) {
        await interaction.deferReply();

        const { checkCooldown } = require('../../utils/cooldowns');

        // inside execute():
        const cd = checkCooldown(user.id, 'coinflip', 30); // 30 second cooldown
        if (cd.onCooldown) return interaction.editReply({
            content: `⏳ You can use this again in **${cd.remaining}s**.`,
            ephemeral: true,
        });

        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);
        const amount = interaction.options.getInteger('amount');
        const choice = interaction.options.getString('side');

        if (amount <= 0) return interaction.editReply('❌ Bet must be greater than 0.');
        if (player.yen < amount) return interaction.editReply(`❌ Not enough yen! You have 💴 ${player.yen}.`);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choice;
        const newYen = won ? player.yen + amount : player.yen - amount;
        updatePlayer.run(player.level, player.xp, player.hp, newYen, player.attack, player.defense, user.id);

        const embed = new EmbedBuilder()
            .setTitle(won ? '🪙 You won!' : '🪙 You lost!')
            .setColor(won ? 0x00e676 : 0xe53935)
            .addFields(
                { name: 'Result', value: result, inline: true },
                { name: 'You bet', value: `💴 ${amount}`, inline: true },
                { name: won ? 'Gained' : 'Lost', value: `💴 ${amount}`, inline: true },
                { name: 'Balance', value: `💴 ${newYen}`, inline: true },
            );

        // after result is determined:
        updateGamblingStats.run(
            user.id,
            result.won ? Math.abs(result.gain) : 0,
            result.won ? 0 : Math.abs(result.gain)
        );

        return interaction.editReply({ embeds: [embed] });
    },
};