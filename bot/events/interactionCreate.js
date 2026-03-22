const { isCommandEnabled, enterGiveaway, getGiveaway } = require('../utils/db');
const { logError } = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // ── Button interactions ───────────────────────────────────────────
        if (interaction.isButton()) {

            // Giveaway entry
            if (interaction.customId === 'giveaway_enter') {
                const giveaway = getGiveaway.get(interaction.message.id);
                if (!giveaway || giveaway.ended) {
                    return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
                }
                enterGiveaway.run(giveaway.id, interaction.user.id);
                return interaction.reply({ content: '🎉 You have entered the giveaway!', ephemeral: true });
            }

            // Ticket close button
            if (interaction.customId === 'ticket_close') {
                const { closeTicket } = require('../utils/db');
                closeTicket.run('closed', interaction.channelId);
                await interaction.reply('✅ Closing ticket in 5 seconds...');
                setTimeout(() => interaction.channel.delete().catch(() => { }), 5000);
                return;
            }

            return;
        }

        // ── Slash commands ────────────────────────────────────────────────
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const row = isCommandEnabled.get(interaction.commandName);
        const enabled = row ? row.enabled === 1 : true;
        if (!enabled) {
            return interaction.reply({ content: '❌ This command is currently disabled.', ephemeral: true });
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            await logError(interaction.commandName, error, interaction);
            const msg = { content: '❌ Something went wrong!', ephemeral: true };
            if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
            else await interaction.reply(msg);
        }
    },
};