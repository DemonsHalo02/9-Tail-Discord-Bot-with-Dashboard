const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { logInfo } = require('./logger');

const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

function init() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

    // Run backup every 6 hours
    cron.schedule('0 */6 * * *', () => {
        runBackup();
    });

    console.log('Backup system initialized — runs every 6 hours');
}

function runBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dest = path.join(BACKUP_DIR, `database-${timestamp}.db`);
        fs.copyFileSync(DB_PATH, dest);

        // Keep only last 10 backups
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
            files.slice(10).forEach(f => {
                fs.unlinkSync(path.join(BACKUP_DIR, f.name));
            });
        }

        logInfo('Database backed up', `Saved to \`${dest}\``);
        console.log(`Database backed up to ${dest}`);
    } catch (err) {
        console.error('Backup failed:', err);
    }
}

module.exports = { init, runBackup };