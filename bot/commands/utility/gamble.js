const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, updateGamblingStats } = require('../../utils/db');

const GAMES = {
    slots: {
        name: 'Slots',
        play(amount, player) {
            const symbols = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣'];
            const reels = [0, 1, 2].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
            const display = reels.join(' | ');
            let multiplier = 0;
            if (reels[0] === reels[1] && reels[1] === reels[2]) {
                multiplier = reels[0] === '💎' ? 10 : reels[0] === '7️⃣' ? 7 : 3;
            } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
                multiplier = 0.5;
            }
            const gain = Math.floor(amount * multiplier) - (multiplier < 1 ? amount : 0);
            return { display, multiplier, gain, won: multiplier > 0 };
        },
    },
    dice: {
        name: 'High-Low Dice',
        play(amount, player, choice) {
            const roll = Math.floor(Math.random() * 6) + 1;
            const high = roll >= 4;
            const won = (choice === 'high' && high) || (choice === 'low' && !high);
            return { display: `🎲 Rolled **${roll}**`, won, gain: won ? amount : -amount };
        },
    },
    blackjack: {
        name: 'Blackjack',
        play(amount) {
            const card = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
            const hand = (n) => Array.from({ length: n }, card).reduce((a, b) => a + b, 0);
            const player = hand(2);
            const dealer = hand(2);
            const won = player <= 21 && (player > dealer || dealer > 21);
            const bust = player > 21;
            return {
                display: `You: **${player}** | Dealer: **${dealer}**`,
                won: !bust && won,
                gain: (!bust && won) ? amount : -amount,
            };
        },
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Play a casino game')
        .addStringOption(o => o.setName('game').setDescription('Game to play').setRequired(true)
            .addChoices(
                { name: '🎰 Slots', value: 'slots' },
                { name: '🎲 High-Low Dice', value: 'dice' },
                { name: '🃏 Blackjack', value: 'blackjack' },
            ))
        .addIntegerOption(o => o.setName('amount').setDescription('Yen to bet').setRequired(true))
        .addStringOption(o => o.setName('choice').setDescription('For dice: high or low').setRequired(false)
            .addChoices({ name: 'High (4-6)', value: 'high' }, { name: 'Low (1-3)', value: 'low' })),

    async execute(interaction) {
        await interaction.deferReply();

        const { checkCooldown } = require('../../utils/cooldowns');

        // inside execute():
        const cd = checkCooldown(user.id, 'gamble', 30); // 30 second cooldown
        if (cd.onCooldown) return interaction.editReply({
            content: `⏳ You can use this again in **${cd.remaining}s**.`,
            ephemeral: true,
        });

        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);
        const game = interaction.options.getString('game');
        const amount = interaction.options.getInteger('amount');
        const choice = interaction.options.getString('choice') ?? 'high';

        if (amount <= 0) return interaction.editReply('❌ Bet must be greater than 0.');
        if (player.yen < amount) return interaction.editReply(`❌ Not enough yen! You have 💴 ${player.yen}.`);
        if (game === 'dice' && !interaction.options.getString('choice')) {
            return interaction.editReply('❌ For dice, pick high or low using the `choice` option.');
        }

        const g = GAMES[game];
        const result = g.play(amount, player, choice);
        const newYen = Math.max(0, player.yen + result.gain);
        updatePlayer.run(player.level, player.xp, player.hp, newYen, player.attack, player.defense, user.id);

        const embed = new EmbedBuilder()
            .setTitle(`${result.won ? '🎉 Winner!' : '💸 Better luck next time'} — ${g.name}`)
            .setColor(result.won ? 0x00e676 : 0xe53935)
            .setDescription(result.display)
            .addFields(
                { name: result.gain >= 0 ? 'Won' : 'Lost', value: `💴 ${Math.abs(result.gain)}`, inline: true },
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