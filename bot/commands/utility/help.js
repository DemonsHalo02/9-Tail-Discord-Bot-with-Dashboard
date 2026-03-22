const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const COMMANDS = {
    '💰 Economy': [
        { name: '/pay <user> <amount>', desc: 'Transfer yen to another player' },
        { name: '/rob <user>', desc: 'Attempt to steal yen (2hr cooldown)' },
        { name: '/bank balance', desc: 'View balance and collect 2% daily interest' },
        { name: '/bank deposit <amount>', desc: 'Deposit yen into your bank' },
        { name: '/bank withdraw <amount>', desc: 'Withdraw yen from your bank' },
        { name: '/lottery buy', desc: 'Buy a lottery ticket for 💴 100' },
        { name: '/lottery info', desc: 'View jackpot and your ticket count' },
        { name: '/lottery draw', desc: 'Draw the winner (admin only)' },
    ],
    '🏰 Server': [
        { name: '/welcome setup', desc: 'Set welcome/goodbye channels and messages' },
        { name: '/automod setup', desc: 'Configure spam, link, and word filtering' },
        { name: '/starboard <channel>', desc: 'Set up the starboard channel' },
        { name: '/ticket setup', desc: 'Configure the ticket system' },
        { name: '/ticket open', desc: 'Open a support ticket' },
        { name: '/ticket close', desc: 'Close the current ticket channel' },
        { name: '/giveaway start', desc: 'Start a giveaway' },
        { name: '/giveaway end', desc: 'End a giveaway early' },
    ],
    '🐾 Pets & Guilds': [
        { name: '/pet adopt <name>', desc: 'Adopt a random pet for 💴 500' },
        { name: '/pet list', desc: 'View all your pets' },
        { name: '/pet feed <id>', desc: 'Feed a pet for 💴 10' },
        { name: '/pet play <id>', desc: 'Play with a pet to boost happiness' },
        { name: '/pet train <id>', desc: 'Train a pet to earn XP and level up' },
        { name: '/guild create <name>', desc: 'Create a guild for 💴 5000' },
        { name: '/guild join <name>', desc: 'Join an existing guild' },
        { name: '/guild info', desc: 'View your guild info and bank' },
        { name: '/guild deposit <amount>', desc: 'Deposit yen into the guild bank' },
        { name: '/duel <user> [wager]', desc: 'Challenge a player to a PvP duel' },
        { name: '/quest start', desc: 'Start a new random quest' },
        { name: '/quest view', desc: 'View your active quests and progress' },
        { name: '/quest claim <id>', desc: 'Claim a completed quest reward' },
    ],
    '⚔️ RPG': [
        { name: '/profile', desc: 'View your character stats and XP bar' },
        { name: '/dungeon', desc: 'Fight a random enemy and earn XP & yen' },
        { name: '/heal [amount]', desc: 'Restore HP using yen (2 yen per HP)' },
        { name: '/daily', desc: 'Claim your daily yen, XP, and full HP regen' },
        { name: '/inventory view', desc: 'View your items and what\'s equipped' },
        { name: '/inventory equip', desc: 'Equip a weapon or armor by item ID' },
        { name: '/inventory unequip', desc: 'Unequip a weapon or armor slot' },
        { name: '/shop browse', desc: 'Browse items available to buy' },
        { name: '/shop buy <number>', desc: 'Buy an item from the shop' },
        { name: '/shop sell <item_id>', desc: 'Sell an item for 50% of its value' },
        { name: '/farm gather', desc: 'Gather materials (1 hour cooldown)' },
        { name: '/farm recipes', desc: 'View all craftable items' },
        { name: '/farm craft <number>', desc: 'Craft an item using your materials' },
        { name: '/prestige info', desc: 'Check your progress toward prestige requirements' },
        { name: '/prestige buy', desc: 'Purchase the prestige role (level 1000 + 10M yen)' },
        { name: '/heist <wager>', desc: 'Plan a bank heist — 2-5 players, roles, stages, big payout' },
    ],
    '🎰 Games': [
        { name: '/coinflip <amount> <heads|tails>', desc: 'Bet yen on a coin flip' },
        { name: '/gamble slots <amount>', desc: 'Spin the slot machine' },
        { name: '/gamble dice <amount> <high|low>', desc: 'Bet on a dice roll (4-6 high, 1-3 low)' },
        { name: '/gamble blackjack <amount>', desc: 'Play a round of blackjack' },
    ],
    '🔨 Moderation': [
        { name: '/ban <user> [reason]', desc: 'Ban a member from the server' },
        { name: '/kick <user> [reason]', desc: 'Kick a member from the server' },
        { name: '/mute <user> <duration>', desc: 'Timeout a member (e.g. 10m, 1h, 2d)' },
        { name: '/unmute <user>', desc: 'Remove a timeout from a member' },
        { name: '/warn add <user> <reason>', desc: 'Issue a warning to a member' },
        { name: '/warn list <user>', desc: 'View all warnings for a member' },
        { name: '/modlog <user>', desc: 'View full mod history for a user' },
    ],
    '🛠️ Utility': [
        { name: '/leaderboard', desc: 'View the top 10 players by level' },
        { name: '/userinfo [user]', desc: 'View info and RPG stats about a user' },
        { name: '/serverinfo', desc: 'View server stats and RPG player count' },
        { name: '/help [category]', desc: 'Show this help menu' },
        { name: '/afk [reason]', desc: 'Set or clear your AFK status' },
    ],
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands and how to use them')
        .addStringOption(o => o
            .setName('category')
            .setDescription('Filter by category')
            .setRequired(false)
            .addChoices(
                { name: '⚔️ RPG', value: '⚔️ RPG' },
                { name: '🎰 Games', value: '🎰 Games' },
                { name: '🔨 Moderation', value: '🔨 Moderation' },
                { name: '🛠️ Utility', value: '🛠️ Utility' },
            )),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const category = interaction.options.getString('category');
        const toShow = category
            ? { [category]: COMMANDS[category] }
            : COMMANDS;

        const embeds = Object.entries(toShow).map(([cat, cmds]) =>
            new EmbedBuilder()
                .setTitle(cat)
                .setColor(0x7c4dff)
                .setDescription(
                    cmds.map(c => `\`${c.name}\`\n↳ ${c.desc}`).join('\n\n')
                )
        );

        // Discord allows max 10 embeds per message
        await interaction.editReply({ embeds: embeds.slice(0, 10) });
    },
};