const { getWelcome } = require('../utils/db');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const { guild, user } = member;
        const settings = getWelcome.get(guild.id);
        if (!settings?.goodbye_channel) return;

        const channel = guild.channels.cache.get(settings.goodbye_channel);
        if (!channel) return;

        const msg = settings.goodbye_message
            .replace('{user}', user.username)
            .replace('{server}', guild.name);

        await channel.send(msg);
    },
};