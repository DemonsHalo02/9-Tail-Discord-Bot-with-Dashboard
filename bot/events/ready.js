const logger = require('../utils/logger');
const backup = require('../utils/backup');

const REQUIRED_PERMISSIONS = [
    'SendMessages',
    'EmbedLinks',
    'ReadMessageHistory',
    'ManageMessages',
    'ManageRoles',
    'BanMembers',
    'KickMembers',
    'ModerateMembers',
    'AddReactions',
    'ManageChannels',
];

module.exports = {
    name: 'clientReady',  // ← was 'ready'
    once: true,
    async execute(client) {
        logger.init(client);
        backup.init();

        // Check permissions in all guilds
        for (const [, guild] of client.guilds.cache) {
            const me = guild.members.me;
            const missing = REQUIRED_PERMISSIONS.filter(p => !me.permissions.has(p));
            if (missing.length > 0) {
                console.warn(`⚠️  Missing permissions in ${guild.name}: ${missing.join(', ')}`);
                await logInfo(
                    `Missing permissions in ${guild.name}`,
                    `The bot is missing: ${missing.map(p => `\`${p}\``).join(', ')}\n\nSome features may not work correctly.`
                );
            }
        }

        logger.logInfo('Bot online', `Logged in as **${client.user.tag}**`);
        console.log(`Logged in as ${client.user.tag}`);

        const STATUSES = [
            { type: 'Playing', text: '⚔️ 9Tail RPG' },
            { type: 'Watching', text: '🏰 over the server' },
            { type: 'Listening', text: '🎵 /help for commands' },
            { type: 'Playing', text: '🎰 slots & blackjack' },
            { type: 'Watching', text: `💴 the economy` },
        ];

        let i = 0;
        setInterval(() => {
            const s = STATUSES[i % STATUSES.length];
            client.user.setActivity(s.text, { type: s.type === 'Playing' ? 0 : s.type === 'Listening' ? 2 : 3 });
            i++;
        }, 30_000);
    },
};