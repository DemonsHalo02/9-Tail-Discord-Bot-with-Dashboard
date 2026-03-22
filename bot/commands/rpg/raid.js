const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, createRaid, getActiveRaid, updateRaidHp, addRaidDamage, getRaidParticipants } = require('../../utils/db');

const BOSSES = [
    { name: 'Dragon King Infernus', hp: 50000, reward_yen: 5000, reward_xp: 1000, emoji: '🐉' },
    { name: 'Shadow Overlord', hp: 30000, reward_yen: 3000, reward_xp: 600, emoji: '👤' },
    { name: 'Ancient Titan', hp: 80000, reward_yen: 8000, reward_xp: 1500, emoji: '⚡' },
    { name: 'Void Serpent', hp: 20000, reward_yen: 2000, reward_xp: 400, emoji: '🐍' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Server-wide boss raid')
        .addSubcommand(s => s.setName('start').setDescription('Spawn a raid boss (admin only)'))
        .addSubcommand(s => s.setName('attack').setDescription('Attack the current raid boss'))
        .addSubcommand(s => s.setName('status').setDescription('View current raid boss status')),

    async execute(interaction) {
        await interaction.deferReply();
        const { user, guildId } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.editReply('❌ Only admins can start a raid.');
            }
            const existing = getActiveRaid.get(guildId);
            if (existing) return interaction.editReply('❌ A raid boss is already active!');

            const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
            const result = createRaid.run(guildId, boss.name, boss.hp, boss.hp);

            const embed = new EmbedBuilder()
                .setTitle(`${boss.emoji} RAID BOSS APPEARED — ${boss.name}`)
                .setColor(0xe53935)
                .setDescription(
                    `A powerful boss has appeared! Use \`/raid attack\` to fight!\n\n` +
                    `Damage dealt determines your share of the reward.`
                )
                .addFields(
                    { name: 'HP', value: `❤️ ${boss.hp.toLocaleString()}`, inline: true },
                    { name: 'Rewards', value: `💴 ${boss.reward_yen.toLocaleString()} + ${boss.reward_xp} XP (split by damage)`, inline: true },
                );

            return interaction.editReply({ content: '@everyone', embeds: [embed] });
        }

        if (sub === 'attack') {
            const raid = getActiveRaid.get(guildId);
            if (!raid) return interaction.editReply('❌ No active raid boss right now.');

            const player = getPlayer.get(user.id);
            const damage = Math.floor(player.attack * (Math.random() * 1.5 + 0.5) * 10);
            const newHp = Math.max(0, raid.boss_hp - damage);
            const killed = newHp === 0;

            updateRaidHp.run(newHp, killed ? 'defeated' : 'active', raid.id);
            addRaidDamage.run(raid.id, user.id, damage);

            const hpBar = buildBar(newHp, raid.boss_max_hp, 15);
            const embed = new EmbedBuilder()
                .setTitle(`⚔️ ${user.username} attacks ${raid.boss_name}!`)
                .setColor(killed ? 0xffd700 : 0xe53935)
                .addFields(
                    { name: 'Your damage', value: `⚔️ ${damage.toLocaleString()}`, inline: true },
                    { name: 'Boss HP', value: `❤️ ${newHp.toLocaleString()}/${raid.boss_max_hp.toLocaleString()}`, inline: true },
                    { name: 'HP bar', value: hpBar },
                );

            if (killed) {
                const boss = BOSSES.find(b => b.name === raid.boss_name);
                const participants = getRaidParticipants.all(raid.id);
                const totalDamage = participants.reduce((s, p) => s + p.damage, 0);

                const rewardLines = [];
                for (const p of participants) {
                    const share = p.damage / totalDamage;
                    const yenShare = Math.floor((boss?.reward_yen ?? 3000) * share);
                    const xpShare = Math.floor((boss?.reward_xp ?? 500) * share);
                    const pl = getPlayer.get(p.user_id);
                    if (pl) {
                        updatePlayer.run(pl.level, pl.xp + xpShare, pl.hp, pl.yen + yenShare, pl.attack, pl.defense, p.user_id);
                        rewardLines.push(`<@${p.user_id}> — ${Math.round(share * 100)}% damage → 💴 ${yenShare} + ${xpShare} XP`);
                    }
                }

                embed
                    .setTitle(`💀 ${raid.boss_name} has been defeated!`)
                    .addFields({ name: '🏆 Rewards distributed', value: rewardLines.join('\n') });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const raid = getActiveRaid.get(guildId);
            if (!raid) return interaction.editReply('No active raid boss right now.');

            const participants = getRaidParticipants.all(raid.id);
            const hpBar = buildBar(raid.boss_hp, raid.boss_max_hp, 15);
            const topDamage = participants.slice(0, 5).map((p, i) =>
                `\`${i + 1}\` <@${p.user_id}> — ⚔️ ${p.damage.toLocaleString()}`
            );

            const embed = new EmbedBuilder()
                .setTitle(`🐉 ${raid.boss_name}`)
                .setColor(0xe53935)
                .addFields(
                    { name: 'HP', value: `❤️ ${raid.boss_hp.toLocaleString()}/${raid.boss_max_hp.toLocaleString()}`, inline: true },
                    { name: 'Participants', value: `${participants.length}`, inline: true },
                    { name: 'HP bar', value: hpBar },
                    topDamage.length ? { name: 'Top damage dealers', value: topDamage.join('\n') } : null,
                ).filter(Boolean);

            return interaction.editReply({ embeds: [embed] });
        }
    },
};

function buildBar(current, max, size) {
    const filled = Math.round((current / max) * size);
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, size - filled));
}