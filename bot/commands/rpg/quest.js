const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getQuests, addQuest, claimQuest, db } = require('../../utils/db');

const QUEST_POOL = [
    { type: 'dungeon', goal: 5, label: 'Complete 5 dungeons', reward_yen: 500, reward_xp: 200 },
    { type: 'dungeon', goal: 10, label: 'Complete 10 dungeons', reward_yen: 1200, reward_xp: 500 },
    { type: 'farm', goal: 3, label: 'Gather materials 3 times', reward_yen: 300, reward_xp: 100 },
    { type: 'gamble', goal: 5, label: 'Gamble 5 times', reward_yen: 800, reward_xp: 150 },
    { type: 'daily', goal: 3, label: 'Claim daily 3 times', reward_yen: 600, reward_xp: 200 },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Quest system')
        .addSubcommand(s => s.setName('start').setDescription('Start a new quest'))
        .addSubcommand(s => s.setName('view').setDescription('View your active quests'))
        .addSubcommand(s => s.setName('claim').setDescription('Claim a completed quest reward').addIntegerOption(o => o.setName('quest_id').setDescription('Quest ID').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const active = getQuests.all(user.id);
            if (active.length >= 3) return interaction.editReply('❌ You already have 3 active quests. Complete some first.');
            const quest = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];
            addQuest.run(user.id, quest.type, quest.goal, quest.reward_yen, quest.reward_xp);
            return interaction.editReply(`📜 New quest: **${quest.label}** — Reward: 💴 ${quest.reward_yen} + ${quest.reward_xp} XP`);
        }

        if (sub === 'view') {
            const quests = db.prepare('SELECT * FROM quests WHERE user_id = ? AND claimed = 0').all(user.id);
            if (!quests.length) return interaction.editReply('No active quests. Use `/quest start` to begin one.');
            const embed = new EmbedBuilder()
                .setTitle('📜 Your quests')
                .setColor(0x7c4dff)
                .setDescription(quests.map(q => {
                    const status = q.completed ? '✅ Complete — use `/quest claim`' : `${q.progress}/${q.goal}`;
                    return `\`ID:${q.id}\` **${q.quest_type}** — ${status} | 💴 ${q.reward_yen} + ${q.reward_xp} XP`;
                }).join('\n'));
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'claim') {
            const questId = interaction.options.getInteger('quest_id');
            const quest = db.prepare('SELECT * FROM quests WHERE id=? AND user_id=?').get(questId, user.id);
            if (!quest) return interaction.editReply('❌ Quest not found.');
            if (!quest.completed) return interaction.editReply('❌ Quest not completed yet.');
            if (quest.claimed) return interaction.editReply('❌ Already claimed.');
            claimQuest.run(questId);
            const player = getPlayer.get(user.id);
            updatePlayer.run(player.level, player.xp + quest.reward_xp, player.hp, player.yen + quest.reward_yen, player.attack, player.defense, user.id);
            return interaction.editReply(`🎉 Quest claimed! +💴 ${quest.reward_yen} and +${quest.reward_xp} XP!`);
        }
    },
};