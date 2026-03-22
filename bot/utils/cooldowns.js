const fs = require('fs');
const path = require('path');

const CD_FILE = path.join(__dirname, '..', '..', 'cooldowns.json');
let cooldowns = {};

// Load existing cooldowns from file on startup
try {
    if (fs.existsSync(CD_FILE)) {
        cooldowns = JSON.parse(fs.readFileSync(CD_FILE, 'utf8'));
    }
} catch { cooldowns = {}; }

function save() {
    // Clean expired before saving
    const now = Date.now();
    Object.keys(cooldowns).forEach(k => { if (cooldowns[k] <= now) delete cooldowns[k]; });
    fs.writeFileSync(CD_FILE, JSON.stringify(cooldowns));
}

function checkCooldown(userId, commandName, seconds) {
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    const ends = cooldowns[key];

    if (ends && now < ends) {
        const remaining = ((ends - now) / 1000).toFixed(1);
        return { onCooldown: true, remaining };
    }

    cooldowns[key] = now + seconds * 1000;
    save();
    return { onCooldown: false };
}

module.exports = { checkCooldown };