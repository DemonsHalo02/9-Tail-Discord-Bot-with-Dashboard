const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createGiveaway, getGiveaway, endGiveaway, enterGiveaway, getGiveawayEntries } = require('../../utils/db');

function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(match[1]) * multipliers[match[2]];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Giveaway system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(s => s
            .setName('start')
            .setDescription('Start a giveaway')
            .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true))
            .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 1d').setRequired(true))
            .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(false)))
        .addSubcommand(s => s
            .setName('end')
            .setDescription('End a giveaway early')
            .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const prize = interaction.options.getString('prize');
            const durStr = interaction.options.getString('duration');
            const winners = interaction.options.getInteger('winners') ?? 1;
            const duration = parseDuration(durStr);
            if (!duration) return interaction.editReply('❌ Invalid duration. Use e.g. `1h`, `2d`.');

            const endsAt = new Date(Date.now() + duration).toISOString();
            const enterBtn = new ButtonBuilder().setCustomId('giveaway_enter').setLabel('🎉 Enter').setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(enterBtn);

            const embed = new EmbedBuilder()
                .setTitle('🎉 Giveaway!')
                .setColor(0xffd700)
                .addFields(
                    { name: 'Prize', value: prize, inline: true },
                    { name: 'Winners', value: `${winners}`, inline: true },
                    { name: 'Ends', value: `<t:${Math.floor(Date.now() / 1000 + duration / 1000)}:R>`, inline: true },
                    { name: 'Host', value: `${interaction.user}`, inline: true },
                );

            const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
            createGiveaway.run(interaction.guildId, interaction.channelId, msg.id, prize, winners, endsAt, interaction.user.id);

            setTimeout(async () => {
                await drawGiveaway(msg.id, interaction.client);
            }, duration);

            return interaction.editReply('✅ Giveaway started!');
        }

        if (sub === 'end') {
            const messageId = interaction.options.getString('message_id');
            await drawGiveaway(messageId, interaction.client);
            return interaction.editReply('✅ Giveaway ended!');
        }
    },
};

async function drawGiveaway(messageId, client) {
    const giveaway = getGiveaway.get(messageId);
    if (!giveaway || giveaway.ended) return;
    endGiveaway.run(giveaway.id);

    const entries = getGiveawayEntries.all(giveaway.id);
    const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) return;

    if (!entries.length) {
        await msg.edit({ content: '🎉 Giveaway ended — no entries!', components: [] });
        return;
    }

    const shuffled = entries.sort(() => Math.random() - 0.5);
    const winnerIds = shuffled.slice(0, giveaway.winners).map(e => e.user_id);
    const mentions = winnerIds.map(id => `<@${id}>`).join(', ');

    await msg.edit({ content: `🎉 Giveaway ended!`, components: [] });
    await channel.send(`🎉 Congratulations ${mentions}! You won **${giveaway.prize}**!`);
}