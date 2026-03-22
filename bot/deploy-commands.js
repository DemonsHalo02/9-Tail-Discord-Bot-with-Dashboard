require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
for (const folder of ['rpg', 'mod', 'utility', 'economy', 'server']) {
    const files = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(f => f.endsWith('js'));
    for (const file of files) {
        const cmd = require(`./commands/${folder}/${file}`);
        commands.push(cmd.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    console.log('Registering slash commands...');
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    );
    console.log('Done!');
})();