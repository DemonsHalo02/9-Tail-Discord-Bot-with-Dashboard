# 9-Tail-Discord-Bot-with-Dashboard
This is an official discord bot made by Halo for his discord server that includes rpg and moderation style commands as well as a full dashboard for managing the bot. This is also apart of his portfolio.
To use this bot and dashboard you must first install node.js and then after using the code install these modules using the command prompt:
**npm install discord.js better-sqlite3 express cors dotenv node-cron node-fetch express-rate-limit leo-profanity**
**npm install -g pm2**
Also if you encounter any bugs with the code let me know and I will fix them.
Please also make sure to credit me if you use my code for your projects.

When using the bot make sure you first create a ".env" file in the bot root folder and add these to it:
**DISCORD_TOKEN=PUTBOTTOKENHERE
CLIENT_ID=PUTBOTIDHERE
GUILD_ID=PUTGUILDIDHERE
API_PORT=3001
API_KEY=APIKEYHERE
PRESTIGE_ROLE_ID=ROLEIDHERE
PRESTIGE_COST=10000000
PRESTIGE_LEVEL=1000
ERROR_LOG_CHANNEL=LOGCHANNELIDHERE**

Once you finish the previous messages just use the file "start.bat" to start the bot/dashboard and "stop.bat" to stop it.
