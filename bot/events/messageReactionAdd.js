const { EmbedBuilder } = require('discord.js');
const { getStarboard, getStarPost, setStarPost } = require('../utils/db');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => { });
        if (reaction.message.partial) await reaction.message.fetch().catch(() => { });

        const { message, emoji } = reaction;
        const { guild } = message;
        if (!guild) return;

        const settings = getStarboard.get(guild.id);
        if (!settings || emoji.name !== (settings.emoji || '⭐')) return;
        if (message.channelId === settings.channel_id) return;

        const count = reaction.count;
        const existing = getStarPost.get(message.id);

        const starChannel = guild.channels.cache.get(settings.channel_id);
        if (!starChannel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*[no text]*')
            .setColor(0xffd700)
            .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            embed.setImage(message.attachments.first().url);
        }

        const content = `⭐ **${count}** | <#${message.channelId}>`;

        if (existing?.star_message_id) {
            try {
                const starMsg = await starChannel.messages.fetch(existing.star_message_id);
                await starMsg.edit({ content, embeds: [embed] });
                setStarPost.run(message.id, existing.star_message_id, count);
            } catch {
                const newMsg = await starChannel.send({ content, embeds: [embed] });
                setStarPost.run(message.id, newMsg.id, count);
            }
        } else if (count >= (settings.threshold || 3)) {
            const newMsg = await starChannel.send({ content, embeds: [embed] });
            setStarPost.run(message.id, newMsg.id, count);
        }
    },
};