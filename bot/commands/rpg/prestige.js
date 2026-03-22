const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getRoleReward, addRoleReward } = require('../../utils/db');

const PRESTIGE_LEVEL = parseInt(process.env.PRESTIGE_LEVEL) || 1000;
const PRESTIGE_COST = parseInt(process.env.PRESTIGE_COST) || 10_000_000;
const ROLE_ID = process.env.PRESTIGE_ROLE_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prestige')
        .setDescription('Prestige system')
        .addSubcommand(s => s
            .setName('buy')
            .setDescription('Purchase the prestige role (level 1000 + 10M yen)'))
        .addSubcommand(s => s
            .setName('info')
            .setDescription('Check your progress toward prestige')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'info') {
            const player = getPlayer.get(user.id);
            const existing = getRoleReward.get(user.id);
            const levelDone = player?.level >= PRESTIGE_LEVEL;
            const yenDone = player?.yen >= PRESTIGE_COST;

            const embed = new EmbedBuilder()
                .setTitle('👑 Prestige requirements')
                .setColor(existing ? 0xffd700 : 0x7c4dff)
                .addFields(
                    {
                        name: `Level ${PRESTIGE_LEVEL.toLocaleString()}`,
                        value: levelDone
                            ? '✅ Requirement met'
                            : `❌ You are level ${player?.level ?? 0} — ${(PRESTIGE_LEVEL - (player?.level ?? 0)).toLocaleString()} levels to go`,
                        inline: false,
                    },
                    {
                        name: `💴 ${PRESTIGE_COST.toLocaleString()} yen`,
                        value: yenDone
                            ? '✅ Requirement met'
                            : `❌ You have 💴 ${(player?.yen ?? 0).toLocaleString()} — need 💴 ${(PRESTIGE_COST - (player?.yen ?? 0)).toLocaleString()} more`,
                        inline: false,
                    },
                    {
                        name: 'Status',
                        value: existing ? '👑 Already prestiged!' : (levelDone && yenDone ? '🎉 Ready! Use `/prestige buy`' : '🔒 Not yet eligible'),
                        inline: false,
                    }
                );
            return interaction.editReply({ embeds: [embed] });
        }

        const { user, member, guild } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);

        // Check if already claimed
        const existing = getRoleReward.get(user.id);
        if (existing) {
            return interaction.editReply('✅ You already have the prestige role!');
        }

        // Check level requirement
        if (player.level < PRESTIGE_LEVEL) {
            return interaction.editReply(
                `❌ You need to be level **${PRESTIGE_LEVEL}** to prestige.\n` +
                `You are currently level **${player.level}** — only ${PRESTIGE_LEVEL - player.level} levels to go!`
            );
        }

        // Check yen requirement
        if (player.yen < PRESTIGE_COST) {
            const needed = (PRESTIGE_COST - player.yen).toLocaleString();
            return interaction.editReply(
                `❌ You need **💴 ${PRESTIGE_COST.toLocaleString()}** yen to prestige.\n` +
                `You are **💴 ${needed}** short.`
            );
        }

        // Check role exists in guild
        const role = guild.roles.cache.get(ROLE_ID);
        if (!role) {
            return interaction.editReply('❌ Prestige role not found. Please contact an admin.');
        }

        // Check bot can assign the role
        const botMember = guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.editReply('❌ My role is too low to assign the prestige role. Ask an admin to move my role above it.');
        }

        // Deduct yen and assign role
        updatePlayer.run(
            player.level - PRESTIGE_LEVEL, player.xp, player.hp,
            player.yen - PRESTIGE_COST,
            player.attack, player.defense,
            user.id
        );
        await member.roles.add(role, 'Prestige purchase');
        addRoleReward.run(user.id, ROLE_ID);

        const embed = new EmbedBuilder()
            .setTitle('👑 Prestige achieved!')
            .setColor(0xffd700)
            .setDescription(
                `You have reached the pinnacle of 9Tail!\n` +
                `The <@&${ROLE_ID}> role has been granted to you.`
            )
            .addFields(
                { name: 'Level', value: `${player.level}`, inline: true },
                { name: 'Yen paid', value: `💴 ${PRESTIGE_COST.toLocaleString()}`, inline: true },
                { name: 'Balance', value: `💴 ${(player.yen - PRESTIGE_COST).toLocaleString()}`, inline: true },
            )
            .setFooter({ text: 'Congratulations on your achievement!' });

        await interaction.editReply({ embeds: [embed] });

        // Announce publicly in the channel
        await interaction.followUp({
            content: `👑 ${user} has achieved **Prestige** and earned the <@&${ROLE_ID}> role!`,
            ephemeral: false,
        });
    },
};