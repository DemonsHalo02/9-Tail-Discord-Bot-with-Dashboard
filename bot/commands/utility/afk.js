const { SlashCommandBuilder } = require('discord.js');
const { setAfk, clearAfk, getAfk } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set or clear your AFK status')
        .addStringOption(o => o.setName('reason').setDescription('AFK reason').setRequired(false)),

    async execute(interaction) {
        const { user } = interaction;
        const existing = getAfk.get(user.id);

        if (existing) {
            clearAfk.run(user.id);
            return interaction.reply({ content: '✅ Welcome back! Your AFK status has been removed.', ephemeral: true });
        }

        const reason = interaction.options.getString('reason') ?? 'AFK';
        setAfk.run(user.id, reason);
        return interaction.reply({ content: `✅ You are now AFK: **${reason}**`, ephemeral: true });
    },
};