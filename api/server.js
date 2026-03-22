require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('../bot/utils/db');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
let API_KEY = process.env.API_KEY || 'changeme';

function authMiddleware(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// Protected API routes
app.use('/api', authMiddleware);

const { getInventory, addItem } = require('../bot/utils/db');

// Fetch Discord user info (avatar, username)
app.get('/api/discord/user/:id', authMiddleware, async (req, res) => {
    try {
        const response = await fetch(`https://discord.com/api/v10/users/${req.params.id}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
        });
        if (!response.ok) return res.status(404).json({ error: 'User not found' });
        const user = await response.json();
        const avatar = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
        res.json({ avatar, username: user.username, id: user.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Player search
app.get('/api/player/:id', authMiddleware, (req, res) => {
    const player = db.prepare('SELECT * FROM players WHERE user_id = ?').get(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const inventory = getInventory.all(req.params.id);
    res.json({ ...player, inventory });
});

// Server stats
app.get('/api/stats', (req, res) => {
    const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get();
    const banCount = db.prepare("SELECT COUNT(*) as count FROM modlogs WHERE action='ban'").get();
    const warnCount = db.prepare("SELECT COUNT(*) as count FROM modlogs WHERE action='warn'").get();
    res.json({
        totalPlayers: playerCount.count,
        totalBans: banCount.count,
        totalWarns: warnCount.count,
    });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const rows = db.prepare(`
    SELECT user_id, username, level, xp, yen
    FROM players ORDER BY level DESC, xp DESC LIMIT 20
  `).all();
    res.json(rows);
});

// Mod logs
app.get('/api/modlogs/:guildId', (req, res) => {
    const logs = db.prepare(
        'SELECT * FROM modlogs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.guildId);
    res.json(logs);
});

// Edit player (give yen, reset stats)
app.patch('/api/player/:id', authMiddleware, (req, res) => {
    const { yen, level, xp, hp, attack, defense } = req.body;
    const player = db.prepare('SELECT * FROM players WHERE user_id = ?').get(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    db.prepare(`
    UPDATE players SET
      yen=?, level=?, xp=?, hp=?, attack=?, defense=?
    WHERE user_id=?
  `).run(
        yen ?? player.yen,
        level ?? player.level,
        xp ?? player.xp,
        hp ?? player.hp,
        attack ?? player.attack,
        defense ?? player.defense,
        req.params.id
    );
    res.json({ success: true });
});

// Reset player stats
app.post('/api/player/:id/reset', authMiddleware, (req, res) => {
    const exists = db.prepare('SELECT user_id FROM players WHERE user_id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Player not found' });
    db.prepare(`
    UPDATE players SET level=1, xp=0, hp=100, yen=50, attack=10, defense=5 WHERE user_id=?
  `).run(req.params.id);
    res.json({ success: true });
});

// Chart data — level distribution
app.get('/api/charts/levels', authMiddleware, (req, res) => {
    const rows = db.prepare(`
    SELECT level, COUNT(*) as count FROM players GROUP BY level ORDER BY level ASC
  `).all();
    res.json(rows);
});

// Chart data — action breakdown
app.get('/api/charts/modactions', authMiddleware, (req, res) => {
    const rows = db.prepare(`
    SELECT action, COUNT(*) as count FROM modlogs GROUP BY action
  `).all();
    res.json(rows);
});

// Activity log (recent mod actions)
app.get('/api/activity', authMiddleware, (req, res) => {
    const rows = db.prepare(`
    SELECT * FROM modlogs ORDER BY created_at DESC LIMIT 20
  `).all();
    res.json(rows);
});

const { getCommandSettings, setCommandEnabled } = require('../bot/utils/db');

// List all commands with their real enabled state from DB
app.get('/api/commands', authMiddleware, (req, res) => {
    // Get all command files dynamically
    const commandNames = [];

    for (const folder of ['rpg', 'mod']) {
        const dir = path.join(__dirname, '..', 'bot', 'commands', folder);
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir)
                .filter(f => f.endsWith('.js'))
                .forEach(f => commandNames.push({ name: f.replace('.js', ''), folder }));
        }
    }

    // Get saved settings from DB
    const settings = {};
    getCommandSettings.all().forEach(row => {
        settings[row.name] = row.enabled === 1;
    });

    res.json(commandNames.map(({ name, folder }) => ({
        name,
        folder,
        enabled: settings[name] !== undefined ? settings[name] : true,
    })));
});

// Toggle a command on/off
app.post('/api/commands/:name/toggle', authMiddleware, (req, res) => {
    const { name } = req.params;
    const settings = {};
    getCommandSettings.all().forEach(row => {
        settings[row.name] = row.enabled === 1;
    });
    const currentlyEnabled = settings[name] !== undefined ? settings[name] : true;
    const newState = currentlyEnabled ? 0 : 1;
    setCommandEnabled.run(name, newState);
    res.json({ name, enabled: newState === 1 });
});

// Shop / item manager
app.get('/api/items/:userId', authMiddleware, (req, res) => {
    const items = getInventory.all(req.params.userId);
    res.json(items);
});
app.post('/api/items/:userId', authMiddleware, (req, res) => {
    const { item_name, item_type, value } = req.body;
    addItem.run(req.params.userId, item_name, item_type, value ?? 0);
    res.json({ success: true });
});
app.delete('/api/items/:itemId', authMiddleware, (req, res) => {
    db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.itemId);
    res.json({ success: true });
});

const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limit for auth attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/stats', authLimiter); // stats is used for login check

// Serve dashboard static files
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

const { getActiveEvent } = require('../bot/utils/seasons');

// ── Seasonal event ────────────────────────────────────────────────────
app.get('/api/event', authMiddleware, (req, res) => {
    const event = getActiveEvent();
    res.json(event ?? { name: null });
});

// ── Raid ──────────────────────────────────────────────────────────────
app.get('/api/raid/:guildId', authMiddleware, (req, res) => {
    const raid = db.prepare("SELECT * FROM raids WHERE guild_id=? AND status='active'").get(req.params.guildId);
    if (!raid) return res.json(null);
    const participants = db.prepare(
        'SELECT r.*, p.username FROM raid_participants r LEFT JOIN players p ON p.user_id=r.user_id WHERE r.raid_id=? ORDER BY r.damage DESC'
    ).all(raid.id);
    res.json({ ...raid, participants });
});

// ── Lottery ───────────────────────────────────────────────────────────
app.get('/api/lottery', authMiddleware, (req, res) => {
    const jackpot = db.prepare('SELECT * FROM jackpot WHERE id=1').get() ?? { pool: 0 };
    const entries = db.prepare('SELECT l.*, p.username FROM lottery l LEFT JOIN players p ON p.user_id=l.user_id').all();
    const total = entries.reduce((s, e) => s + e.tickets, 0);
    res.json({ jackpot: jackpot.pool, entries, totalTickets: total });
});

app.delete('/api/lottery/reset', authMiddleware, (req, res) => {
    db.prepare('DELETE FROM lottery').run();
    db.prepare('UPDATE jackpot SET pool=0 WHERE id=1').run();
    res.json({ success: true });
});

// ── Gambling leaderboard ──────────────────────────────────────────────
app.get('/api/gambling/leaderboard', authMiddleware, (req, res) => {
    const rows = db.prepare(`
    SELECT g.*, p.username FROM gambling_stats g
    LEFT JOIN players p ON p.user_id=g.user_id
    ORDER BY g.total_won DESC LIMIT 20
  `).all();
    res.json(rows);
});

// ── Trades ────────────────────────────────────────────────────────────
app.get('/api/trades', authMiddleware, (req, res) => {
    const trades = db.prepare(`
    SELECT t.*,
      s.username as sender_name, r.username as receiver_name,
      oi.item_name as offer_item_name, ri.item_name as request_item_name
    FROM trades t
    LEFT JOIN players s  ON s.user_id=t.sender_id
    LEFT JOIN players r  ON r.user_id=t.receiver_id
    LEFT JOIN inventory oi ON oi.id=t.offer_item
    LEFT JOIN inventory ri ON ri.id=t.request_item
    ORDER BY t.created_at DESC LIMIT 50
  `).all();
    res.json(trades);
});

// ── Pets ──────────────────────────────────────────────────────────────
app.get('/api/pets', authMiddleware, (req, res) => {
    const pets = db.prepare(`
    SELECT pt.*, p.username FROM pets pt
    LEFT JOIN players p ON p.user_id=pt.user_id
    ORDER BY pt.level DESC
  `).all();
    res.json(pets);
});

// ── Guilds ────────────────────────────────────────────────────────────
app.get('/api/guilds', authMiddleware, (req, res) => {
    const guilds = db.prepare('SELECT * FROM guilds_rpg ORDER BY bank DESC').all();
    const result = guilds.map(g => {
        const members = db.prepare(
            'SELECT gm.*, p.username FROM guild_members gm LEFT JOIN players p ON p.user_id=gm.user_id WHERE gm.guild_id=?'
        ).all(g.id);
        return { ...g, members };
    });
    res.json(result);
});

// ── Quests ────────────────────────────────────────────────────────────
app.get('/api/quests', authMiddleware, (req, res) => {
    const quests = db.prepare(`
    SELECT q.*, p.username FROM quests q
    LEFT JOIN players p ON p.user_id=q.user_id
    ORDER BY q.created_at DESC LIMIT 100
  `).all();
    res.json(quests);
});

// ── Error logs ────────────────────────────────────────────────────────
const ERROR_LOG_FILE = path.join(__dirname, '..', 'error_log.json');

app.get('/api/errorlogs', authMiddleware, (req, res) => {
    try {
        if (!fs.existsSync(ERROR_LOG_FILE)) return res.json([]);
        const logs = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, 'utf8'));
        res.json(logs.slice(-100).reverse());
    } catch { res.json([]); }
});

app.delete('/api/errorlogs', authMiddleware, (req, res) => {
    fs.writeFileSync(ERROR_LOG_FILE, '[]');
    res.json({ success: true });
});

// ── Backups ───────────────────────────────────────────────────────────
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

app.get('/api/backups', authMiddleware, (req, res) => {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .map(f => {
            const stat = fs.statSync(path.join(BACKUP_DIR, f));
            return { name: f, size: stat.size, created: stat.mtime };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(files);
});

app.post('/api/backups/trigger', authMiddleware, (req, res) => {
    try {
        const { runBackup } = require('../bot/utils/backup');
        runBackup();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/backups/download/:filename', authMiddleware, (req, res) => {
    const file = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    res.download(file);
});

// ── System status ─────────────────────────────────────────────────────
app.get('/api/system/status', authMiddleware, (req, res) => {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    res.json({
        api: 'online',
        uptime: Math.floor(uptime),
        memory: Math.round(mem.rss / 1024 / 1024),
        timestamp: new Date().toISOString(),
    });
});

// ── Cooldowns ─────────────────────────────────────────────────────────
app.get('/api/cooldowns', authMiddleware, (req, res) => {
    // Read cooldown map from a shared file written by the bot
    const cdFile = path.join(__dirname, '..', 'cooldowns.json');
    try {
        if (!fs.existsSync(cdFile)) return res.json([]);
        const data = JSON.parse(fs.readFileSync(cdFile, 'utf8'));
        const now = Date.now();
        const active = Object.entries(data)
            .filter(([, ends]) => ends > now)
            .map(([key, ends]) => {
                const [userId, command] = key.split('-');
                return { userId, command, endsAt: ends, remaining: Math.ceil((ends - now) / 1000) };
            });
        res.json(active);
    } catch { res.json([]); }
});

app.listen(process.env.API_PORT || 3001, '0.0.0.0', () => {
  console.log(`API running on port ${process.env.API_PORT || 3001}`);
});
