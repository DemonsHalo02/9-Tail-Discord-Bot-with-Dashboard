const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Challenge another player to a PvP duel')
        .addUserOption(o => o.setName('opponent').setDescription('Player to challenge').setRequired(true))
        .addIntegerOption(o => o.setName('wager').setDescription('Yen to wager').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const { checkCooldown } = require('../../utils/cooldowns');

        // inside execute():
        const cd = checkCooldown(user.id, 'dungeon', 60); // 30 second cooldown
        if (cd.onCooldown) return interaction.editReply({
            content: `⏳ You can use this again in **${cd.remaining}s**.`,
            ephemeral: true,
        });

        const { user } = interaction;
        const opponent = interaction.options.getUser('opponent');
        const wager = interaction.options.getInteger('wager') ?? 0;

        if (opponent.id === user.id) return interaction.editReply('❌ You cannot duel yourself.');
        if (opponent.bot) return interaction.editReply('❌ You cannot duel a bot.');

        createPlayer.run(user.id, user.username);
        createPlayer.run(opponent.id, opponent.username);

        const challenger = getPlayer.get(user.id);
        const op = getPlayer.get(opponent.id);

        if (wager > 0 && challenger.yen < wager) return interaction.editReply(`❌ You don't have enough yen to wager 💴 ${wager}.`);
        if (wager > 0 && op.yen < wager) return interaction.editReply(`❌ ${opponent.username} doesn't have enough yen to match the wager.`);

        const accept = new ButtonBuilder().setCustomId('duel_accept').setLabel('Accept').setStyle(ButtonStyle.Success);
        const decline = new ButtonBuilder().setCustomId('duel_decline').setLabel('Decline').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(accept, decline);

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Duel challenge!')
            .setColor(0x7c4dff)
            .setDescription(`${user} has challenged ${opponent} to a duel!`)
            .addFields(
                { name: 'Wager', value: wager > 0 ? `💴 ${wager}` : 'None', inline: true },
                { name: 'Expires', value: 'in 60 seconds', inline: true },
            );

        const msg = await interaction.editReply({ content: `${opponent}`, embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60_000 });

        collector.on('collect', async btn => {
            if (btn.user.id !== opponent.id) {
                return btn.reply({ content: '❌ Only the challenged player can respond.', ephemeral: true });
            }

            await btn.deferUpdate();
            collector.stop();

            if (btn.customId === 'duel_decline') {
                return interaction.editReply({ content: `${opponent.username} declined the duel.`, embeds: [], components: [] });
            }

            // Simulate duel
            const cAtk = Math.max(1, challenger.attack + Math.floor(Math.random() * 10));
            const oAtk = Math.max(1, op.attack + Math.floor(Math.random() * 10));
            const cDef = challenger.defense;
            const oDef = op.defense;

            let cHp = challenger.hp;
            let oHp = op.hp;
            let rounds = 0;

            while (cHp > 0 && oHp > 0 && rounds < 30) {
                oHp -= Math.max(1, cAtk - oDef + Math.floor(Math.random() * 5));
                cHp -= Math.max(1, oAtk - cDef + Math.floor(Math.random() * 5));
                rounds++;
            }

            const challengerWon = oHp <= 0 || cHp > oHp;
            const winner = challengerWon ? user : opponent;
            const loser = challengerWon ? opponent : user;

            if (wager > 0) {
                const wP = getPlayer.get(winner.id);
                const lP = getPlayer.get(loser.id);
                updatePlayer.run(wP.level, wP.xp, wP.hp, wP.yen + wager, wP.attack, wP.defense, winner.id);
                updatePlayer.run(lP.level, lP.xp, lP.hp, lP.yen - wager, lP.attack, lP.defense, loser.id);
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle(`⚔️ ${winner.username} wins the duel!`)
                .setColor(0x00e676)
                .addFields(
                    { name: 'Rounds', value: `${rounds}`, inline: true },
                    { name: 'Wager', value: wager > 0 ? `💴 ${wager} transferred` : 'None', inline: true },
                );

            return interaction.editReply({ embeds: [resultEmbed], components: [] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: '⏳ Duel expired.', embeds: [], components: [] });
            }
        });
    },
};