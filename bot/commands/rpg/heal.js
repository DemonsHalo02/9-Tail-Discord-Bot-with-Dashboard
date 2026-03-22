const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer } = require('../../utils/db');

const HEAL_COST_PER_HP = 2;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heal')
        .setDescription('Restore your HP using yen')
        .addIntegerOption(o => o.setName('amount').setDescription('HP to restore (default: full)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const player = getPlayer.get(user.id);
        const missing = player.max_hp - player.hp;

        if (missing === 0) return interaction.editReply('❤️ You are already at full HP!');

        const requested = interaction.options.getInteger('amount') ?? missing;
        const toHeal = Math.min(requested, missing);
        const cost = toHeal * HEAL_COST_PER_HP;

        if (player.yen < cost) {
            return interaction.editReply(`❌ Not enough yen! Healing ${toHeal} HP costs 💴 ${cost}.`);
        }

        updatePlayer.run(player.level, player.xp, player.hp + toHeal, player.yen - cost, player.attack, player.defense, user.id);

        const embed = new EmbedBuilder()
            .setTitle('❤️ Healed!')
            .setColor(0x00e676)
            .addFields(
                { name: 'HP restored', value: `+${toHeal}`, inline: true },
                { name: 'Cost', value: `💴 ${cost}`, inline: true },
                { name: 'HP now', value: `${player.hp + toHeal}/${player.max_hp}`, inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    },
};