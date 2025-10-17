// ==== GLOBAL STATE ====
let lastScanResults = [];
let lastScanTime = null;

// ==== RENDER HTML ====
function renderPicoAP() {
  return `
  <div>
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h2 style="margin:0">📡 PicoAP Suite</h2>
          <p class="small">Wi‑Fi tools: scan, client view, SSID management, access point control.</p>
        </div>
        <div>
          <button class="btn" onclick="triggerScan(this)">Scan Wi‑Fi</button>
        </div>
      </div>

      <div style="margin-top:12px" id="picoapSummary" class="small muted-small">
        Last scan: <span id="lastScanTime">never</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="top-tabs" id="picoTopTabs">
        <button class="active" data-tab="pineap" onclick="switchPicoTab(event)">PineAP</button>
        <button data-tab="clients" onclick="switchPicoTab(event)">Clients</button>
        <button data-tab="ssids" onclick="switchPicoTab(event)">SSIDs</button>
        <button data-tab="attack" onclick="switchPicoTab(event)">Attack</button>
        <button data-tab="ap" onclick="switchPicoTab(event)">Access Point</button>
      </div>

      <div id="picoTabContent">
        <!-- PineAP -->
        <div id="tab_pineap">
          <div class="grid">
            <div class="card">
              <h3 id="pine_total_ssids">SSIDs: —</h3>
              <p class="muted-small">Total unique SSIDs from last scan</p>
            </div>
            <div class="card">
              <h3 id="pine_connected_clients">Clients: —</h3>
              <p class="muted-small">Clients seen</p>
            </div>
            <div class="card">
              <h3 id="pine_uptime">Uptime: —</h3>
              <p class="muted-small">System uptime</p>
            </div>
          </div>

          <div style="margin-top:12px">
            <h4>Scanned APs</h4>
            <div id="pineRecent" class="card muted-small" style="max-height:200px;overflow:auto">
                <p>No APs scanned yet. Click <b>Scan Wi‑Fi</b>.</p>
            </div>
        </div>

        <!-- Clients -->
        <div id="tab_clients" style="display:none">
          <h4>Connected Clients</h4>
          <div id="clientsContainer" class="card">
            <p class="muted-small">Loading clients…</p>
          </div>
        </div>

        <!-- SSIDs -->
        <div id="tab_ssids" style="display:none">
          <h4>SSID Generator</h4>
          <div class="card">
            <p class="small">Create multiple APs with the same SSID. Backend must implement <code>/ssid/create</code>.</p>
            <form id="ssidForm" onsubmit="createSSIDs(event)">
              <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
                <label style="flex:1;min-width:200px">
                  <span class="muted-small">SSID Name:</span>
                  <input class="input" id="ssid_name" placeholder="Enter SSID (e.g., Pine32-Test)" required />
                </label>

                <label style="display:flex;align-items:center;gap:6px;color:var(--muted)">
                  <input type="radio" name="ssid_security" value="open" checked /> Open
                </label>
                <label style="display:flex;align-items:center;gap:6px;color:var(--muted)">
                  <input type="radio" name="ssid_security" value="wpa2" /> WPA2 Enabled
                </label>

                <label style="flex:0 0 140px">
                  <span class="muted-small"># of APs:</span>
                  <input class="input" id="ssid_count" type="number" min="1" max="50" value="1" />
                </label>

                <button class="btn" type="submit">Create SSIDs</button>
              </div>
            </form>
            <div id="ssidResult" class="muted-small" style="margin-top:8px">No SSIDs created yet.</div>
          </div>

          <div class="card" style="margin-top:12px">
            <h4>Generated SSID List</h4>
            <div id="ssidListContainer">
              <p class="muted-small">No SSIDs generated. Fill the form above to create.</p>
            </div>
          </div>

          <div id="ssidsContainer" class="card" style="margin-top:12px">
            <p class="muted-small">No SSIDs scanned yet.</p>
          </div>
        </div>

        <!-- Attack (SIMULATION ONLY) -->
        <div id="tab_attack" style="display:none">
          <h4>Attack Simulator (Safe)</h4>
          <div class="warning">
            <strong>Important:</strong> This interface is a <em>simulation only</em>. No real deauth or disruptive actions are performed.
          </div>
          <div style="margin-top:12px" class="card">
            <p class="small">Select a target SSID or client in the SSIDs/Clients tab, then choose a simulated action here.</p>
            <div style="display:flex;gap:8px;margin-top:8px">
              <select id="sim_action" class="input" style="max-width:220px">
                <option value="probe">Probe (simulate)</option>
                <option value="deauth">Deauth (simulate)</option>
              </select>
              <button class="btn" onclick="runSimulation()">Run Simulation</button>
              <button class="btn ghost" disabled title="Disabled for safety">Execute (disabled)</button>
            </div>
            <div id="simOutput" style="margin-top:12px" class="muted-small">No simulation run yet.</div>
          </div>
        </div>

        <!-- Access Point -->
        <div id="tab_ap" style="display:none">
          <h4>Access Point Management</h4>

          <div class="card" style="margin-bottom:12px">
            <p class="small">Create or edit an AP (Open/WPA). Submits to <code>/ap/create</code>.</p>
            <form id="apFormCreate" onsubmit="createAP(event)">
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <input class="input" id="ap_ssid_create" placeholder="SSID (e.g., Pine32-Guest)" required />
                <select class="input" id="ap_security_create">
                  <option value="open">Open</option>
                  <option value="wpa2">WPA2-PSK</option>
                </select>
              </div>
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <input class="input" id="ap_password_create" placeholder="Password (if WPA2)" />
                <input class="input" id="ap_channel_create" placeholder="Channel (1-11)" type="number" min="1" max="165" />
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn" type="submit">Create / Update AP</button>
                <button class="btn ghost" type="button" onclick="stopAP('create')">Stop AP</button>
              </div>
              <div id="apResultCreate" class="muted-small" style="margin-top:8px"></div>
            </form>
          </div>

          <div class="card">
            <p class="small">Manage the device's own Access Point. Current AP: <span id="currentApName">—</span></p>
            <form id="apFormDevice" onsubmit="updateAP(event)">
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <input class="input" id="ap_ssid_device" placeholder="Device AP SSID (e.g., Pine32)" required />
                <select class="input" id="ap_security_device">
                  <option value="open">Open</option>
                  <option value="wpa2">WPA2-PSK</option>
                </select>
              </div>
              <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                <input class="input" id="ap_password_device" placeholder="Password (if WPA2)" type="password" />
                <label style="display:flex;align-items:center;gap:6px;color:var(--muted)">
                  <input type="checkbox" id="ap_show_pwd_device" onchange="togglePwd('device')"> Show
                </label>
                <input class="input" id="ap_channel_device" placeholder="Channel (1-11)" type="number" min="1" max="165" style="max-width:120px" />
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn" id="apApplyBtnDevice" type="submit">Apply (Update Device AP)</button>
                <button class="btn ghost" type="button" onclick="stopAP('device')">Stop Device AP</button>
                <button class="btn ghost" type="button" onclick="resetAPForm('device')">Reset</button>
              </div>
              <div id="apResultDevice" class="muted-small" style="margin-top:8px"></div>
            </form>
          </div>
        </div>

      </div>
    </div>
  </div>
  `;
}

// ==== HELPERS ====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function attachPicoAP() {
  updatePineSummary();
  loadClients();
  showPicoTab('pineap');
}

function switchPicoTab(e) {
  const btn = e.currentTarget;
  if (!btn) return;
  const tab = btn.dataset.tab;
  document.querySelectorAll('#picoTopTabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showPicoTab(tab);
}

function showPicoTab(name) {
  ['pineap','clients','ssids','attack','ap'].forEach(t => {
    const el = document.getElementById('tab_' + t);
    if (el) el.style.display = (t === name) ? '' : 'none';
  });
}

// ==== SCAN ====
async function triggerScan(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Scanning…'; }
  try {
    const res = await fetch('/scan');
    if (!res.ok) throw new Error('scan failed: ' + res.status);
    const data = await res.json();
    lastScanResults = Array.isArray(data) ? data : [];
    lastScanTime = new Date();
    const tEl = document.getElementById('lastScanTime');
    if (tEl) tEl.textContent = lastScanTime.toLocaleString();
    populateSSIDs();
    updatePineSummary();
  } catch (err) {
    alert('Scan error: ' + err.message || err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Scan Wi‑Fi'; }
  }
}

function populateSSIDs() {
  const cont = document.getElementById('ssidsContainer');
  if (!cont) return;
  if (!lastScanResults.length) {
    cont.innerHTML = '<p class="muted-small">No SSIDs detected. Click <b>Scan Wi‑Fi</b>.</p>';
    return;
  }

  let html = `<table><thead><tr><th>SSID</th><th>RSSI</th><th>Channel</th><th>BSSID</th><th></th></tr></thead><tbody>`;
  lastScanResults.forEach((ap, i) => {
    html += `<tr>
      <td>${escapeHtml(ap.ssid || '—')}</td>
      <td>${escapeHtml(ap.rssi ?? '—')}</td>
      <td>${escapeHtml(ap.channel ?? '—')}</td>
      <td>${escapeHtml(ap.bssid || '—')}</td>
      <td><button class="btn ghost" onclick="openPrepareAttack(${i})">Prepare</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  cont.innerHTML = html;
}

function updatePineSummary() {
  const ssidCount = lastScanResults.length;
  const totalEl = document.getElementById('pine_total_ssids');
  if (totalEl) totalEl.textContent = 'SSIDs: ' + ssidCount;
  const uptimeEl = document.getElementById('pine_uptime');
  if (uptimeEl) uptimeEl.textContent = 'Uptime: —';

  // Clients (best-effort)
  fetch('/clients').then(r => r.json()).then(cl => {
    if (Array.isArray(cl)) {
      const clientsEl = document.getElementById('pine_connected_clients');
      if (clientsEl) clientsEl.textContent = 'Clients: ' + cl.length;
      const recent = document.getElementById('pineRecent');
      if (recent) recent.innerHTML = `<li class="muted-small">Loaded ${cl.length} clients.</li>`;
    } else {
      const clientsEl = document.getElementById('pine_connected_clients');
      if (clientsEl) clientsEl.textContent = 'Clients: —';
    }
  }).catch(() => {
    const clientsEl = document.getElementById('pine_connected_clients');
    if (clientsEl) clientsEl.textContent = 'Clients: —';
  });
}

// ==== CLIENTS ====
async function loadClients() {
  const cont = document.getElementById('clientsContainer');
  if (!cont) return;
  cont.innerHTML = '<p class="muted-small">Loading clients…</p>';
  try {
    const r = await fetch('/clients');
    if (!r.ok) throw new Error('/clients not available');
    const clients = await r.json();
    if (!Array.isArray(clients) || clients.length === 0) {
      cont.innerHTML = '<p class="muted-small">No clients currently connected or endpoint returned empty list.</p>';
      return;
    }
    let html = `<table><thead><tr><th>MAC</th><th>Associated SSID</th><th>Last seen</th><th></th></tr></thead><tbody>`;
    clients.forEach((c, i) => {
      html += `<tr>
        <td>${escapeHtml(c.mac || '—')}</td>
        <td>${escapeHtml(c.ssid || '—')}</td>
        <td>${escapeHtml(c.last_seen || '—')}</td>
        <td><button class="btn ghost" onclick="viewClient(${i})">View</button></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    cont.innerHTML = html;
  } catch (e) {
    cont.innerHTML = '<p class="muted-small">Clients endpoint not available. Implement <code>/clients</code> on the device to return JSON list of clients.</p>';
  }
}

function viewClient(idx) {
  fetch('/clients').then(r => r.json()).then(cl => {
    const c = cl[idx];
    if (!c) return alert('Client not found');
    showModal(`
      <h3>Client — ${escapeHtml(c.mac || 'unknown')}</h3>
      <p class="muted-small">Associated SSID: ${escapeHtml(c.ssid || '—')}</p>
      <p class="muted-small">Last seen: ${escapeHtml(c.last_seen || '—')}</p>
      <div style="margin-top:12px"><button class="btn" onclick="closeModal()">Close</button></div>
    `);
  }).catch(() => alert('Failed to load client details'));
}

// ==== SIMULATION / PREPARE (SAFE) ====
function openPrepareAttack(idx) {
  const ap = lastScanResults[idx];
  if (!ap) return alert('AP not found');
  showModal(`
    <h3>Prepare action: ${escapeHtml(ap.ssid)}</h3>
    <p class="muted-small">BSSID: ${escapeHtml(ap.bssid)} • RSSI: ${escapeHtml(ap.rssi ?? '—')}</p>
    <div class="warning" style="margin-top:8px">This is a <strong>simulation only</strong>. No network actions will be performed.</div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <select id="prep_action" class="input">
        <option value="probe">Probe request simulation</option>
        <option value="deauth">Deauth simulation</option>
      </select>
      <button class="btn" onclick="runPreparedSim(${idx})">Simulate</button>
      <button class="btn ghost" onclick="closeModal()">Close</button>
    </div>
    <div id="prepOut" class="muted-small" style="margin-top:10px"></div>
  `);
}

function runPreparedSim(idx) {
  const sel = document.getElementById('prep_action');
  const action = sel ? sel.value : 'probe';
  const ap = lastScanResults[idx];
  const out = document.getElementById('prepOut');
  if (!out) return;
  out.textContent = `Running simulation "${action}" against ${ap.ssid} (${ap.bssid})...`;
  let step = 0;
  const iv = setInterval(() => {
    step++;
    out.textContent = `Simulation "${action}": ${step * 20}%`;
    if (step >= 5) {
      clearInterval(iv);
      out.textContent = `Simulation completed. No network actions were performed.`;
    }
  }, 400);
}

function runSimulation() {
  const a = document.getElementById('sim_action')?.value || 'probe';
  const out = document.getElementById('simOutput');
  if (!out) return;
  out.textContent = `Simulating ${a}…`;
  let p = 0;
  const t = setInterval(() => {
    p += 20;
    out.textContent = `Simulating ${a}: ${p}%`;
    if (p >= 100) {
      clearInterval(t);
      out.textContent = `Simulation complete — this was a safe demo only.`;
    }
  }, 350);
}

// ==== SSID GENERATOR ====
async function createSSIDs(e) {
  e.preventDefault();
  const name = (document.getElementById('ssid_name')?.value || '').trim();
  const count = parseInt(document.getElementById('ssid_count')?.value || '1', 10);
  const security = document.querySelector('input[name="ssid_security"]:checked')?.value || 'open';
  const resDiv = document.getElementById('ssidResult');
  const listDiv = document.getElementById('ssidListContainer');

  if (!name) { alert('SSID name is required.'); return; }
  if (!Number.isFinite(count) || count < 1 || count > 50) { alert('Enter a valid number of APs (1–50).'); return; }

  if (resDiv) resDiv.textContent = 'Sending SSID creation request…';
  try {
    const r = await fetch('/ssid/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, count, security })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText || 'error');
      if (resDiv) resDiv.textContent = 'Error: ' + txt;
      return;
    }

    const j = await r.json().catch(() => null);
    if (resDiv) resDiv.textContent = 'Request sent. Device response: ' + (j?.msg || 'OK');

    // Local preview (UI)
    let html = '<table><thead><tr><th>#</th><th>SSID Name</th><th>Security</th></tr></thead><tbody>';
    for (let i = 1; i <= count; i++) {
      html += `<tr><td>${i}</td><td>${escapeHtml(name)}</td><td>${escapeHtml(security.toUpperCase())}</td></tr>`;
    }
    html += '</tbody></table>';
    if (listDiv) listDiv.innerHTML = html;
  } catch (err) {
    if (resDiv) resDiv.textContent = 'Failed to contact device. Implement /ssid/create in firmware.';
  }
}

// ==== AP MANAGEMENT ====
async function createAP(e) {
  e.preventDefault();
  const ssid = (document.getElementById('ap_ssid_create')?.value || '').trim();
  const security = document.getElementById('ap_security_create')?.value || 'open';
  const password = document.getElementById('ap_password_create')?.value || '';
  const channel = document.getElementById('ap_channel_create')?.value || '1';
  const resDiv = document.getElementById('apResultCreate');
  const btn = e.submitter || null;

  if (!ssid) return alert('SSID required');
  if (security === 'wpa2' && (!password || password.length < 8)) {
    return alert('WPA2 requires a password of at least 8 characters.');
  }

  if (btn) btn.disabled = true;
  if (resDiv) resDiv.textContent = 'Sending create request…';
  try {
    const r = await fetch('/ap/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, security, password, channel })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText || 'error');
      if (resDiv) resDiv.textContent = 'Error: ' + txt;
    } else {
      const j = await r.json().catch(() => null);
      if (resDiv) resDiv.textContent = 'AP create request submitted. Device response: ' + (j?.msg || 'OK');
      const pwdEl = document.getElementById('ap_password_create');
      if (pwdEl) pwdEl.value = '';
    }
  } catch (err) {
    if (resDiv) resDiv.textContent = 'Failed to contact device. Implement POST /ap/create in firmware.';
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadAPStatus() {
  const resDiv = document.getElementById('apResultDevice');
  if (resDiv) resDiv.textContent = 'Loading AP status…';
  try {
    const r = await fetch('/ap/status');
    if (!r.ok) throw new Error('/ap/status not available');
    const s = await r.json();
    document.getElementById('currentApName').textContent = s.ssid || '—';
    document.getElementById('ap_ssid_device').value = s.ssid || '';
    document.getElementById('ap_security_device').value = s.security || 'open';
    document.getElementById('ap_channel_device').value = s.channel || '';
    document.getElementById('ap_password_device').value = ''; // don't populate password
    if (resDiv) resDiv.textContent = 'Loaded AP settings.';
  } catch (err) {
    if (resDiv) resDiv.textContent = 'Unable to load AP status. Device must implement GET /ap/status.';
  }
}

async function updateAP(e) {
  e.preventDefault();
  const ssid = (document.getElementById('ap_ssid_device')?.value || '').trim();
  const security = document.getElementById('ap_security_device')?.value || 'open';
  const password = document.getElementById('ap_password_device')?.value || '';
  const channel = document.getElementById('ap_channel_device')?.value || '1';
  const resDiv = document.getElementById('apResultDevice');
  const btn = document.getElementById('apApplyBtnDevice');

  if (!ssid) return alert('SSID required');
  if (security === 'wpa2' && (!password || password.length < 8)) {
    return alert('WPA2 requires a password of at least 8 characters.');
  }

  if (btn) btn.disabled = true;
  if (resDiv) resDiv.textContent = 'Applying AP settings…';
  try {
    const r = await fetch('/ap/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, security, password, channel })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText || 'error');
      if (resDiv) resDiv.textContent = 'Error: ' + txt;
    } else {
      const j = await r.json().catch(() => null);
      if (resDiv) resDiv.textContent = 'AP updated. Device response: ' + (j?.msg || 'OK');
      const cur = document.getElementById('currentApName');
      if (cur) cur.textContent = ssid;
      const pwdEl = document.getElementById('ap_password_device');
      if (pwdEl) pwdEl.value = '';
    }
  } catch (err) {
    if (resDiv) resDiv.textContent = 'Failed to contact device. Implement POST /ap/update in firmware.';
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function stopAP(kind = 'device') {
  if (!confirm('Stop Access Point on device? This will disable the device AP.')) return;
  const targetDiv = kind === 'create' ? document.getElementById('apResultCreate') : document.getElementById('apResultDevice');
  try {
    const r = await fetch('/ap/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText || 'error');
      if (targetDiv) targetDiv.textContent = 'Stop AP failed: ' + txt;
    } else {
      const j = await r.json().catch(() => null);
      if (targetDiv) targetDiv.textContent = 'Stop request sent. Device response: ' + (j?.msg || 'stopped');
      const cur = document.getElementById('currentApName');
      if (cur) cur.textContent = '—';
    }
  } catch (err) {
    if (targetDiv) targetDiv.textContent = 'Request failed. /ap/stop not implemented.';
  }
}

function resetAPForm(kind = 'device') {
  if (kind === 'device') {
    loadAPStatus();
  } else {
    document.getElementById('apFormCreate')?.reset();
    const r = document.getElementById('apResultCreate');
    if (r) r.textContent = '';
  }
}

function togglePwd(which = 'device') {
  const id = which === 'device' ? 'ap_password_device' : 'ap_password_create';
  const chk = which === 'device' ? document.getElementById('ap_show_pwd_device') : null;
  const p = document.getElementById(id);
  if (!p) return;
  if (which === 'device') {
    p.type = (chk && chk.checked) ? 'text' : 'password';
  } else {
    p.type = p.type === 'password' ? 'text' : 'password';
  }
}

// ==== SIMPLE MODAL HELPERS ====
function showModal(html) {
  // Simple modal; replace with your app's modal if available
  let overlay = document.getElementById('pico_modal_overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pico_modal_overlay';
    overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div');
    box.id = 'pico_modal_box';
    box.style = 'background:#fff;padding:16px;border-radius:8px;max-width:90%;max-height:80%;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.3);';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) closeModal();
    });
  }
  const box = document.getElementById('pico_modal_box');
  if (box) box.innerHTML = html;
  overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('pico_modal_overlay');
  if (overlay) overlay.style.display = 'none';
}

// ==== INITIALIZE (call when your SPA view mounts) ====
// Example: after injecting HTML into page, call attachPicoAP() to wire fetched data.
// attachPicoAP();
// Optionally call loadAPStatus() to populate device AP fields:
// loadAPStatus();
