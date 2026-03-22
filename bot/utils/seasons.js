const { logInfo } = require('./logger');
const cron = require('node-cron');

const EVENTS = [
    { name: 'Double XP Weekend', xpMultiplier: 2.0, yenMultiplier: 1.0, start: { month: 0, day: 1 }, end: { month: 0, day: 3 } },
    { name: 'Valentine\'s Bonus', xpMultiplier: 1.5, yenMultiplier: 1.5, start: { month: 1, day: 14 }, end: { month: 1, day: 15 } },
    { name: 'Spring Festival', xpMultiplier: 1.5, yenMultiplier: 2.0, start: { month: 2, day: 20 }, end: { month: 2, day: 23 } },
    { name: 'Summer Bonanza', xpMultiplier: 2.0, yenMultiplier: 2.0, start: { month: 5, day: 21 }, end: { month: 5, day: 28 } },
    { name: 'Halloween Horrors', xpMultiplier: 3.0, yenMultiplier: 1.5, start: { month: 9, day: 31 }, end: { month: 9, day: 31 } },
    { name: 'Christmas Cheer', xpMultiplier: 2.5, yenMultiplier: 2.5, start: { month: 11, day: 24 }, end: { month: 11, day: 26 } },
];

function getActiveEvent() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    return EVENTS.find(e => {
        if (month < e.start.month || month > e.end.month) return false;
        if (month === e.start.month && day < e.start.day) return false;
        if (month === e.end.month && day > e.end.day) return false;
        return true;
    }) ?? null;
}

function getXpMultiplier() { return getActiveEvent()?.xpMultiplier ?? 1.0; }
function getYenMultiplier() { return getActiveEvent()?.yenMultiplier ?? 1.0; }

module.exports = { getActiveEvent, getXpMultiplier, getYenMultiplier };