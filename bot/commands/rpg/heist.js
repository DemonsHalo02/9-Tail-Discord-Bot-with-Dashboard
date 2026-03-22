const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require('discord.js');
const {
    createPlayer, getPlayer, updatePlayer,
    createHeist, getHeist, getHeistById, updateHeist,
    getHeistMembers, addHeistMember, updateHeistMember,
    getActiveHeist, db,
} = require('../../utils/db');

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
const JOIN_TIME_MS = 60_000;
const HEIST_COOLDOWNS = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 min per guild

const ROLES = [
    { name: 'Hacker', emoji: '💻', desc: 'Cracks the vault systems', successBonus: 0.15 },
    { name: 'Driver', emoji: '🚗', desc: 'Handles the getaway', escapeBonus: 0.20 },
    { name: 'Gunner', emoji: '🔫', desc: 'Keeps the guards at bay', guardBonus: 0.20 },
    { name: 'Lookout', emoji: '👁️', desc: 'Watches for police', caughtReduce: 0.15 },
    { name: 'Safecracker', emoji: '🔐', desc: 'Opens the vault manually', vaultBonus: 0.20 },
];

const STAGES = [
    {
        name: 'Bypassing security',
        emoji: '🔒',
        desc: 'Your team approaches the bank and begins disabling alarms.',
        successChance: 0.80,
        caughtChance: 0.10,
        failMsg: 'An alarm trips unexpectedly — guards are on high alert!',
    },
    {
        name: 'Cracking the vault',
        emoji: '🏦',
        desc: 'The Hacker and Safecracker work on the main vault door.',
        successChance: 0.70,
        caughtChance: 0.15,
        failMsg: 'The vault resists — it takes longer than expected!',
    },
    {
        name: 'Loading the cash',
        emoji: '💰',
        desc: 'Your team fills bags with cash while the Gunner holds the lobby.',
        successChance: 0.75,
        caughtChance: 0.20,
        failMsg: 'A guard breaks free and triggers a silent alarm!',
    },
    {
        name: 'The getaway',
        emoji: '🚗',
        desc: 'The Driver races through the city while police give chase.',
        successChance: 0.72,
        caughtChance: 0.25,
        failMsg: 'Police block the route — the Driver scrambles for a detour!',
    },
];

const VAULT_TIERS = [
    { name: 'Small community bank', min: 1000, max: 5000, emoji: '🏧' },
    { name: 'City bank branch', min: 5000, max: 15000, emoji: '🏦' },
    { name: 'Central reserve bank', min: 15000, max: 50000, emoji: '🏛️' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Plan and execute a bank heist with other players')
        .addIntegerOption(o => o
            .setName('wager')
            .setDescription('Yen each player must wager to join')
            .setRequired(true)
            .setMinValue(100)),

    async execute(interaction) {
        await interaction.deferReply();
        const { user, guildId } = interaction;

        // Cooldown check
        const lastHeist = HEIST_COOLDOWNS.get(guildId);
        if (lastHeist && Date.now() - lastHeist < COOLDOWN_MS) {
            const mins = Math.ceil((COOLDOWN_MS - (Date.now() - lastHeist)) / 60000);
            return interaction.editReply(`⏳ A heist was recently run. Wait **${mins} more minutes**.`);
        }

        // Check no active heist
        const existing = getActiveHeist.get(guildId);
        if (existing) return interaction.editReply('❌ There is already a heist being planned in this server!');

        createPlayer.run(user.id, user.username);
        const host = getPlayer.get(user.id);
        const wager = interaction.options.getInteger('wager');

        if (host.yen < wager) return interaction.editReply(`❌ You need 💴 ${wager} to start a heist.`);

        // Pick vault tier based on wager
        const tier = wager >= 5000
            ? VAULT_TIERS[2]
            : wager >= 1000
                ? VAULT_TIERS[1]
                : VAULT_TIERS[0];

        const joinBtn = new ButtonBuilder().setCustomId('heist_join').setLabel('Join heist').setStyle(ButtonStyle.Success);
        const startBtn = new ButtonBuilder().setCustomId('heist_start').setLabel('Start heist').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(joinBtn, startBtn);

        const embed = buildRecruitEmbed(user, wager, tier, [user.id]);
        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        // Save heist to DB
        const result = createHeist.run(guildId, user.id, msg.id, wager);
        const heistId = result.lastInsertRowid;
        addHeistMember.run(heistId, user.id);

        // Deduct wager from host
        updatePlayer.run(host.level, host.xp, host.hp, host.yen - wager, host.attack, host.defense, user.id);

        // Button collector
        const collector = msg.createMessageComponentCollector({ time: JOIN_TIME_MS });
        const members = [user.id];

        collector.on('collect', async btn => {
            const heist = getHeistById.get(heistId);
            if (!heist || heist.status !== 'recruiting') {
                return btn.reply({ content: '❌ This heist is no longer recruiting.', ephemeral: true });
            }

            // Join button
            if (btn.customId === 'heist_join') {
                if (members.includes(btn.user.id)) {
                    return btn.reply({ content: '✅ You are already in this heist!', ephemeral: true });
                }
                if (members.length >= MAX_PLAYERS) {
                    return btn.reply({ content: '❌ Heist crew is full (5 max).', ephemeral: true });
                }

                createPlayer.run(btn.user.id, btn.user.username);
                const joiner = getPlayer.get(btn.user.id);
                if (joiner.yen < wager) {
                    return btn.reply({ content: `❌ You need 💴 ${wager} to join.`, ephemeral: true });
                }

                updatePlayer.run(joiner.level, joiner.xp, joiner.hp, joiner.yen - wager, joiner.attack, joiner.defense, btn.user.id);
                addHeistMember.run(heistId, btn.user.id);
                members.push(btn.user.id);

                await btn.deferUpdate();
                const updated = buildRecruitEmbed(user, wager, tier, members);
                await msg.edit({ embeds: [updated], components: [row] });

                if (members.length === MAX_PLAYERS) {
                    collector.stop('full');
                }
                return;
            }

            // Start button — host only
            if (btn.customId === 'heist_start') {
                if (btn.user.id !== user.id) {
                    return btn.reply({ content: '❌ Only the heist host can start it.', ephemeral: true });
                }
                if (members.length < MIN_PLAYERS) {
                    return btn.reply({ content: `❌ Need at least ${MIN_PLAYERS} players to start.`, ephemeral: true });
                }
                await btn.deferUpdate();
                collector.stop('started');
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time' && members.length < MIN_PLAYERS) {
                updateHeist.run('cancelled', heistId);
                // Refund everyone
                for (const uid of members) {
                    const p = getPlayer.get(uid);
                    updatePlayer.run(p.level, p.xp, p.hp, p.yen + wager, p.attack, p.defense, uid);
                }
                await msg.edit({
                    embeds: [new EmbedBuilder().setTitle('❌ Heist cancelled').setDescription('Not enough crew joined in time. Everyone has been refunded.').setColor(0xe53935)],
                    components: [],
                });
                return;
            }

            if (reason === 'time' && members.length >= MIN_PLAYERS) {
                // Auto-start if enough players
            }

            if (['started', 'full', 'time'].includes(reason) && members.length >= MIN_PLAYERS) {
                await runHeist(msg, heistId, members, wager, tier, user, interaction.client);
            }
        });
    },
};

// ── Build recruiting embed ────────────────────────────────────────────────────
function buildRecruitEmbed(host, wager, tier, members) {
    const spots = `${members.length}/${MAX_PLAYERS}`;
    return new EmbedBuilder()
        .setTitle(`🏦 Bank Heist — ${tier.emoji} ${tier.name}`)
        .setColor(0x7c4dff)
        .setDescription(
            `**${host.username}** is planning a heist!\n\n` +
            `Press **Join heist** to participate.\n` +
            `Host can press **Start heist** once ${MIN_PLAYERS}+ players have joined.\n\n` +
            `⏳ Auto-starts or cancels in 60 seconds.`
        )
        .addFields(
            { name: 'Wager', value: `💴 ${wager} per player`, inline: true },
            { name: 'Crew', value: spots, inline: true },
            { name: 'Members', value: members.map(id => `<@${id}>`).join(', ') },
        )
        .setFooter({ text: 'Minimum 2 players required to start' });
}

// ── Run the heist ─────────────────────────────────────────────────────────────
async function runHeist(msg, heistId, memberIds, wager, tier, host, client) {
    updateHeist.run('active', heistId);
    HEIST_COOLDOWNS.set(msg.guildId, Date.now());

    // Assign random roles
    const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
    const crew = memberIds.map((uid, i) => ({
        userId: uid,
        role: shuffledRoles[i % shuffledRoles.length],
        caught: false,
    }));

    for (const member of crew) {
        updateHeistMember.run(member.role.name, 0, heistId, member.userId);
    }

    // Show role assignments
    const roleLines = crew.map(m =>
        `<@${m.userId}> — ${m.role.emoji} **${m.role.name}** — *${m.role.desc}*`
    );

    await msg.edit({
        embeds: [
            new EmbedBuilder()
                .setTitle('🏦 Heist begins!')
                .setColor(0xffd700)
                .setDescription('Roles have been assigned. The crew moves into position...')
                .addFields({ name: 'Crew roles', value: roleLines.join('\n') }),
        ],
        components: [],
    });

    await sleep(3000);

    // ── Run stages ────────────────────────────────────────────────────────
    let activeCrew = [...crew];
    let stageBonus = 1.0;
    let allFailed = false;

    for (let i = 0; i < STAGES.length; i++) {
        const stage = STAGES[i];

        // Apply role bonuses
        const hasHacker = activeCrew.some(m => m.role.name === 'Hacker');
        const hasDriver = activeCrew.some(m => m.role.name === 'Driver');
        const hasLookout = activeCrew.some(m => m.role.name === 'Lookout');
        const hasSafecracker = activeCrew.some(m => m.role.name === 'Safecracker');

        let successChance = stage.successChance;
        let caughtChance = stage.caughtChance;

        if (hasHacker) successChance += 0.08;
        if (hasDriver && i === 3) successChance += 0.12;
        if (hasLookout) caughtChance -= 0.08;
        if (hasSafecracker && i === 1) successChance += 0.10;

        // Scale difficulty by crew size
        successChance += activeCrew.length * 0.02;
        caughtChance -= activeCrew.length * 0.01;

        const stageSuccess = Math.random() < successChance;
        const stageCaught = !stageSuccess && Math.random() < caughtChance;

        // Catch random crew member if failed
        let caughtMember = null;
        if (stageCaught && activeCrew.length > 1) {
            const idx = Math.floor(Math.random() * activeCrew.length);
            caughtMember = activeCrew[idx];
            caughtMember.caught = true;
            updateHeistMember.run(caughtMember.role.name, 1, heistId, caughtMember.userId);
            activeCrew = activeCrew.filter(m => m.userId !== caughtMember.userId);
        }

        if (activeCrew.length === 0) {
            allFailed = true;
            await msg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`❌ Stage ${i + 1}: ${stage.name} — Crew wiped!`)
                        .setColor(0xe53935)
                        .setDescription('Everyone was caught by police. The heist has failed.')
                        .addFields({ name: 'Stage', value: `${stage.emoji} ${stage.desc}` }),
                ],
            });
            break;
        }

        if (stageSuccess || !stageCaught) stageBonus += 0.10;

        const stageColor = stageSuccess ? 0x00e676 : 0xff9800;
        const stageStatus = stageSuccess ? `✅ Success` : `⚠️ ${stage.failMsg}`;
        const caughtLine = caughtMember ? `\n🚔 <@${caughtMember.userId}> was caught by police!` : '';
        const crewLine = `👥 Remaining crew: ${activeCrew.map(m => `<@${m.userId}>`).join(', ')}`;

        await msg.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${stage.emoji} Stage ${i + 1}/${STAGES.length}: ${stage.name}`)
                    .setColor(stageColor)
                    .setDescription(`${stage.desc}\n\n${stageStatus}${caughtLine}\n\n${crewLine}`)
                    .setFooter({ text: `Stage bonus: +${Math.round((stageBonus - 1) * 100)}%` }),
            ],
        });

        await sleep(4000);
    }

    // ── Payout ────────────────────────────────────────────────────────────
    updateHeist.run('complete', heistId);

    if (allFailed || activeCrew.length === 0) {
        // No payout — everyone caught already had wager deducted
        await msg.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🚔 Heist failed — everyone arrested!')
                    .setColor(0xe53935)
                    .setDescription('The entire crew was caught. No payout.')
                    .addFields({ name: 'Wager lost', value: `💴 ${wager} per player` }),
            ],
        });
        return;
    }

    // Calculate payout
    const baseVault = Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
    const totalPot = wager * memberIds.length;
    const totalLoot = Math.floor((baseVault + totalPot) * stageBonus);
    const perPlayer = Math.floor(totalLoot / activeCrew.length);

    const caughtIds = crew.filter(m => m.caught).map(m => m.userId);
    const escapedIds = activeCrew.map(m => m.userId);

    for (const uid of escapedIds) {
        const p = getPlayer.get(uid);
        updatePlayer.run(p.level, p.xp + 100, p.hp, p.yen + perPlayer, p.attack, p.defense, uid);
    }

    const escapedLines = escapedIds.map(id => `✅ <@${id}> — +💴 ${perPlayer.toLocaleString()}`);
    const caughtLines = caughtIds.map(id => `🚔 <@${id}> — caught, wager lost`);

    const finalEmbed = new EmbedBuilder()
        .setTitle('💰 Heist complete!')
        .setColor(0xffd700)
        .setDescription(
            `The crew successfully robbed **${tier.emoji} ${tier.name}**!\n\n` +
            [...escapedLines, ...caughtLines].join('\n')
        )
        .addFields(
            { name: 'Vault loot', value: `💴 ${baseVault.toLocaleString()}`, inline: true },
            { name: 'Wager pool', value: `💴 ${totalPot.toLocaleString()}`, inline: true },
            { name: 'Total payout', value: `💴 ${totalLoot.toLocaleString()}`, inline: true },
            { name: 'Per player', value: `💴 ${perPlayer.toLocaleString()}`, inline: true },
            { name: 'Stage bonus', value: `+${Math.round((stageBonus - 1) * 100)}%`, inline: true },
        )
        .setFooter({ text: '+100 XP awarded to all escaped crew members' });

    await msg.edit({ embeds: [finalEmbed] });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}