const XP_PER_LEVEL = 100;

function xpToNextLevel(level) {
    return level * XP_PER_LEVEL;
}

function checkLevelUp(player) {
    const needed = xpToNextLevel(player.level);
    if (player.xp >= needed) {
        return {
            leveled: true,
            newLevel: player.level + 1,
            newXp: player.xp - needed,
            newMaxHp: player.max_hp + 10,
            newAttack: player.attack + 2,
            newDefense: player.defense + 1,
        };
    }
    return { leveled: false };
}

function rollDungeon(player) {
    const enemies = [
        { name: 'Goblin', hp: 30, attack: 8, xp: 25, yen: 10 },
        { name: 'Orc', hp: 60, attack: 14, xp: 50, yen: 25 },
        { name: 'Skeleton', hp: 40, attack: 10, xp: 35, yen: 15 },
        { name: 'Dragon', hp: 150, attack: 30, xp: 150, yen: 100 },
        { name: 'Devil', hp: 200, attack: 60, xp: 300, yen: 200 },
    ];
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];

    let playerHp = player.hp;
    let enemyHp = enemy.hp;
    let rounds = 0;

    while (playerHp > 0 && enemyHp > 0 && rounds < 20) {
        const playerDmg = Math.max(1, player.attack - Math.floor(Math.random() * 4));
        const enemyDmg = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 4));
        enemyHp -= playerDmg;
        playerHp -= enemyDmg;
        rounds++;
    }

    const won = enemyHp <= 0;
    return {
        enemy,
        won,
        remainingHp: Math.max(0, playerHp),
        xpGained: won ? enemy.xp : Math.floor(enemy.xp * 0.1),
        yenGained: won ? enemy.yen : 0,
        rounds,
    };
}

const SHOP_ITEMS = [
    { name: 'Iron Sword', type: 'weapon', cost: 80, stat: 'attack', bonus: 5 },
    { name: 'Steel Shield', type: 'armor', cost: 60, stat: 'defense', bonus: 4 },
    { name: 'Health Potion', type: 'potion', cost: 30, stat: 'hp', bonus: 40 },
    { name: 'Dragon Blade', type: 'weapon', cost: 300, stat: 'attack', bonus: 20 },
];

module.exports = { checkLevelUp, rollDungeon, SHOP_ITEMS, xpToNextLevel };