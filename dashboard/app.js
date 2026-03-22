const API = '/api';
let API_KEY = 'yourpassword';
let currentPlayerId = null;
let autoRefreshInterval = null;
let levelChart = null, modChart = null, gamblingChart = null, guildChart = null;
let shopPlayerId = null;

// ── Toast system ──────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 250);
  }, duration);
}

// ── Confirm modal ─────────────────────────────────────────────────────
function confirm(msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-overlay').classList.add('open');
    const yes = document.getElementById('confirm-yes');
    const no = document.getElementById('confirm-no');
    function cleanup(val) {
      document.getElementById('confirm-overlay').classList.remove('open');
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      resolve(val);
    }
    const onYes = () => cleanup(true);
    const onNo = () => cleanup(false);
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
  });
}

// ── Modal open/close ──────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── Hamburger / drawer ────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');

function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
  hamburger.classList.add('open');
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  hamburger.classList.remove('open');
}
hamburger.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
drawerOverlay.addEventListener('click', closeDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);

// ── Tab switching (desktop + drawer) ─────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab, .drawer-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(t => t.classList.add('active'));
  const section = document.getElementById(tabName);
  if (section) section.classList.add('active');
  closeDrawer();
  if (tabName === 'rpg') loadRpgPanels();
  if (tabName === 'economy') loadEconomyPanels();
  if (tabName === 'system') loadSystemPanels();
}

document.querySelectorAll('.tab, .drawer-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ── Swipe to switch tabs on mobile ───────────────────────────────────
const tabs = ['overview', 'leaderboard', 'players', 'rpg', 'economy', 'modlogs', 'system', 'commands', 'shop'];
let touchStartX = 0;
document.getElementById('main-content').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('main-content').addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 80) return;
  const current = tabs.indexOf(document.querySelector('.tab-content.active')?.id);
  if (diff > 0 && current < tabs.length - 1) switchTab(tabs[current + 1]);
  if (diff < 0 && current > 0) switchTab(tabs[current - 1]);
}, { passive: true });

// ── Auth ──────────────────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
  const key = document.getElementById('key-input').value.trim();
  if (!key) return;
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Checking...';
  btn.disabled = true;
  const res = await fetch(`${API}/stats`, { headers: { 'x-api-key': key } });
  if (res.ok) {
    API_KEY = key;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadAll();
    startStatusPolling();
  } else {
    document.getElementById('login-error').style.display = 'block';
    btn.textContent = 'Login';
    btn.disabled = false;
  }
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

// ── Skeleton helpers ──────────────────────────────────────────────────
function skeletonRows(tbody, cols, count = 5) {
  tbody.innerHTML = Array.from({ length: count }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      `<td><div class="skeleton-row" style="height:16px;border-radius:4px;"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

// ── Auto-refresh ──────────────────────────────────────────────────────
document.getElementById('auto-refresh').addEventListener('change', e => {
  if (e.target.checked) autoRefreshInterval = setInterval(loadAll, 15000);
  else clearInterval(autoRefreshInterval);
});
document.getElementById('refresh-btn').addEventListener('click', () => {
  loadAll();
  toast('Refreshed!', 'info', 2000);
});

// ── Load all ──────────────────────────────────────────────────────────
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
  document.querySelectorAll('.stat-card span').forEach(el => el.classList.remove('skeleton'));
}

// ── Event banner ──────────────────────────────────────────────────────
async function loadEvent() {
  const event = await fetch(`${API}/event`, { headers: h() }).then(r => r.json());
  const banner = document.getElementById('event-banner');
  if (event.name) {
    banner.style.display = 'flex';
    banner.innerHTML = `<span style="font-size:20px;">🎉</span>
      <div><strong>${event.name}</strong> is active! &nbsp;⚡ ${event.xpMultiplier}x XP &nbsp;💴 ${event.yenMultiplier}x Yen</div>`;
  } else {
    banner.style.display = 'none';
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────
async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  skeletonRows(tbody, 5);
  const players = await fetch(`${API}/leaderboard`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = players.map((p, i) => `
    <tr>
      <td>${i + 1}</td><td>${p.username}</td>
      <td>⭐ ${p.level}</td><td>${p.xp}</td><td>💴 ${p.yen}</td>
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

  const opts = {
    plugins: { legend: { labels: { color: textColor } } },
    scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
  };

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
    options: opts,
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
    options: { plugins: { legend: { labels: { color: textColor } } } },
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
    options: opts,
  });

  if (guildChart) guildChart.destroy();
  const top5g = guilds.slice(0, 5);
  guildChart = new Chart(document.getElementById('chart-guilds'), {
    type: 'bar',
    data: {
      labels: top5g.map(g => g.name),
      datasets: [{
        label: 'Bank (💴)', data: top5g.map(g => g.bank),
        backgroundColor: '#ffd70099', borderColor: '#ffd700', borderWidth: 1
      }]
    },
    options: { ...opts, indexAxis: 'y' },
  });
}

// ── RPG panels ────────────────────────────────────────────────────────
async function loadRpgPanels() { loadGuilds(); loadPets(); loadQuests(); }

document.getElementById('raid-load-btn').addEventListener('click', async () => {
  const guildId = document.getElementById('raid-guild-id').value.trim();
  if (!guildId) return;
  const raid = await fetch(`${API}/raid/${guildId}`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('raid-panel');
  if (!raid) { panel.innerHTML = '<p class="muted">No active raid boss right now.</p>'; return; }
  const pct = Math.round((raid.boss_hp / raid.boss_max_hp) * 100);
  const rows = raid.participants.map((p, i) =>
    `<tr><td>${i + 1}</td><td>${p.username ?? p.user_id}</td><td>⚔️ ${p.damage.toLocaleString()}</td></tr>`
  ).join('');
  panel.innerHTML = `
    <p style="font-weight:500;margin-bottom:8px;">${raid.boss_name}</p>
    <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${pct}%"></div></div>
    <p class="muted" style="margin-top:4px;font-size:12px;">❤️ ${raid.boss_hp.toLocaleString()} / ${raid.boss_max_hp.toLocaleString()} (${pct}%)</p>
    <div class="table-scroll" style="margin-top:1rem;">
      <table><thead><tr><th>#</th><th>Player</th><th>Damage</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
});

async function loadGuilds() {
  const tbody = document.getElementById('guilds-body');
  skeletonRows(tbody, 4, 3);
  const guilds = await fetch(`${API}/guilds`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = guilds.map(g => `<tr>
    <td><strong>${g.name}</strong></td>
    <td>${g.owner_id}</td>
    <td>${g.members.length}</td>
    <td>💴 ${g.bank.toLocaleString()}</td>
  </tr>`).join('') || `<tr><td colspan="4" class="empty">No guilds yet</td></tr>`;
}

async function loadPets() {
  const tbody = document.getElementById('pets-body');
  skeletonRows(tbody, 6, 3);
  const pets = await fetch(`${API}/pets`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = pets.map(p => `<tr>
    <td><strong>${p.name}</strong></td><td>${p.type}</td>
    <td>${p.username ?? p.user_id}</td><td>⭐ ${p.level}</td>
    <td>${miniBar(p.hunger)}</td><td>${miniBar(p.happiness)}</td>
  </tr>`).join('') || `<tr><td colspan="6" class="empty">No pets yet</td></tr>`;
}

function miniBar(val) {
  const c = val > 60 ? '#00e676' : val > 30 ? '#ffb300' : '#e53935';
  return `<div style="background:var(--border);border-radius:4px;height:6px;width:48px;overflow:hidden;">
    <div style="width:${val}%;height:100%;background:${c};border-radius:4px;"></div></div>`;
}

async function loadQuests() {
  const tbody = document.getElementById('quests-body');
  skeletonRows(tbody, 4, 3);
  const quests = await fetch(`${API}/quests`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = quests.map(q => {
    const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
    const status = q.claimed ? '✅ Claimed' : q.completed ? '🎁 Complete' : `${q.progress}/${q.goal}`;
    return `<tr>
      <td>${q.username ?? q.user_id}</td><td>${q.quest_type}</td>
      <td><div style="background:var(--border);border-radius:4px;height:6px;width:60px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;"></div></div></td>
      <td>${status}</td></tr>`;
  }).join('') || `<tr><td colspan="4" class="empty">No active quests</td></tr>`;
}

// ── Economy panels ────────────────────────────────────────────────────
async function loadEconomyPanels() { loadLottery(); loadGamblingLeaderboard(); loadTrades(); }

async function loadLottery() {
  const data = await fetch(`${API}/lottery`, { headers: h() }).then(r => r.json());
  document.getElementById('lottery-panel').innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1rem;">
      <div class="stat-card"><span style="font-size:20px;">💴 ${data.jackpot.toLocaleString()}</span><label>Jackpot</label></div>
      <div class="stat-card"><span style="font-size:20px;">${data.totalTickets}</span><label>Tickets</label></div>
      <div class="stat-card"><span style="font-size:20px;">${data.entries.length}</span><label>Players</label></div>
    </div>
    ${data.entries.length ? `<div class="table-scroll"><table>
      <thead><tr><th>Player</th><th>Tickets</th><th>Odds</th></tr></thead>
      <tbody>${data.entries.map(e => `<tr>
        <td>${e.username ?? e.user_id}</td>
        <td>${e.tickets}</td>
        <td>${((e.tickets / data.totalTickets) * 100).toFixed(1)}%</td>
      </tr>`).join('')}</tbody></table></div>` : '<p class="muted">No tickets sold yet.</p>'}`;
}

document.getElementById('lottery-reset-btn').addEventListener('click', async () => {
  const ok = await confirm('Reset the lottery? This clears all tickets and the jackpot.');
  if (!ok) return;
  await fetch(`${API}/lottery/reset`, { method: 'DELETE', headers: h() });
  toast('Lottery reset!', 'info');
  loadLottery();
});

async function loadGamblingLeaderboard() {
  const tbody = document.getElementById('gambling-body');
  skeletonRows(tbody, 5, 5);
  const rows = await fetch(`${API}/gambling/leaderboard`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = rows.map((r, i) => `<tr>
    <td>${i + 1}</td><td>${r.username ?? r.user_id}</td>
    <td style="color:var(--success)">💴 ${r.total_won.toLocaleString()}</td>
    <td style="color:var(--danger)">💴 ${r.total_lost.toLocaleString()}</td>
    <td>${r.games}</td>
  </tr>`).join('') || `<tr><td colspan="5" class="empty">No data yet</td></tr>`;
}

async function loadTrades() {
  const tbody = document.getElementById('trades-body');
  skeletonRows(tbody, 7, 3);
  const trades = await fetch(`${API}/trades`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = trades.map(t => `<tr>
    <td>${t.sender_name ?? t.sender_id}</td>
    <td>${t.receiver_name ?? t.receiver_id}</td>
    <td>${t.offer_item_name ?? '—'}</td>
    <td>${t.request_item_name ?? '—'}</td>
    <td>${t.offer_yen > 0 ? `💴 ${t.offer_yen}` : '—'}</td>
    <td class="status-${t.status}">${t.status.toUpperCase()}</td>
    <td>${new Date(t.created_at).toLocaleString()}</td>
  </tr>`).join('') || `<tr><td colspan="7" class="empty">No trades yet</td></tr>`;
}

// ── System panels ─────────────────────────────────────────────────────
async function loadSystemPanels() {
  loadSystemStatus(); loadErrorLog(); loadBackups(); loadCooldowns(); loadActivity();
}

async function loadSystemStatus() {
  const data = await fetch(`${API}/system/status`, { headers: h() }).then(r => r.json());
  const hrs = Math.floor(data.uptime / 3600);
  const mins = Math.floor((data.uptime % 3600) / 60);
  document.getElementById('system-status-panel').innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-card"><span style="color:var(--success);font-size:20px;">●</span><label>API</label></div>
      <div class="stat-card"><span style="font-size:20px;">${hrs}h ${mins}m</span><label>Uptime</label></div>
      <div class="stat-card"><span style="font-size:20px;">${data.memory}MB</span><label>Memory</label></div>
    </div>
    <p class="muted" style="margin-top:8px;font-size:12px;">Last checked: ${new Date(data.timestamp).toLocaleTimeString()}</p>`;
}

async function loadErrorLog() {
  const logs = await fetch(`${API}/errorlogs`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('error-log-panel');
  panel.innerHTML = logs.length
    ? logs.map(l => `<div class="log-entry log-${l.type}">
        <span class="log-time">${new Date(l.timestamp).toLocaleString()}</span>
        <span class="log-title">${l.type === 'error' ? `❌ /${l.command}` : `ℹ️ ${l.title}`}</span>
        <span class="log-msg">${l.message ?? l.description ?? ''}</span>
      </div>`).join('')
    : '<p class="muted">No errors logged.</p>';
}

document.getElementById('clear-errors-btn').addEventListener('click', async () => {
  const ok = await confirm('Clear all error logs?');
  if (!ok) return;
  await fetch(`${API}/errorlogs`, { method: 'DELETE', headers: h() });
  toast('Error log cleared.', 'info');
  loadErrorLog();
});

async function loadBackups() {
  const files = await fetch(`${API}/backups`, { headers: h() }).then(r => r.json());
  const panel = document.getElementById('backups-panel');
  panel.innerHTML = files.length
    ? files.map(f => `<div class="backup-row">
        <span class="backup-name">💾 ${f.name}</span>
        <span class="muted" style="font-size:12px;">${(f.size / 1024).toFixed(1)} KB</span>
        <span class="muted" style="font-size:12px;">${new Date(f.created).toLocaleDateString()}</span>
        <a href="${API}/backups/download/${f.name}?key=${API_KEY}" class="btn-download" download>⬇ Download</a>
      </div>`).join('')
    : '<p class="muted">No backups yet.</p>';
}

document.getElementById('trigger-backup-btn').addEventListener('click', async () => {
  const res = await fetch(`${API}/backups/trigger`, { method: 'POST', headers: h() });
  if (res.ok) { toast('✅ Backup created!', 'success'); loadBackups(); }
  else toast('❌ Backup failed.', 'error');
});

async function loadCooldowns() {
  const tbody = document.getElementById('cooldowns-body');
  const cds = await fetch(`${API}/cooldowns`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = cds.length
    ? cds.map(c => `<tr><td>${c.userId}</td><td>/${c.command}</td><td>${c.remaining}s</td></tr>`).join('')
    : `<tr><td colspan="3" class="empty">No active cooldowns</td></tr>`;
}
document.getElementById('refresh-cooldowns-btn').addEventListener('click', loadCooldowns);

async function loadActivity() {
  const logs = await fetch(`${API}/activity`, { headers: h() }).then(r => r.json());
  const tbody = document.getElementById('activity-body');
  tbody.innerHTML = logs.map(l => `<tr>
    <td class="action-${l.action}">${l.action.toUpperCase()}</td>
    <td>${l.target_id}</td><td>${l.mod_id}</td>
    <td>${l.reason}</td>
    <td>${new Date(l.created_at).toLocaleString()}</td>
  </tr>`).join('');
}

// ── Status polling ────────────────────────────────────────────────────
function startStatusPolling() {
  setInterval(async () => {
    try {
      const res = await fetch(`${API}/system/status`, { headers: h() });
      document.getElementById('status-dot').className =
        res.ok ? 'status-dot status-online' : 'status-dot status-offline';
    } catch {
      document.getElementById('status-dot').className = 'status-dot status-offline';
    }
  }, 30_000);
}

// ── Mod logs ──────────────────────────────────────────────────────────
document.getElementById('load-logs').addEventListener('click', async () => {
  const guildId = document.getElementById('guild-input').value.trim();
  if (!guildId) return;
  const tbody = document.getElementById('modlogs-body');
  skeletonRows(tbody, 5, 3);
  const logs = await fetch(`${API}/modlogs/${guildId}`, { headers: h() }).then(r => r.json());
  tbody.innerHTML = logs.map(l => `<tr>
    <td class="action-${l.action}">${l.action.toUpperCase()}</td>
    <td>${l.target_id}</td><td>${l.mod_id}</td>
    <td>${l.reason}</td>
    <td>${new Date(l.created_at).toLocaleString()}</td>
  </tr>`).join('');
});

// ── Commands ──────────────────────────────────────────────────────────
async function loadCommands() {
  const commands = await fetch(`${API}/commands`, { headers: h() }).then(r => r.json());
  document.getElementById('commands-list').innerHTML = commands.map(cmd => `
    <div class="command-card">
      <div style="flex:1;">
        <span class="command-name">/${cmd.name}</span>
        <span class="command-folder">${cmd.folder}</span>
      </div>
      <label class="switch">
        <input type="checkbox" ${cmd.enabled ? 'checked' : ''}
          onchange="toggleCommand('${cmd.name}', this)">
        <span class="slider"></span>
      </label>
      <span class="command-status ${cmd.enabled ? 'status-on' : 'status-off'}">
        ${cmd.enabled ? 'On' : 'Off'}
      </span>
    </div>`).join('');
}

async function toggleCommand(name, checkbox) {
  const res = await fetch(`${API}/commands/${name}/toggle`, { method: 'POST', headers: h() });
  const data = await res.json();
  const card = checkbox.closest('.command-card');
  const status = card.querySelector('.command-status');
  status.textContent = data.enabled ? 'On' : 'Off';
  status.className = `command-status ${data.enabled ? 'status-on' : 'status-off'}`;
  toast(`/${name} ${data.enabled ? 'enabled' : 'disabled'}`, data.enabled ? 'success' : 'warning');
}

// ── Player search ─────────────────────────────────────────────────────
document.getElementById('player-search-btn').addEventListener('click', searchPlayer);
document.getElementById('player-search').addEventListener('keydown', e => { if (e.key === 'Enter') searchPlayer(); });

async function searchPlayer() {
  const id = document.getElementById('player-search').value.trim();
  if (!id) return;
  const res = await fetch(`${API}/player/${id}`, { headers: h() });
  if (!res.ok) { toast('Player not found.', 'error'); return; }
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
    <div class="stat-pill">🛡️ ${p.defense}</div>`;
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
        <td><button class="btn-sm btn-danger" onclick="deleteItem(${i.id})">✕</button></td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty">No items</td></tr>`;
}

// Edit player modal
document.getElementById('edit-player-btn').addEventListener('click', () => openModal('edit-modal'));
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
  closeModal('edit-modal');
  toast('Player saved!', 'success');
  searchPlayer();
});

document.getElementById('reset-player').addEventListener('click', async () => {
  if (!currentPlayerId) return;
  const ok = await confirm('Reset this player to default stats?');
  if (!ok) return;
  await fetch(`${API}/player/${currentPlayerId}/reset`, { method: 'POST', headers: h() });
  toast('Player reset!', 'info');
  searchPlayer();
});

// Add item modal
document.getElementById('add-item-open-btn').addEventListener('click', () => openModal('add-item-modal'));
document.getElementById('add-item-btn').addEventListener('click', async () => {
  if (!currentPlayerId) return;
  const name = document.getElementById('item-name').value.trim();
  const type = document.getElementById('item-type').value.trim();
  const value = +document.getElementById('item-value').value;
  if (!name || !type) { toast('Fill in item name and type.', 'error'); return; }
  await fetch(`${API}/items/${currentPlayerId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ item_name: name, item_type: type, value })
  });
  document.getElementById('item-name').value = '';
  document.getElementById('item-type').value = '';
  document.getElementById('item-value').value = '';
  closeModal('add-item-modal');
  toast('Item added!', 'success');
  searchPlayer();
});

async function deleteItem(itemId) {
  const ok = await confirm('Remove this item from the player?');
  if (!ok) return;
  await fetch(`${API}/items/${itemId}`, { method: 'DELETE', headers: h() });
  toast('Item removed.', 'info');
  searchPlayer();
}

// ── Shop manager ──────────────────────────────────────────────────────
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
        <td><button class="btn-sm btn-danger" onclick="deleteShopItem(${i.id})">✕</button></td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty">No items</td></tr>`;
}

document.getElementById('shop-add-open-btn').addEventListener('click', () => {
  if (!shopPlayerId) { toast('Search a player first.', 'error'); return; }
  openModal('shop-add-modal');
});

document.getElementById('shop-add-item').addEventListener('click', async () => {
  if (!shopPlayerId) return;
  const name = document.getElementById('shop-item-name').value.trim();
  const type = document.getElementById('shop-item-type').value.trim();
  const value = +document.getElementById('shop-item-value').value;
  if (!name || !type) { toast('Fill in item name and type.', 'error'); return; }
  await fetch(`${API}/items/${shopPlayerId}`, {
    method: 'POST', headers: h(),
    body: JSON.stringify({ item_name: name, item_type: type, value })
  });
  closeModal('shop-add-modal');
  toast('Item added!', 'success');
  document.getElementById('shop-search-btn').click();
});

async function deleteShopItem(itemId) {
  const ok = await confirm('Remove this item?');
  if (!ok) return;
  await fetch(`${API}/items/${itemId}`, { method: 'DELETE', headers: h() });
  toast('Item removed.', 'info');
  document.getElementById('shop-search-btn').click();
}
