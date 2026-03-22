require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: ['Message', 'Channel', 'Reaction'],
});

client.commands = new Collection();

// Load all commands recursively
const commandFolders = ['rpg', 'mod', 'utility', 'economy', 'server'];
for (const folder of commandFolders) {
    const files = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const cmd = require(`./commands/${folder}/${file}`);
        client.commands.set(cmd.data.name, cmd);
    }
}

// Load events
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.login(process.env.DISCORD_TOKEN);