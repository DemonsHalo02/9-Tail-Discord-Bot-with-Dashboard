const API = '/api';
let API_KEY = 'yourpassword';
let currentPlayerId = null;
let autoRefreshInterval = null;
let levelChart = null, modChart = null, gamblingChart = null, guildChart = null;
let notifQueue = [];

// ── Auth ──────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadAll();
  startStatusPolling();
}
document.getElementById('login-btn').addEventListener('click', async () => {
  const key = document.getElementById('key-input').value.trim();
  if (!key) return;
  const res = await fetch(`${API}/stats`, { headers: { 'x-api-key': key } });
  if (res.ok) { API_KEY = key; showApp(); }
  else document.getElementById('login-error').style.display = 'block';
});
document.getElementById('key-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});
function h() { return { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }; }

// ── Theme ─────────────────────────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
const saved = localStorage.getItem('theme') || 'dark';
document.body.dataset.theme = saved;
themeBtn.textContent = saved === 'dark' ? '☀️' : '🌙';
themeBtn.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  localStorage.setItem('theme', next);
  themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ── Notifications ─────────────────────────────────────────────────────
function showNotif(msg, type = 'info') {
  const banner = document.getElementById('notification-banner');
  banner.textContent = msg;
  banner.className = `notif-banner notif-${type}`;
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, 5000);
}

// ── Tabs ──────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'rpg') { loadRpgPanels(); }
    if (tab.dataset.tab === 'economy') { loadEconomyPanels(); }
    if (tab.dataset.tab === 'system') { loadSystemPanels(); }
  });
});

// ── Auto-refresh ──────────────────────────────────────────────────────
document.getElementById('auto-refresh').addEventListener('change', e => {
  if (e.target.checked) autoRefreshInterval = setInterval(loadAll, 15000);
  else clearInterval(autoRefreshInterval);
});
document.getElementById('refresh-btn').addEventListener('click', loadAll);

// ── Load everything ───────────────────────────────────────────────────
function loadAll() {
  loadStats();
  loadLeaderboard();
  loadActivity();
  loadCommands();
  loadCharts();
  loadEvent();
}

// ── Stats ─────────────────────────────────────────────────────────────
async function loadStats() {
  const data = await fetch(`${API}/stats`, { headers: h() }).then(r => r.json());
  document.getElementById('stat-players').textContent = data.totalPlayers;
  document.getElementById('stat-bans').textContent = data.totalBans;
  document.getElementById('stat-warns').textContent = data.totalWarns;
  document.getElementById('stat-updated').textContent = new Date().toLocaleTimeString();
}

// ── Seasonal event banner ─────────────────────────────────────────────
async function loadEvent() {
  const event = await fetch(`${API}/event`, { headers: h() }).then(r => r.json());
  const banner = document.getElementById('event-banner');
  if (event.name) {
    banner.style.display = 'block';
    banner.innerHTML = `
      <span style="font-size:20px;">🎉</span>
      <div>
        <strong>${event.name}</strong> is active!
        &nbsp;⚡ ${event.xpMultiplier}x XP &nbsp;💴 ${event.yenMultiplier}x Yen
      </div>
    `;
    showNotif(`🎉 ${event.name} is active! Bonus XP and Yen for all players!`, 'success');
  } else {
    banner.style.display = 'none';
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────
async function loadLeaderboard() {
  const players = await fetch(`${API}/leaderboard`, { headers: h() }).then(r => r.json());
  document.getElementById('leaderboard-body').innerHTML = players.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.username}</td>
      <td>⭐ ${p.level}</td>
      <td>${p.xp}</td>
      <td>💴 ${p.yen}</td>
    </tr>`).join('');
}

// ── Charts ────────────────────────────────────────────────────────────
async function loadCharts() {
  const isDark = document.body.dataset.theme === 'dark';
  const textColor = isDark ? '#e8e6f0' : '#1a1a24';

  const [levels, modactions, gambling, guilds] = await Promise.all([
    fetch(`${API}/charts/levels`, { headers: h() }).then(r => r.json()),
    fetch(`${API}/charts/modactions`, { headers: h() }).then(r => r.json()),
    fetch(`${API}/gambling/leaderboard`, { headers: h() }).then(r => r.json()),
    fetch(`${API}/guilds`, { headers: h() }).then(r => r.json()),
  ]);

  if (levelChart) levelChart.destroy();
  levelChart = new Chart(document.getElementById('chart-levels'), {
    type: 'bar',
    data: {
      labels: levels.map(r => `Lv ${r.level}`),
      datasets: [{
        label: 'Players', data: levels.map(r => r.count),
        backgroundColor: '#7c4dff99', borderColor: '#7c4dff', borderWidth: 1
      }]
    },
    options: {
      plugins: { legend: { labels: { color: textColor } } },
      scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
    }
  });

  if (modChart) modChart.destroy();
  modChart = new Chart(document.getElementById('chart-modactions'), {
    type: 'doughnut',
    data: {
      labels: modactions.map(r => r.action),
      datasets: [{
        data: modactions.map(r => r.count),
        backgroundColor: ['#e5393599', '#ffb30099', '#00e67699']
      }]
    },
    options: { plugins: { legend: { labels: { color: textColor } } } }
  });

  if (gamblingChart) gamblingChart.destroy();
  const top5 = gambling.slice(0, 5);
  gamblingChart = new Chart(document.getElementById('chart-gambling'), {
    type: 'bar',
    data: {
      labels: top5.map(r => r.username),
      datasets: [
        { label: 'Won', data: top5.map(r => r.total_won), backgroundColor: '#00e67699' },
        { label: 'Lost', data: top5.map(r => r.total_lost), backgroundColor: '#e5393599' },
      ]
    },
    options: {
      plugins: { legend: { labels: { color: textColor } } },
      scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
    }
  });

  if (guildChart) guildChart.destroy();
  const top5g = guilds.slice(0, 5);
  guildChart = new Chart(document.getElementById('chart-guilds'), {
    type: 'horizontalBar',
    type: 'bar',
    data: {
      labels: top5g.map(g => g.name),
      datasets: [{
        label: 'Bank (💴)', data: top5g.map(g => g.bank),
        backgroundColor: '#ffd70099', borderColor: '#ffd700', borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { labels: { color: textColor } } },
      scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
    }
  });
}

// ── RPG panels ────────────────────────────────────────────────────────
async function loadRpgPanels() {
  loadGuilds();
  loadPets();
  loadQuests();
}

document.getElementById('raid-load-btn').addEventListener('click', async () => {
  const guildId = document.getElementById('raid-guild-id').value.trim();
  if (!guildId) return;
  const raid = await fetch(`${API}/raid/${guildId}`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('raid-panel');
  if (!raid) {
    panel.innerHTML = '<p class="muted">No active raid boss right now.</p>';
    return;
  }
  const pct = Math.round((raid.boss_hp / raid.boss_max_hp) * 100);
  const rows = raid.participants.map((p, i) => `
    <tr><td>${i + 1}</td><td>${p.username ?? p.user_id}</td><td>⚔️ ${p.damage.toLocaleString()}</td></tr>
  `).join('');
  panel.innerHTML = `
    <div style="margin-bottom:12px;">
      <p style="font-weight:500;font-size:15px;">${raid.boss_name}</p>
      <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${pct}%"></div></div>
      <p class="muted" style="margin-top:4px;">❤️ ${raid.boss_hp.toLocaleString()} / ${raid.boss_max_hp.toLocaleString()} (${pct}%)</p>
    </div>
    <table>
      <thead><tr><th>#</th><th>Player</th><th>Damage</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
});

async function loadGuilds() {
  const guilds = await fetch(`${API}/guilds`, { headers: h() }).then(r => r.json());
  document.getElementById('guilds-body').innerHTML = guilds.map(g => `
    <tr>
      <td><strong>${g.name}</strong></td>
      <td><@${g.owner_id}></td>
      <td>${g.members.length}</td>
      <td>💴 ${g.bank.toLocaleString()}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">No guilds yet</td></tr>';
}

async function loadPets() {
  const pets = await fetch(`${API}/pets`, { headers: h() }).then(r => r.json());
  document.getElementById('pets-body').innerHTML = pets.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.type}</td>
      <td>${p.username ?? p.user_id}</td>
      <td>⭐ ${p.level}</td>
      <td>${hungerBar(p.hunger)}</td>
      <td>${hungerBar(p.happiness)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">No pets yet</td></tr>';
}

function hungerBar(val) {
  const color = val > 60 ? '#00e676' : val > 30 ? '#ffb300' : '#e53935';
  return `<div style="background:var(--border);border-radius:4px;height:8px;width:60px;overflow:hidden;">
    <div style="width:${val}%;height:100%;background:${color};border-radius:4px;"></div>
  </div>`;
}

async function loadQuests() {
  const quests = await fetch(`${API}/quests`, { headers: h() }).then(r => r.json());
  document.getElementById('quests-body').innerHTML = quests.map(q => {
    const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
    const status = q.claimed ? '✅ Claimed' : q.completed ? '🎁 Complete' : `${q.progress}/${q.goal}`;
    return `<tr>
      <td>${q.username ?? q.user_id}</td>
      <td>${q.quest_type}</td>
      <td><div style="background:var(--border);border-radius:4px;height:8px;width:80px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;"></div>
      </div></td>
      <td>${status}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" class="empty">No active quests</td></tr>';
}

// ── Economy panels ────────────────────────────────────────────────────
async function loadEconomyPanels() {
  loadLottery();
  loadGamblingLeaderboard();
  loadTrades();
}

async function loadLottery() {
  const data = await fetch(`${API}/lottery`, { headers: h() }).then(r => r.json());
  const rows = data.entries.map(e => `
    <tr>
      <td>${e.username ?? e.user_id}</td>
      <td>${e.tickets}</td>
      <td>${((e.tickets / data.totalTickets) * 100).toFixed(1)}%</td>
    </tr>`).join('');
  document.getElementById('lottery-panel').innerHTML = `
    <div class="stat-grid" style="margin-bottom:1rem;">
      <div class="stat-card"><span>💴 ${data.jackpot.toLocaleString()}</span><label>Jackpot</label></div>
      <div class="stat-card"><span>${data.totalTickets}</span><label>Total tickets</label></div>
      <div class="stat-card"><span>${data.entries.length}</span><label>Participants</label></div>
    </div>
    ${data.entries.length ? `<table>
      <thead><tr><th>Player</th><th>Tickets</th><th>Odds</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<p class="muted">No tickets sold yet.</p>'}
  `;
}

document.getElementById('lottery-reset-btn').addEventListener('click', async () => {
  if (!confirm('Reset the lottery? This clears all tickets and the jackpot.')) return;
  await fetch(`${API}/lottery/reset`, { method: 'DELETE', headers: h() });
  showNotif('Lottery reset!', 'info');
  loadLottery();
});

async function loadGamblingLeaderboard() {
  const rows = await fetch(`${API}/gambling/leaderboard`, { headers: h() }).then(r => r.json());
  document.getElementById('gambling-body').innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.username ?? r.user_id}</td>
      <td style="color:var(--success)">💴 ${r.total_won.toLocaleString()}</td>
      <td style="color:var(--danger)">💴 ${r.total_lost.toLocaleString()}</td>
      <td>${r.games}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">No gambling data yet</td></tr>';
}

async function loadTrades() {
  const trades = await fetch(`${API}/trades`, { headers: h() }).then(r => r.json());
  document.getElementById('trades-body').innerHTML = trades.map(t => `
    <tr>
      <td>${t.sender_name ?? t.sender_id}</td>
      <td>${t.receiver_name ?? t.receiver_id}</td>
      <td>${t.offer_item_name ?? '—'}</td>
      <td>${t.request_item_name ?? '—'}</td>
      <td>${t.offer_yen > 0 ? `💴 ${t.offer_yen}` : '—'}</td>
      <td class="status-${t.status}">${t.status.toUpperCase()}</td>
      <td>${new Date(t.created_at).toLocaleString()}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">No trades yet</td></tr>';
}

// ── System panels ─────────────────────────────────────────────────────
async function loadSystemPanels() {
  loadSystemStatus();
  loadErrorLog();
  loadBackups();
  loadCooldowns();
  loadActivity();
}

async function loadSystemStatus() {
  const data = await fetch(`${API}/system/status`, { headers: h() }).then(r => r.json());
  const hrs = Math.floor(data.uptime / 3600);
  const mins = Math.floor((data.uptime % 3600) / 60);
  document.getElementById('system-status-panel').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><span style="color:var(--success)">●</span><label>API</label></div>
      <div class="stat-card"><span>${hrs}h ${mins}m</span><label>Uptime</label></div>
      <div class="stat-card"><span>${data.memory} MB</span><label>Memory</label></div>
    </div>
    <p class="muted" style="margin-top:8px;font-size:12px;">Last checked: ${new Date(data.timestamp).toLocaleTimeString()}</p>
  `;
}

async function loadErrorLog() {
  const logs = await fetch(`${API}/errorlogs`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('error-log-panel');
  if (!logs.length) { panel.innerHTML = '<p class="muted">No errors logged.</p>'; return; }
  panel.innerHTML = logs.map(l => `
    <div class="log-entry log-${l.type}">
      <span class="log-time">${new Date(l.timestamp).toLocaleString()}</span>
      <span class="log-title">${l.type === 'error' ? `❌ /${l.command}` : `ℹ️ ${l.title}`}</span>
      <span class="log-msg">${l.message ?? l.description ?? ''}</span>
    </div>`).join('');
}

document.getElementById('clear-errors-btn').addEventListener('click', async () => {
  await fetch(`${API}/errorlogs`, { method: 'DELETE', headers: h() });
  showNotif('Error log cleared.', 'info');
  loadErrorLog();
});

async function loadBackups() {
  const files = await fetch(`${API}/backups`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('backups-panel');
  if (!files.length) { panel.innerHTML = '<p class="muted">No backups yet.</p>'; return; }
  panel.innerHTML = files.map(f => `
    <div class="backup-row">
      <span class="backup-name">💾 ${f.name}</span>
      <span class="backup-size muted">${(f.size / 1024).toFixed(1)} KB</span>
      <span class="backup-date muted">${new Date(f.created).toLocaleString()}</span>
      <a href="${API}/backups/download/${f.name}?key=${API_KEY}" class="btn-download" download>⬇ Download</a>
    </div>`).join('');
}

document.getElementById('trigger-backup-btn').addEventListener('click', async () => {
  const res = await fetch(`${API}/backups/trigger`, { method: 'POST', headers: h() });
  if (res.ok) { showNotif('✅ Backup created!', 'success'); loadBackups(); }
  else showNotif('❌ Backup failed.', 'error');
});

async function loadCooldowns() {
  const cds = await fetch(`${API}/cooldowns`, { headers: h() }).then(r => r.json());
  document.getElementById('cooldowns-body').innerHTML = cds.length
    ? cds.map(c => `
        <tr>
          <td><@${c.userId}></td>
          <td>/${c.command}</td>
          <td>${c.remaining}s</td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="empty">No active cooldowns</td></tr>';
}

document.getElementById('refresh-cooldowns-btn').addEventListener('click', loadCooldowns);

async function loadActivity() {
  const logs = await fetch(`${API}/activity`, { headers: h() }).then(r => r.json());
  document.getElementById('activity-body').innerHTML = logs.map(l => `
    <tr>
      <td class="action-${l.action}">${l.action.toUpperCase()}</td>
      <td>${l.target_id}</td>
      <td>${l.mod_id}</td>
      <td>${l.reason}</td>
      <td>${new Date(l.created_at).toLocaleString()}</td>
    </tr>`).join('');
}

// ── Status polling ────────────────────────────────────────────────────
function startStatusPolling() {
  setInterval(async () => {
    try {
      const res = await fetch(`${API}/system/status`, { headers: h() });
      const dot = document.getElementById('status-dot');
      dot.className = res.ok ? 'status-dot status-online' : 'status-dot status-offline';
    } catch {
      document.getElementById('status-dot').className = 'status-dot status-offline';
    }
  }, 30_000);
}

// ── Mod logs ──────────────────────────────────────────────────────────
document.getElementById('load-logs').addEventListener('click', async () => {
  const guildId = document.getElementById('guild-input').value.trim();
  if (!guildId) return;
  const logs = await fetch(`${API}/modlogs/${guildId}`, { headers: h() }).then(r => r.json());
  document.getElementById('modlogs-body').innerHTML = logs.map(l => `
    <tr>
      <td class="action-${l.action}">${l.action.toUpperCase()}</td>
      <td>${l.target_id}</td>
      <td>${l.mod_id}</td>
      <td>${l.reason}</td>
      <td>${new Date(l.created_at).toLocaleString()}</td>
    </tr>`).join('');
});

// ── Commands ──────────────────────────────────────────────────────────
async function loadCommands() {
  const commands = await fetch(`${API}/commands`, { headers: h() }).then(r => r.json());
  document.getElementById('commands-list').innerHTML = commands.map(cmd => `
    <div class="command-card">
      <div>
        <span class="command-name">/${cmd.name}</span>
        <span class="command-folder">${cmd.folder}</span>
      </div>
      <label class="switch">
        <input type="checkbox" ${cmd.enabled ? 'checked' : ''}
          onchange="toggleCommand('${cmd.name}', this)">
        <span class="slider"></span>
      </label>
      <span class="command-status ${cmd.enabled ? 'status-on' : 'status-off'}">
        ${cmd.enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>`).join('');
}

async function toggleCommand(name, checkbox) {
  const res = await fetch(`${API}/commands/${name}/toggle`, { method: 'POST', headers: h() });
  const data = await res.json();
  const card = checkbox.closest('.command-card');
  const status = card.querySelector('.command-status');
  status.textContent = data.enabled ? 'Enabled' : 'Disabled';
  status.className = `command-status ${data.enabled ? 'status-on' : 'status-off'}`;
}

// ── Player search ─────────────────────────────────────────────────────
document.getElementById('player-search-btn').addEventListener('click', searchPlayer);
document.getElementById('player-search').addEventListener('keydown', e => { if (e.key === 'Enter') searchPlayer(); });

async function searchPlayer() {
  const id = document.getElementById('player-search').value.trim();
  if (!id) return;
  const res = await fetch(`${API}/player/${id}`, { headers: h() });
  if (!res.ok) return showNotif('Player not found.', 'error');
  const p = await res.json();
  currentPlayerId = id;
  renderPlayer(p);
}

async function renderPlayer(p) {
  document.getElementById('player-result').style.display = 'block';
  const avatarEl = document.getElementById('player-avatar');
  try {
    const discord = await fetch(`${API}/discord/user/${p.user_id}`, { headers: h() }).then(r => r.json());
    avatarEl.innerHTML = discord.avatar
      ? `<img src="${discord.avatar}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`
      : p.username?.[0]?.toUpperCase() ?? '?';
  } catch { avatarEl.textContent = p.username?.[0]?.toUpperCase() ?? '?'; }

  document.getElementById('player-name').textContent = p.username;
  document.getElementById('player-id').textContent = p.user_id;
  document.getElementById('player-stats').innerHTML = `
    <div class="stat-pill">Lv ${p.level}</div>
    <div class="stat-pill">XP ${p.xp}</div>
    <div class="stat-pill">HP ${p.hp}/${p.max_hp}</div>
    <div class="stat-pill">💴 ${p.yen}</div>
    <div class="stat-pill">⚔️ ${p.attack}</div>
    <div class="stat-pill">🛡️ ${p.defense}</div>
  `;
  document.getElementById('edit-yen').value = p.yen;
  document.getElementById('edit-level').value = p.level;
  document.getElementById('edit-xp').value = p.xp;
  document.getElementById('edit-hp').value = p.hp;
  document.getElementById('edit-attack').value = p.attack;
  document.getElementById('edit-defense').value = p.defense;
  renderInventory(p.inventory ?? []);
}

function renderInventory(items) {
  document.getElementById('inventory-body').innerHTML = items.length
    ? items.map(i => `<tr>
        <td>${i.item_name}</td><td>${i.item_type}</td><td>${i.value}</td>
        <td><button class="btn-sm btn-danger" onclick="deleteItem(${i.id})">Remove</button></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">No items</td></tr>';
}

document.getElementById('save-player').addEventListener('click', async () => {
  if (!currentPlayerId) return;
  await fetch(`${API}/player/${currentPlayerId}`, {
    method: 'PATCH', headers: h(),
    body: JSON.stringify({
      yen: +document.getElementById('edit-yen').value,
      level: +document.getElementById('edit-level').value,
      xp: +document.getElementById('edit-xp').value,
      hp: +document.getElementById('edit-hp').value,
      attack: +document.getElementById('edit-attack').value,
      defense: +document.getElementById('edit-defense').value,
    })
  });
  showNotif('Player saved!', 'success');
});

document.getElementById('reset-player').addEventListener('click', async () => {
  if (!currentPlayerId) return;
  if (!confirm('Reset this player to default stats?')) return;
  await fetch(`${API}/player/${currentPlayerId}/reset`, { method: 'POST', headers: h() });
  showNotif('Player reset!', 'info');
  searchPlayer();
});

document.getElementById('add-item-btn').addEventListener('click', async () => {
  if (!currentPlayerId) return;
  const name = document.getElementById('item-name').value.trim();
  const type = document.getElementById('item-type').value.trim();
  const value = +document.getElementById('item-value').value;
  if (!name || !type) return showNotif('Fill in item name and type.', 'error');
  await fetch(`${API}/items/${currentPlayerId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ item_name: name, item_type: type, value })
  });
  document.getElementById('item-name').value = '';
  document.getElementById('item-type').value = '';
  document.getElementById('item-value').value = '';
  searchPlayer();
});

async function deleteItem(itemId) {
  await fetch(`${API}/items/${itemId}`, { method: 'DELETE', headers: h() });
  searchPlayer();
}

// ── Shop manager ──────────────────────────────────────────────────────
let shopPlayerId = null;

document.getElementById('shop-search-btn').addEventListener('click', async () => {
  const id = document.getElementById('shop-player-id').value.trim();
  if (!id) return;
  shopPlayerId = id;
  const items = await fetch(`${API}/items/${id}`, { headers: h() }).then(r => r.json());
  renderShopInventory(items);
});

function renderShopInventory(items) {
  document.getElementById('shop-inventory-body').innerHTML = items.length
    ? items.map(i => `<tr>
        <td>${i.item_name}</td><td>${i.item_type}</td><td>${i.value}</td>
        <td><button class="btn-sm btn-danger" onclick="deleteShopItem(${i.id})">Remove</button></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">No items</td></tr>';
}

document.getElementById('shop-add-item').addEventListener('click', async () => {
  if (!shopPlayerId) return showNotif('Search a player first.', 'error');
  const name = document.getElementById('shop-item-name').value.trim();
  const type = document.getElementById('shop-item-type').value.trim();
  const value = +document.getElementById('shop-item-value').value;
  if (!name || !type) return showNotif('Fill in item name and type.', 'error');
  await fetch(`${API}/items/${shopPlayerId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ item_name: name, item_type: type, value })
  });
  document.getElementById('shop-search-btn').click();
});

async function deleteShopItem(itemId) {
  await fetch(`${API}/items/${itemId}`, { method: 'DELETE', headers: h() });
  document.getElementById('shop-search-btn').click();
}