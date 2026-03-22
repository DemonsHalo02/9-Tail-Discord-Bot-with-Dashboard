const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createPlayer, getPets, getPet, addPet, updatePet } = require('../../utils/db');

const PET_TYPES = ['🐺 Wolf', '🐉 Dragon', '🦊 Fox', '🐻 Bear', '🦅 Eagle', '🐱 Cat'];
const ADOPT_COST = 500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Pet system')
        .addSubcommand(s => s.setName('adopt').setDescription(`Adopt a random pet (💴 ${ADOPT_COST})`).addStringOption(o => o.setName('name').setDescription('Name your pet').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('View your pets'))
        .addSubcommand(s => s.setName('feed').setDescription('Feed a pet').addIntegerOption(o => o.setName('pet_id').setDescription('Pet ID').setRequired(true)))
        .addSubcommand(s => s.setName('play').setDescription('Play with a pet').addIntegerOption(o => o.setName('pet_id').setDescription('Pet ID').setRequired(true)))
        .addSubcommand(s => s.setName('train').setDescription('Train a pet to level it up').addIntegerOption(o => o.setName('pet_id').setDescription('Pet ID').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const { user } = interaction;
        createPlayer.run(user.id, user.username);
        const sub = interaction.options.getSubcommand();
        const { getPlayer, updatePlayer } = require('../../utils/db');
        const player = getPlayer.get(user.id);

        if (sub === 'adopt') {
            if (player.yen < ADOPT_COST) return interaction.editReply(`❌ Adopting a pet costs 💴 ${ADOPT_COST}.`);
            const petName = interaction.options.getString('name').trim().slice(0, 20);
            const type = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
            addPet.run(user.id, petName, type);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - ADOPT_COST, player.attack, player.defense, user.id);
            return interaction.editReply(`✅ You adopted a **${type}** named **${petName}**!`);
        }

        if (sub === 'list') {
            const pets = getPets.all(user.id);
            if (!pets.length) return interaction.editReply('You have no pets! Use `/pet adopt` to get one.');
            const embed = new EmbedBuilder()
                .setTitle(`🐾 ${user.username}'s pets`)
                .setColor(0x7c4dff)
                .setDescription(pets.map(p =>
                    `\`ID:${p.id}\` **${p.name}** (${p.type}) — Lv ${p.level} | 🍖 ${p.hunger}% | 😊 ${p.happiness}%`
                ).join('\n'));
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'feed') {
            const petId = interaction.options.getInteger('pet_id');
            const pet = getPet.get(petId, user.id);
            if (!pet) return interaction.editReply('❌ Pet not found.');
            if (player.yen < 10) return interaction.editReply('❌ Feeding costs 💴 10.');
            const newHunger = Math.min(100, pet.hunger + 30);
            updatePet.run(pet.level, pet.xp, newHunger, pet.happiness, pet.id);
            updatePlayer.run(player.level, player.xp, player.hp, player.yen - 10, player.attack, player.defense, user.id);
            return interaction.editReply(`🍖 Fed **${pet.name}**! Hunger: ${newHunger}%`);
        }

        if (sub === 'play') {
            const petId = interaction.options.getInteger('pet_id');
            const pet = getPet.get(petId, user.id);
            if (!pet) return interaction.editReply('❌ Pet not found.');
            const newHappiness = Math.min(100, pet.happiness + 25);
            updatePet.run(pet.level, pet.xp, pet.hunger, newHappiness, pet.id);
            return interaction.editReply(`😊 Played with **${pet.name}**! Happiness: ${newHappiness}%`);
        }

        if (sub === 'train') {
            const petId = interaction.options.getInteger('pet_id');
            const pet = getPet.get(petId, user.id);
            if (!pet) return interaction.editReply('❌ Pet not found.');
            if (pet.hunger < 20) return interaction.editReply('❌ Your pet is too hungry to train! Feed it first.');
            const xpGain = Math.floor(Math.random() * 30) + 10;
            const newXp = pet.xp + xpGain;
            const levelUp = newXp >= pet.level * 100;
            const newLevel = levelUp ? pet.level + 1 : pet.level;
            const newHunger = Math.max(0, pet.hunger - 15);
            updatePet.run(newLevel, levelUp ? 0 : newXp, newHunger, pet.happiness, pet.id);
            const msg = levelUp
                ? `🎉 **${pet.name}** leveled up to level **${newLevel}**!`
                : `💪 Trained **${pet.name}**! +${xpGain} XP`;
            return interaction.editReply(msg);
        }
    },
};