const { SlashCommandBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfer yen to another player')
        .addUserOption(o => o.setName('user').setDescription('Player to pay').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount to send').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (target.id === user.id) return interaction.editReply('❌ You cannot pay yourself.');
        if (amount <= 0) return interaction.editReply('❌ Amount must be greater than 0.');

        createPlayer.run(user.id, user.username);
        createPlayer.run(target.id, target.username);
        const sender = getPlayer.get(user.id);
        const receiver = getPlayer.get(target.id);

        if (sender.yen < amount) return interaction.editReply(`❌ You only have 💴 ${sender.yen}.`);

        const { validateAmount } = require('../../utils/validate');

        const check = validateAmount(amount, 1, 1_000_000);
        if (!check.valid) return interaction.editReply(`❌ ${check.msg}`);

        updatePlayer.run(sender.level, sender.xp, sender.hp, sender.yen - amount, sender.attack, sender.defense, user.id);
        updatePlayer.run(receiver.level, receiver.xp, receiver.hp, receiver.yen + amount, receiver.attack, receiver.defense, target.id);

        return interaction.editReply(`✅ Sent 💴 ${amount} to **${target.username}**!`);
    },
};