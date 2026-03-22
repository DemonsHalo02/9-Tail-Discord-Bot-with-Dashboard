const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const LOG_FILE = path.join(__dirname, '..', '..', 'error_log.json');
let client = null;

function init(c) { client = c; }

function readLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch { return []; }
}

function writeLogs(logs) {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(-200)));
}

async function logError(commandName, error, interaction = null) {
    console.error(`Error in /${commandName}:`, error);

    // Write to file
    const logs = readLogs();
    logs.push({
        type: 'error',
        command: commandName,
        message: error.message ?? 'Unknown',
        stack: error.stack?.slice(0, 500),
        user: interaction?.user?.tag ?? null,
        guildId: interaction?.guildId ?? null,
        timestamp: new Date().toISOString(),
    });
    writeLogs(logs);

    // Send to Discord
    if (!client) return;
    const channelId = process.env.ERROR_LOG_CHANNEL;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`❌ Error in /${commandName}`)
        .setColor(0xe53935)
        .addFields(
            { name: 'Error', value: `\`\`\`${error.message?.slice(0, 500) ?? 'Unknown'}\`\`\`` },
            interaction ? { name: 'User', value: `${interaction.user.tag}`, inline: true } : null,
            interaction ? { name: 'Guild', value: interaction.guildId ?? 'DM', inline: true } : null,
        ).filter(Boolean)
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => { });
}

async function logInfo(title, description) {
    // Write to file
    const logs = readLogs();
    logs.push({ type: 'info', title, description, timestamp: new Date().toISOString() });
    writeLogs(logs);

    if (!client) return;
    const channelId = process.env.ERROR_LOG_CHANNEL;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setColor(0x7c4dff)
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => { });
}

module.exports = { init, logError, logInfo };