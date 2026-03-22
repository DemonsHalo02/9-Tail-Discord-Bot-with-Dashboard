const Database = require('better-sqlite3');
const db = new Database('./database.db');

// Add yen column copying values from gold
db.exec(`ALTER TABLE players ADD COLUMN yen INTEGER DEFAULT 50;`);
db.exec(`UPDATE players SET yen = gold;`);

console.log('Migration done! yen column added.');
db.close();