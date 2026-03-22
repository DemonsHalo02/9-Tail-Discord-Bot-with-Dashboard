const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getRobCooldown, setRobCooldown } = require('../../utils/db');

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const SUCCESS_RATE = 0.45;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to rob another player')
        .addUserOption(o => o.setName('user').setDescription('Player to rob').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const { checkCooldown } = require('../../utils/cooldowns');

        // inside execute():
        const cd = checkCooldown(user.id, 'rob', 7200); // 2 hour cooldown
        if (cd.onCooldown) return interaction.editReply({
            content: `⏳ You can use this again in **${cd.remaining}s**.`,
            ephemeral: true,
        });

        const { user } = interaction;
        const target = interaction.options.getUser('user');

        if (target.id === user.id) return interaction.editReply('❌ You cannot rob yourself.');
        if (target.bot) return interaction.editReply('❌ You cannot rob a bot.');

        const cooldown = getRobCooldown.get(user.id);
        if (cooldown) {
            const diff = Date.now() - new Date(cooldown.last_rob).getTime();
            if (diff < COOLDOWN_MS) {
                const mins = Math.floor((COOLDOWN_MS - diff) / 60000);
                return interaction.editReply(`⏳ You can rob again in **${mins} minutes**.`);
            }
        }

        createPlayer.run(user.id, user.username);
        createPlayer.run(target.id, target.username);
        const robber = getPlayer.get(user.id);
        const victim = getPlayer.get(target.id);

        if (victim.yen < 50) return interaction.editReply('❌ That player is too poor to rob.');

        setRobCooldown.run(user.id, new Date().toISOString());
        const success = Math.random() < SUCCESS_RATE;

        if (success) {
            const stolen = Math.floor(victim.yen * (Math.random() * 0.3 + 0.1));
            updatePlayer.run(robber.level, robber.xp, robber.hp, robber.yen + stolen, robber.attack, robber.defense, user.id);
            updatePlayer.run(victim.level, victim.xp, victim.hp, victim.yen - stolen, victim.attack, victim.defense, target.id);
            return interaction.editReply(`🦹 Success! You stole 💴 ${stolen} from **${target.username}**!`);
        } else {
            const fine = Math.floor(robber.yen * 0.1);
            updatePlayer.run(robber.level, robber.xp, robber.hp, Math.max(0, robber.yen - fine), robber.attack, robber.defense, user.id);
            return interaction.editReply(`👮 Caught! You were fined 💴 ${fine} for attempting to rob **${target.username}**.`);
        }
    },
};