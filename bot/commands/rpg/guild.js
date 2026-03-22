const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getRpgGuild, getRpgGuildByName, getRpgGuildMember, createRpgGuild, joinRpgGuild, updateGuildBank, db } = require('../../utils/db');

const CREATE_COST = 5000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('Guild system')
        .addSubcommand(s => s.setName('create').setDescription(`Create a guild (costs 💴 ${CREATE_COST})`).addStringOption(o => o.setName('name').setDescription('Guild name').setRequired(true)))
        .addSubcommand(s => s.setName('join').setDescription('Join a guild').addStringOption(o => o.setName('name').setDescription('Guild name').setRequired(true)))
        .addSubcommand(s => s.setName('leave').setDescription('Leave your current guild'))
        .addSubcommand(s => s.setName('info').setDescription('View your guild info'))
        .addSubcommand(s => s.setName('deposit').setDescription('Deposit yen into the guild bank').addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
        .addSubcommand(s => s.setName('withdraw').setDescription('Withdraw yen from guild bank (owner only)').addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);
        const sub = interaction.options.getSubcommand();

        if (sub === 'create') {
            const { sanitizeString, validateUsername } = require('../../utils/validate');

            const name = sanitizeString(interaction.options.getString('name'), 32);
            const check = validateUsername(name);
            if (!check.valid) return interaction.editReply(`❌ ${check.msg}`);
            if (name.length > 32) return interaction.editReply('❌ Guild name must be under 32 characters.');
            if (player.yen < CREATE_COST) return interaction.editReply(`❌ Creating a guild costs 💴 ${CREATE_COST}.`);
            const existing = getRpgGuildByName.get(name);
            if (existing) return interaction.editReply('❌ A guild with that name already exists.');
            const inGuild = getRpgGuildMember.get(user.id);
            if (inGuild) return interaction.editReply('❌ You are already in a guild. Leave first.');

            const info = createRpgGuild.run(name, user.id);
            joinRpgGuild.run(user.id, info.lastInsertRowid);
            db.prepare('UPDATE guild_members SET rank=? WHERE user_id=?').run('owner', user.id);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - CREATE_COST, player.attack, player.defense, user.id);

            return interaction.editReply(`✅ Guild **${name}** created!`);
        }

        if (sub === 'join') {
            const name = interaction.options.getString('name').trim();
            const guild = getRpgGuildByName.get(name);
            if (!guild) return interaction.editReply('❌ Guild not found.');
            const inGuild = getRpgGuildMember.get(user.id);
            if (inGuild) return interaction.editReply('❌ You are already in a guild.');
            joinRpgGuild.run(user.id, guild.id);
            return interaction.editReply(`✅ Joined **${guild.name}**!`);
        }

        if (sub === 'leave') {
            const membership = getRpgGuildMember.get(user.id);
            if (!membership) return interaction.editReply('❌ You are not in a guild.');
            if (membership.rank === 'owner') return interaction.editReply('❌ Transfer ownership before leaving.');
            db.prepare('DELETE FROM guild_members WHERE user_id=?').run(user.id);
            return interaction.editReply('✅ Left your guild.');
        }

        if (sub === 'info') {
            const membership = getRpgGuildMember.get(user.id);
            if (!membership) return interaction.editReply('❌ You are not in a guild.');
            const guild = getRpgGuild.get(membership.guild_id);
            const members = db.prepare('SELECT * FROM guild_members WHERE guild_id=?').all(guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`🏰 ${guild.name}`)
                .setColor(0x7c4dff)
                .addFields(
                    { name: 'Owner', value: `<@${guild.owner_id}>`, inline: true },
                    { name: 'Members', value: `${members.length}`, inline: true },
                    { name: 'Bank', value: `💴 ${guild.bank}`, inline: true },
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            const membership = getRpgGuildMember.get(user.id);
            if (!membership) return interaction.editReply('❌ You are not in a guild.');
            if (player.yen < amount) return interaction.editReply('❌ Not enough yen.');
            const guild = getRpgGuild.get(membership.guild_id);
            updateGuildBank.run(guild.bank + amount, guild.id);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - amount, player.attack, player.defense, user.id);
            return interaction.editReply(`✅ Deposited 💴 ${amount} into the guild bank.`);
        }

        if (sub === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            const membership = getRpgGuildMember.get(user.id);
            if (!membership || membership.rank !== 'owner') return interaction.editReply('❌ Only the guild owner can withdraw.');
            const guild = getRpgGuild.get(membership.guild_id);
            if (guild.bank < amount) return interaction.editReply('❌ Not enough in the guild bank.');
            updateGuildBank.run(guild.bank - amount, guild.id);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen + amount, player.attack, player.defense, user.id);
            return interaction.editReply(`✅ Withdrew 💴 ${amount} from the guild bank.`);
        }
    },
};