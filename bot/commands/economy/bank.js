const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getBank, setBank, updateBank } = require('../../utils/db');

const INTEREST_RATE = 0.02; // 2% daily
const INTEREST_MS = 24 * 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Manage your bank account')
        .addSubcommand(s => s.setName('balance').setDescription('View your bank balance and collect interest'))
        .addSubcommand(s => s.setName('deposit').setDescription('Deposit yen into your bank').addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
        .addSubcommand(s => s.setName('withdraw').setDescription('Withdraw yen from your bank').addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        setBank.run(user.id);
        const sub = interaction.options.getSubcommand();
        const player = getPlayer.get(user.id);
        let bankData = getBank.get(user.id);

        if (sub === 'balance') {
            let interest = 0;
            if (bankData.last_interest) {
                const diff = Date.now() - new Date(bankData.last_interest).getTime();
                if (diff >= INTEREST_MS) {
                    const periods = Math.floor(diff / INTEREST_MS);
                    interest = Math.floor(bankData.balance * INTEREST_RATE * periods);
                    updateBank.run(bankData.balance + interest, new Date().toISOString(), user.id);
                    bankData = getBank.get(user.id);
                }
            } else {
                updateBank.run(bankData.balance, new Date().toISOString(), user.id);
            }

            const embed = new EmbedBuilder()
                .setTitle(`🏦 ${user.username}'s Bank`)
                .setColor(0xffd700)
                .addFields(
                    { name: 'Bank balance', value: `💴 ${bankData.balance}`, inline: true },
                    { name: 'Wallet', value: `💴 ${player.yen}`, inline: true },
                    { name: 'Interest', value: interest > 0 ? `+💴 ${interest} collected!` : `2% daily`, inline: true },
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            if (amount <= 0) return interaction.editReply('❌ Amount must be greater than 0.');
            if (player.yen < amount) return interaction.editReply(`❌ You only have 💴 ${player.yen} in your wallet.`);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - amount, player.attack, player.defense, user.id);
            updateBank.run(bankData.balance + amount, bankData.last_interest ?? new Date().toISOString(), user.id);
            return interaction.editReply(`✅ Deposited 💴 ${amount} into your bank.`);
        }

        if (sub === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            if (amount <= 0) return interaction.editReply('❌ Amount must be greater than 0.');
            if (bankData.balance < amount) return interaction.editReply(`❌ You only have 💴 ${bankData.balance} in the bank.`);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen + amount, player.attack, player.defense, user.id);
            updateBank.run(bankData.balance - amount, bankData.last_interest ?? new Date().toISOString(), user.id);
            return interaction.editReply(`✅ Withdrew 💴 ${amount} from your bank.`);
        }
    },
};