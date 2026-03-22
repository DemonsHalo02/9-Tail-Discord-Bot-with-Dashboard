const { EmbedBuilder } = require('discord.js');
const { getAutomod, getAfk, clearAfk, getRpgGuildMember, updateQuest, getQuests, db } = require('../utils/db');
const filter = require('leo-profanity');
const spamMap = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const { guild, author, content, channel } = message;
        if (!guild) return;

        // ── AFK check ─────────────────────────────────────────────────────
        // Clear AFK if the user sends a message
        const userAfk = getAfk.get(author.id);
        if (userAfk) {
            clearAfk.run(author.id);
            message.reply({ content: '✅ Welcome back! Removed your AFK status.', allowedMentions: { repliedUser: false } })
                .then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
        }

        // Notify if someone pings an AFK user
        const mentioned = message.mentions.users;
        for (const [, user] of mentioned) {
            const afk = getAfk.get(user.id);
            if (afk) {
                channel.send(`💤 **${user.username}** is AFK: ${afk.reason}`)
                    .then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
            }
        }

        // ── Automod ───────────────────────────────────────────────────────
        const settings = getAutomod.get(guild.id);
        if (!settings) return;

        if (!message.member?.permissions.has('ManageMessages')) {

            // Spam detection
            if (settings.filter_spam) {
                const key = `${guild.id}-${author.id}`;
                const now = Date.now();
                const times = spamMap.get(key) || [];
                const recent = times.filter(t => now - t < 5000);
                recent.push(now);
                spamMap.set(key, recent);

                if (recent.length >= 5) {
                    await message.delete().catch(() => { });
                    await channel.send({ content: `⚠️ ${author} slow down! Spam detected.` })
                        .then(m => setTimeout(() => m.delete().catch(() => { }), 4000));
                    await logAutomod(guild, settings, author, 'Spam', content);
                    return;
                }
            }

            // Link filter
            if (settings.filter_links) {
                const linkRegex = /(https?:\/\/|www\.)\S+/gi;
                if (linkRegex.test(content)) {
                    await message.delete().catch(() => { });
                    await channel.send({ content: `⚠️ ${author} links are not allowed here.` })
                        .then(m => setTimeout(() => m.delete().catch(() => { }), 4000));
                    await logAutomod(guild, settings, author, 'Link', content);
                    return;
                }
            }

            // Word filter
            if (settings.filter_words) {
                if (filter.check(content)) {
                    await message.delete().catch(() => { });
                    await channel.send({ content: `⚠️ ${author} watch your language!` })
                        .then(m => setTimeout(() => m.delete().catch(() => { }), 4000));
                    await logAutomod(guild, settings, author, 'Profanity', '[redacted]');
                    return;
                }
            }
        }
    },
};

async function logAutomod(guild, settings, author, type, content) {
    if (!settings.log_channel) return;
    const channel = guild.channels.cache.get(settings.log_channel);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setTitle(`🔨 Automod — ${type}`)
        .setColor(0xe53935)
        .addFields(
            { name: 'User', value: `${author.tag} (${author.id})`, inline: true },
            { name: 'Type', value: type, inline: true },
            { name: 'Content', value: content.slice(0, 200) },
        )
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}