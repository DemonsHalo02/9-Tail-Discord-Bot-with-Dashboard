const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPlayer, updatePlayer, getFarm, setFarm, addItem } = require('../../utils/db');

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const MATERIALS = [
    { name: 'Iron Ore', type: 'material', value: 20, weight: 40 },
    { name: 'Wood', type: 'material', value: 10, weight: 50 },
    { name: 'Magic Stone', type: 'material', value: 60, weight: 15 },
    { name: 'Dragon Scale', type: 'material', value: 150, weight: 5 },
    { name: 'Herbs', type: 'material', value: 15, weight: 45 },
    { name: 'Coal', type: 'material', value: 8, weight: 55 },
];

const CRAFTABLE = [
    { name: 'Iron Sword', type: 'weapon', materials: { 'Iron Ore': 3, 'Wood': 1 }, bonus: { stat: 'attack', val: 5 } },
    { name: 'Magic Staff', type: 'weapon', materials: { 'Magic Stone': 2, 'Wood': 2 }, bonus: { stat: 'attack', val: 12 } },
    { name: 'Dragon Armor', type: 'armor', materials: { 'Dragon Scale': 2, 'Iron Ore': 2 }, bonus: { stat: 'defense', val: 15 } },
    { name: 'Health Potion', type: 'potion', materials: { 'Herbs': 3 }, bonus: { stat: 'hp', val: 50 } },
];

function weightedRandom(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('Farm materials or craft items')
        .addSubcommand(s => s.setName('gather').setDescription('Gather materials (1hr cooldown)'))
        .addSubcommand(s => s.setName('recipes').setDescription('View craftable items'))
        .addSubcommand(s => s
            .setName('craft')
            .setDescription('Craft an item from materials')
            .addIntegerOption(o => o.setName('recipe').setDescription('Recipe number').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();

        if (sub === 'gather') {
            const { checkCooldown } = require('../../utils/cooldowns');

            // inside execute():
            const cd = checkCooldown(user.id, 'dungeon', 3600); // 1 hour cooldown
            if (cd.onCooldown) return interaction.editReply({
                content: `⏳ You can use this again in **${cd.remaining}s**.`,
                ephemeral: true,
            });

            const farmData = getFarm.get(user.id);
            const now = new Date();

            if (farmData) {
                const diff = now - new Date(farmData.last_farm);
                if (diff < COOLDOWN_MS) {
                    const remaining = COOLDOWN_MS - diff;
                    const mins = Math.floor(remaining / 60000);
                    return interaction.editReply(`⏳ Your plots need more time! Come back in **${mins} minutes**.`);
                }
            }

            const plots = farmData?.plots ?? 1;
            const gained = [];
            for (let i = 0; i < plots; i++) {
                const mat = weightedRandom(MATERIALS);
                addItem.run(user.id, mat.name, mat.type, mat.value);
                gained.push(mat.name);
            }

            setFarm.run(user.id, now.toISOString(), plots);
            const summary = gained.reduce((acc, name) => {
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});
            const lines = Object.entries(summary).map(([name, qty]) => `• ${name} x${qty}`);

            const embed = new EmbedBuilder()
                .setTitle('🌾 Harvest complete!')
                .setColor(0x00c853)
                .setDescription(lines.join('\n'))
                .setFooter({ text: `You have ${plots} plot${plots > 1 ? 's' : ''}` });
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'recipes') {
            const lines = CRAFTABLE.map((r, i) => {
                const mats = Object.entries(r.materials).map(([k, v]) => `${k} x${v}`).join(', ');
                return `\`${i + 1}\` **${r.name}** (${r.type}) — needs: ${mats} — +${r.bonus.val} ${r.bonus.stat}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('⚒️ Crafting recipes')
                .setColor(0x7c4dff)
                .setDescription(lines.join('\n'));
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'craft') {
            const index = interaction.options.getInteger('recipe') - 1;
            const recipe = CRAFTABLE[index];
            if (!recipe) return interaction.editReply('❌ Invalid recipe number.');

            const { db } = require('../../utils/db');
            const inventory = db.prepare('SELECT * FROM inventory WHERE user_id = ?').all(user.id);

            // Check if player has required materials
            for (const [matName, needed] of Object.entries(recipe.materials)) {
                const owned = inventory.filter(i => i.item_name === matName).length;
                if (owned < needed) {
                    return interaction.editReply(`❌ You need **${matName} x${needed}** but only have x${owned}.`);
                }
            }

            // Remove materials
            for (const [matName, needed] of Object.entries(recipe.materials)) {
                const toRemove = inventory.filter(i => i.item_name === matName).slice(0, needed);
                for (const item of toRemove) {
                    db.prepare('DELETE FROM inventory WHERE id = ?').run(item.id);
                }
            }

            // Add crafted item
            addItem.run(user.id, recipe.name, recipe.type, recipe.bonus.val * 10);

            const embed = new EmbedBuilder()
                .setTitle('⚒️ Item crafted!')
                .setColor(0x00e676)
                .setDescription(`You crafted **${recipe.name}**! (+${recipe.bonus.val} ${recipe.bonus.stat})`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};