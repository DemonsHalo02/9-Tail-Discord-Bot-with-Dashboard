const Database = require('better-sqlite3');
const db = new Database('./database.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS command_settings (
    name    TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS players (
    user_id     TEXT PRIMARY KEY,
    username    TEXT,
    level       INTEGER DEFAULT 1,
    xp          INTEGER DEFAULT 0,
    hp          INTEGER DEFAULT 100,
    max_hp      INTEGER DEFAULT 100,
    attack      INTEGER DEFAULT 10,
    defense     INTEGER DEFAULT 5,
    yen        INTEGER DEFAULT 50,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT,
    item_name TEXT,
    item_type TEXT,   -- 'weapon' | 'armor' | 'potion'
    value     INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES players(user_id)
  );

  CREATE TABLE IF NOT EXISTS modlogs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT,
    target_id  TEXT,
    mod_id     TEXT,
    action     TEXT,  -- 'ban' | 'kick' | 'warn'
    reason     TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipped (
    user_id     TEXT PRIMARY KEY,
    weapon_id   INTEGER,
    armor_id    INTEGER
  );

  CREATE TABLE IF NOT EXISTS daily (
    user_id    TEXT PRIMARY KEY,
    last_claim TEXT
  );

  CREATE TABLE IF NOT EXISTS farm (
    user_id      TEXT PRIMARY KEY,
    last_farm    TEXT,
    plots        INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS warns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT,
    target_id  TEXT,
    mod_id     TEXT,
    reason     TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS role_rewards (
    user_id    TEXT PRIMARY KEY,
    role_id    TEXT,
    claimed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS duels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger  TEXT,
    opponent    TEXT,
    wager       INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guilds_rpg (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE,
    owner_id   TEXT,
    bank       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guild_members (
    user_id  TEXT PRIMARY KEY,
    guild_id INTEGER,
    rank     TEXT DEFAULT 'member',
    FOREIGN KEY(guild_id) REFERENCES guilds_rpg(id)
  );

  CREATE TABLE IF NOT EXISTS pets (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT,
    name     TEXT,
    type     TEXT,
    level    INTEGER DEFAULT 1,
    xp       INTEGER DEFAULT 0,
    hunger   INTEGER DEFAULT 100,
    happiness INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS quests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT,
    quest_type  TEXT,
    progress    INTEGER DEFAULT 0,
    goal        INTEGER,
    completed   INTEGER DEFAULT 0,
    claimed     INTEGER DEFAULT 0,
    reward_yen  INTEGER DEFAULT 0,
    reward_xp   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT,
    achievement TEXT,
    earned_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bank (
    user_id    TEXT PRIMARY KEY,
    balance    INTEGER DEFAULT 0,
    last_interest TEXT
  );

  CREATE TABLE IF NOT EXISTS robbery_cooldown (
    user_id    TEXT PRIMARY KEY,
    last_rob   TEXT
  );

  CREATE TABLE IF NOT EXISTS lottery (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT,
    tickets    INTEGER DEFAULT 1,
    entered_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jackpot (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    pool    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS automod_settings (
    guild_id      TEXT PRIMARY KEY,
    filter_spam   INTEGER DEFAULT 1,
    filter_links  INTEGER DEFAULT 1,
    filter_words  INTEGER DEFAULT 1,
    banned_words  TEXT DEFAULT '',
    log_channel   TEXT
  );

  CREATE TABLE IF NOT EXISTS welcome_settings (
    guild_id       TEXT PRIMARY KEY,
    welcome_channel TEXT,
    goodbye_channel TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to {server}!',
    goodbye_message TEXT DEFAULT '{user} has left {server}.',
    welcome_role    TEXT
  );

  CREATE TABLE IF NOT EXISTS starboard (
    guild_id        TEXT PRIMARY KEY,
    channel_id      TEXT,
    threshold       INTEGER DEFAULT 3,
    emoji           TEXT DEFAULT '⭐'
  );

  CREATE TABLE IF NOT EXISTS starboard_posts (
    message_id  TEXT PRIMARY KEY,
    star_message_id TEXT,
    star_count  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT,
    user_id     TEXT,
    channel_id  TEXT,
    status      TEXT DEFAULT 'open',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id       TEXT PRIMARY KEY,
    category_id    TEXT,
    log_channel    TEXT,
    support_role   TEXT
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT,
    channel_id  TEXT,
    message_id  TEXT,
    prize       TEXT,
    winners     INTEGER DEFAULT 1,
    ends_at     TEXT,
    ended       INTEGER DEFAULT 0,
    host_id     TEXT
  );

  CREATE TABLE IF NOT EXISTS giveaway_entries (
    giveaway_id INTEGER,
    user_id     TEXT,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS afk (
    user_id TEXT PRIMARY KEY,
    reason  TEXT DEFAULT 'AFK',
    set_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS heists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT,
    host_id     TEXT,
    message_id  TEXT,
    status      TEXT DEFAULT 'recruiting',
    wager       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS heist_members (
    heist_id  INTEGER,
    user_id   TEXT,
    role      TEXT,
    caught    INTEGER DEFAULT 0,
    PRIMARY KEY (heist_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS gambling_stats (
    user_id    TEXT PRIMARY KEY,
    total_won  INTEGER DEFAULT 0,
    total_lost INTEGER DEFAULT 0,
    games      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trades (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id    TEXT,
    receiver_id  TEXT,
    offer_item   INTEGER,
    request_item INTEGER,
    offer_yen    INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'pending',
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS raids (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT,
    boss_name  TEXT,
    boss_hp    INTEGER,
    boss_max_hp INTEGER,
    status     TEXT DEFAULT 'active',
    started_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS raid_participants (
    raid_id    INTEGER,
    user_id    TEXT,
    damage     INTEGER DEFAULT 0,
    PRIMARY KEY (raid_id, user_id)
  );
`);

// Players
const getPlayer = db.prepare('SELECT * FROM players WHERE user_id = ?');
const createPlayer = db.prepare(`
  INSERT OR IGNORE INTO players (user_id, username) VALUES (?, ?)
`);
const updatePlayer = db.prepare(`
  UPDATE players SET level=?, xp=?, hp=?, yen=?, attack=?, defense=? WHERE user_id=?
`);

// Inventory
const getInventory = db.prepare('SELECT * FROM inventory WHERE user_id = ?');
const addItem = db.prepare(`
  INSERT INTO inventory (user_id, item_name, item_type, value) VALUES (?, ?, ?, ?)
`);
const removeItem = db.prepare('DELETE FROM inventory WHERE id = ? AND user_id = ?');

// Mod logs
const addModLog = db.prepare(`
  INSERT INTO modlogs (guild_id, target_id, mod_id, action, reason) VALUES (?, ?, ?, ?, ?)
`);
const getModLogs = db.prepare('SELECT * FROM modlogs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50');

// Command settings
const getCommandSettings = db.prepare('SELECT * FROM command_settings');
const setCommandEnabled = db.prepare(`
  INSERT INTO command_settings (name, enabled) VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET enabled = excluded.enabled
`);
const isCommandEnabled = db.prepare(`
  SELECT enabled FROM command_settings WHERE name = ?
`);

// Exports the different variables
const getEquipped = db.prepare('SELECT * FROM equipped WHERE user_id = ?');
const setEquipped = db.prepare(`
  INSERT INTO equipped (user_id, weapon_id, armor_id) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET weapon_id=excluded.weapon_id, armor_id=excluded.armor_id
`);
const getDaily = db.prepare('SELECT * FROM daily WHERE user_id = ?');
const setDaily = db.prepare(`
  INSERT INTO daily (user_id, last_claim) VALUES (?, ?)
  ON CONFLICT(user_id) DO UPDATE SET last_claim=excluded.last_claim
`);
const getFarm = db.prepare('SELECT * FROM farm WHERE user_id = ?');
const setFarm = db.prepare(`
  INSERT INTO farm (user_id, last_farm, plots) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET last_farm=excluded.last_farm, plots=excluded.plots
`);
const getWarns = db.prepare('SELECT * FROM warns WHERE guild_id = ? AND target_id = ? ORDER BY created_at DESC');
const addWarn = db.prepare('INSERT INTO warns (guild_id, target_id, mod_id, reason) VALUES (?, ?, ?, ?)');

const getRoleReward = db.prepare('SELECT * FROM role_rewards WHERE user_id = ?');
const addRoleReward = db.prepare(`
  INSERT INTO role_rewards (user_id, role_id) VALUES (?, ?)
  ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id, claimed_at=datetime('now')
`);

// Bank
const getBank = db.prepare('SELECT * FROM bank WHERE user_id = ?');
const setBank = db.prepare(`INSERT INTO bank (user_id, balance) VALUES (?, 0) ON CONFLICT(user_id) DO NOTHING`);
const updateBank = db.prepare('UPDATE bank SET balance=?, last_interest=? WHERE user_id=?');

// Robbery
const getRobCooldown = db.prepare('SELECT * FROM robbery_cooldown WHERE user_id = ?');
const setRobCooldown = db.prepare(`INSERT INTO robbery_cooldown (user_id, last_rob) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET last_rob=excluded.last_rob`);

// Lottery
const getLotteryEntries = db.prepare('SELECT * FROM lottery WHERE user_id = ?');
const addLotteryEntry = db.prepare(`INSERT INTO lottery (user_id, tickets) VALUES (?, 1) ON CONFLICT DO UPDATE SET tickets=tickets+1`);
const getAllLottery = db.prepare('SELECT * FROM lottery');
const clearLottery = db.prepare('DELETE FROM lottery');
const getJackpot = db.prepare('SELECT * FROM jackpot WHERE id = 1');
const setJackpot = db.prepare(`INSERT INTO jackpot (id, pool) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET pool=excluded.pool`);

// Pets
const getPets = db.prepare('SELECT * FROM pets WHERE user_id = ?');
const getPet = db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?');
const addPet = db.prepare('INSERT INTO pets (user_id, name, type) VALUES (?, ?, ?)');
const updatePet = db.prepare('UPDATE pets SET level=?, xp=?, hunger=?, happiness=? WHERE id=?');

// Quests
const getQuests = db.prepare('SELECT * FROM quests WHERE user_id = ? AND completed = 0');
const addQuest = db.prepare('INSERT INTO quests (user_id, quest_type, goal, reward_yen, reward_xp) VALUES (?, ?, ?, ?, ?)');
const updateQuest = db.prepare('UPDATE quests SET progress=?, completed=? WHERE id=?');
const claimQuest = db.prepare('UPDATE quests SET claimed=1 WHERE id=?');

// Achievements
const getAchievements = db.prepare('SELECT * FROM achievements WHERE user_id = ?');
const addAchievement = db.prepare(`INSERT OR IGNORE INTO achievements (user_id, achievement) VALUES (?, ?)`);

// Guilds RPG
const getRpgGuild = db.prepare('SELECT * FROM guilds_rpg WHERE id = ?');
const getRpgGuildByName = db.prepare('SELECT * FROM guilds_rpg WHERE name = ?');
const getRpgGuildMember = db.prepare('SELECT * FROM guild_members WHERE user_id = ?');
const createRpgGuild = db.prepare('INSERT INTO guilds_rpg (name, owner_id) VALUES (?, ?)');
const joinRpgGuild = db.prepare(`INSERT INTO guild_members (user_id, guild_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET guild_id=excluded.guild_id`);
const updateGuildBank = db.prepare('UPDATE guilds_rpg SET bank=? WHERE id=?');

// Welcome
const getWelcome = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?');
const setWelcome = db.prepare(`INSERT INTO welcome_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING`);
const updateWelcome = db.prepare(`UPDATE welcome_settings SET welcome_channel=?, goodbye_channel=?, welcome_message=?, goodbye_message=?, welcome_role=? WHERE guild_id=?`);

// Starboard
const getStarboard = db.prepare('SELECT * FROM starboard WHERE guild_id = ?');
const setStarboard = db.prepare(`
  INSERT INTO starboard (guild_id, channel_id, threshold) VALUES (?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET channel_id=excluded.channel_id, threshold=excluded.threshold
`);
const getStarPost = db.prepare('SELECT * FROM starboard_posts WHERE message_id = ?');
const setStarPost = db.prepare(`INSERT INTO starboard_posts (message_id, star_message_id, star_count) VALUES (?, ?, ?) ON CONFLICT(message_id) DO UPDATE SET star_count=excluded.star_count, star_message_id=excluded.star_message_id`);

// Automod
const getAutomod = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?');
const setAutomod = db.prepare(`INSERT INTO automod_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING`);
const updateAutomod = db.prepare(`UPDATE automod_settings SET filter_spam=?, filter_links=?, filter_words=?, banned_words=?, log_channel=? WHERE guild_id=?`);

// Tickets
const getTicketSettings = db.prepare('SELECT * FROM ticket_settings WHERE guild_id = ?');
const setTicketSettings = db.prepare(`INSERT INTO ticket_settings (guild_id, category_id, log_channel, support_role) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET category_id=excluded.category_id, log_channel=excluded.log_channel, support_role=excluded.support_role`);
const createTicket = db.prepare('INSERT INTO tickets (guild_id, user_id, channel_id) VALUES (?, ?, ?)');
const getTicket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?');
const closeTicket = db.prepare('UPDATE tickets SET status=? WHERE channel_id=?');

// Giveaways
const createGiveaway = db.prepare('INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
const getGiveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const endGiveaway = db.prepare('UPDATE giveaways SET ended=1 WHERE id=?');
const enterGiveaway = db.prepare(`INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)`);
const getGiveawayEntries = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?');
const getActiveGiveaways = db.prepare('SELECT * FROM giveaways WHERE ended = 0');

// AFK
const getAfk = db.prepare('SELECT * FROM afk WHERE user_id = ?');
const setAfk = db.prepare(`INSERT INTO afk (user_id, reason) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason, set_at=datetime('now')`);
const clearAfk = db.prepare('DELETE FROM afk WHERE user_id = ?');

// Heists
const createHeist = db.prepare('INSERT INTO heists (guild_id, host_id, message_id, wager) VALUES (?, ?, ?, ?)');
const getHeist = db.prepare('SELECT * FROM heists WHERE message_id = ?');
const getHeistById = db.prepare('SELECT * FROM heists WHERE id = ?');
const updateHeist = db.prepare('UPDATE heists SET status=? WHERE id=?');
const getHeistMembers = db.prepare('SELECT * FROM heist_members WHERE heist_id = ?');
const addHeistMember = db.prepare('INSERT OR IGNORE INTO heist_members (heist_id, user_id) VALUES (?, ?)');
const updateHeistMember = db.prepare('UPDATE heist_members SET role=?, caught=? WHERE heist_id=? AND user_id=?');
const getActiveHeist = db.prepare("SELECT * FROM heists WHERE guild_id=? AND status='recruiting'");

// Gambling
const getGamblingStats = db.prepare('SELECT * FROM gambling_stats WHERE user_id = ?');
const updateGamblingStats = db.prepare(`
  INSERT INTO gambling_stats (user_id, total_won, total_lost, games) VALUES (?, ?, ?, 1)
  ON CONFLICT(user_id) DO UPDATE SET
    total_won  = total_won  + excluded.total_won,
    total_lost = total_lost + excluded.total_lost,
    games      = games + 1
`);

// Trades
const createTrade = db.prepare('INSERT INTO trades (sender_id, receiver_id, offer_item, request_item, offer_yen) VALUES (?, ?, ?, ?, ?)');
const getTrade = db.prepare('SELECT * FROM trades WHERE id = ?');
const updateTrade = db.prepare('UPDATE trades SET status=? WHERE id=?');
const getPendingTrades = db.prepare("SELECT * FROM trades WHERE receiver_id=? AND status='pending'");

// Raids
const createRaid = db.prepare('INSERT INTO raids (guild_id, boss_name, boss_hp, boss_max_hp) VALUES (?, ?, ?, ?)');
const getActiveRaid = db.prepare("SELECT * FROM raids WHERE guild_id=? AND status='active'");
const updateRaidHp = db.prepare('UPDATE raids SET boss_hp=?, status=? WHERE id=?');
const addRaidDamage = db.prepare(`INSERT INTO raid_participants (raid_id, user_id, damage) VALUES (?, ?, ?) ON CONFLICT(raid_id, user_id) DO UPDATE SET damage=damage+excluded.damage`);
const getRaidParticipants = db.prepare('SELECT * FROM raid_participants WHERE raid_id=? ORDER BY damage DESC');

module.exports = {
  db,
  getPlayer, createPlayer, updatePlayer,
  getInventory, addItem, removeItem,
  addModLog, getModLogs,
  getCommandSettings, setCommandEnabled, isCommandEnabled,
  getEquipped, setEquipped,
  getDaily, setDaily,
  getFarm, setFarm,
  getWarns, addWarn,
  getRoleReward, addRoleReward,
  getBank, setBank, updateBank,
  getRobCooldown, setRobCooldown,
  getLotteryEntries, addLotteryEntry, getAllLottery, clearLottery, getJackpot, setJackpot,
  getPets, getPet, addPet, updatePet,
  getQuests, addQuest, updateQuest, claimQuest,
  getAchievements, addAchievement,
  getRpgGuild, getRpgGuildByName, getRpgGuildMember, createRpgGuild, joinRpgGuild, updateGuildBank,
  getWelcome, setWelcome, updateWelcome,
  getStarboard, setStarboard, getStarPost, setStarPost,
  getAutomod, setAutomod, updateAutomod,
  getTicketSettings, setTicketSettings, createTicket, getTicket, closeTicket,
  createGiveaway, getGiveaway, endGiveaway, enterGiveaway, getGiveawayEntries, getActiveGiveaways,
  getAfk, setAfk, clearAfk,
  createHeist, getHeist, getHeistById, updateHeist,
  getHeistMembers, addHeistMember, updateHeistMember, getActiveHeist,
  getGamblingStats, updateGamblingStats,
  createTrade, getTrade, updateTrade, getPendingTrades,
  createRaid, getActiveRaid, updateRaidHp, addRaidDamage, getRaidParticipants,
};