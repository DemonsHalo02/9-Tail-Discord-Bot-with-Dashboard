const { EmbedBuilder } = require('discord.js');
const { getWelcome, setWelcome } = require('../utils/db');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { guild, user } = member;
        setWelcome.run(guild.id);
        const settings = getWelcome.get(guild.id);
        if (!settings?.welcome_channel) return;

        // Assign welcome role
        if (settings.welcome_role) {
            const role = guild.roles.cache.get(settings.welcome_role);
            if (role) await member.roles.add(role).catch(() => { });
        }

        const channel = guild.channels.cache.get(settings.welcome_channel);
        if (!channel) return;

        const msg = settings.welcome_message
            .replace('{user}', `<@${user.id}>`)
            .replace('{server}', guild.name);

        const embed = new EmbedBuilder()
            .setTitle('👋 Welcome!')
            .setDescription(msg)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x00e676)
            .setFooter({ text: `Member #${guild.memberCount}` });

        await channel.send({ embeds: [embed] });
    },
};