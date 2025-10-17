// ==== GLOBAL STATE ====
let lastScanResults = { aps: [], stations: [] };
let nameJson = [];
let lastScanTime = null;
let isScanning = false;
let scanTimeout = null;

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
        <div style="display:flex;gap:8px">
          <button class="btn" onclick="scanAPs(this)">Scan APs</button>
          <button class="btn" onclick="scanStations(this)">Scan Stations</button>
        </div>
      </div>

      <div style="margin-top:12px" id="picoapSummary" class="small muted-small">
        Last scan: <span id="lastScanTime">never</span> | 
        APs: <span id="apCount">0</span> | 
        Stations: <span id="stationCount">0</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="top-tabs" id="picoTopTabs">
        <button class="active" data-tab="scan" onclick="switchPicoTab(event)">Scan Results</button>
        <button data-tab="clients" onclick="switchPicoTab(event)">Clients</button>
        <button data-tab="ssids" onclick="switchPicoTab(event)">SSIDs</button>
        <button data-tab="attack" onclick="switchPicoTab(event)">Attack</button>
        <button data-tab="ap" onclick="switchPicoTab(event)">Access Point</button>
      </div>

      <div id="picoTabContent">
        <!-- Scan Results -->
        <div id="tab_scan">
          <div style="margin-bottom:16px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <label style="display:flex;align-items:center;gap:6px">
                <span class="muted-small">Channel:</span>
                <select id="scanChannel" class="input">
                  <option value="all">All</option>
                  ${Array.from({length: 14}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                </select>
              </label>
              <label style="display:flex;align-items:center;gap:6px">
                <span class="muted-small">Station Scan Time:</span>
                <input type="number" id="scanTime" value="15" class="input" style="width:80px">s
              </label>
              <button class="btn ghost" onclick="loadScanResults()">Reload Results</button>
            </div>
          </div>

          <div class="warning" style="margin-bottom:16px">
            <strong>Note:</strong> During station scan, the web interface may be unavailable and you may need to reconnect.
          </div>

          <!-- Access Points -->
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="margin:0">Access Points: <span id="apNum">0</span></h3>
              <div style="display:flex;gap:8px">
                <button class="btn ghost small" onclick="selectAll(0, true)">Select All</button>
                <button class="btn ghost small" onclick="selectAll(0, false)">Deselect All</button>
              </div>
            </div>
            <div id="apTableContainer" style="max-height:400px;overflow:auto">
              <table id="apTable" class="scan-table"></table>
            </div>
          </div>

          <!-- Stations -->
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="margin:0">Stations: <span id="stNum">0</span></h3>
              <div style="display:flex;gap:8px">
                <button class="btn ghost small" onclick="selectAll(1, true)">Select All</button>
                <button class="btn ghost small" onclick="selectAll(1, false)">Deselect All</button>
              </div>
            </div>
            <div id="stTableContainer" style="max-height:400px;overflow:auto">
              <table id="stTable" class="scan-table"></table>
            </div>
          </div>

          <!-- Saved Devices -->
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="margin:0">Saved Devices: <span id="nNum">0</span></h3>
              <div style="display:flex;gap:8px">
                <button class="btn ghost small" onclick="selectAll(2, true)">Select All</button>
                <button class="btn ghost small" onclick="selectAll(2, false)">Deselect All</button>
                <button class="btn ghost small" onclick="add(2)">New Device</button>
              </div>
            </div>
            <div id="nTableContainer" style="max-height:400px;overflow:auto">
              <table id="nTable" class="scan-table"></table>
            </div>
          </div>
        </div>

        <!-- Clients -->
        <div id="tab_clients" style="display:none">
          <h4>Connected Clients</h4>
          <div id="clientsContainer" class="card">
            <p class="muted-small">Scan for stations to see clients.</p>
          </div>
        </div>

        <!-- SSIDs -->
        <div id="tab_ssids" style="display:none">
          <h4>SSID Management</h4>
          <div class="card">
            <p class="small">Create and manage SSIDs for broadcasting.</p>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <input class="input" id="ssid_name" placeholder="SSID Name" />
              <button class="btn" onclick="addSSID()">Add SSID</button>
            </div>
            <div id="ssidListContainer">
              <p class="muted-small">No SSIDs configured.</p>
            </div>
          </div>
        </div>

        <!-- Attack -->
        <div id="tab_attack" style="display:none">
          <h4>Attack Controls</h4>
          <div class="warning">
            <strong>Important:</strong> Use responsibly and only on networks you own or have permission to test.
          </div>
          <div class="card" style="margin-top:12px">
            <p class="small">Select targets from scan results, then choose action.</p>
            <div style="display:flex;gap:8px;margin-top:8px">
              <select id="attackType" class="input">
                <option value="deauth">Deauthentication</option>
                <option value="beacon">Beacon Spam</option>
                <option value="probe">Probe Request</option>
              </select>
              <button class="btn" onclick="startAttack()">Start Attack</button>
              <button class="btn ghost" onclick="stopAttack()">Stop</button>
            </div>
            <div id="attackOutput" style="margin-top:12px" class="muted-small">No attack running.</div>
          </div>
        </div>

        <!-- Access Point -->
        <div id="tab_ap" style="display:none">
          <h4>Access Point Management</h4>
          <div class="card">
            <p class="small">Configure the device's access point settings.</p>
            <form id="apForm" onsubmit="updateAPSettings(event)">
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <input class="input" id="ap_ssid" placeholder="AP SSID" required />
                <select class="input" id="ap_security">
                  <option value="open">Open</option>
                  <option value="wpa2">WPA2</option>
                </select>
              </div>
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <input class="input" id="ap_password" placeholder="Password (if WPA2)" type="password" />
                <input class="input" id="ap_channel" placeholder="Channel" type="number" min="1" max="14" value="1" />
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn" type="submit">Apply Settings</button>
                <button class="btn ghost" type="button" onclick="loadAPSettings()">Reload</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

// ==== SCAN FUNCTIONS (From working project) ====
// ==== SCAN FUNCTIONS ====
function scanAPs(btn) {
  if (isScanning) {
    showMessage("Scan already in progress, please wait...");
    return;
  }
  scan(0, btn);
}

function scanStations(btn) {
  if (isScanning) {
    showMessage("Scan already in progress, please wait...");
    return;
  }
  scan(1, btn);
}

function scan(type, btn) {
  if (isScanning) {
    console.log("❌ Scan already in progress, ignoring request");
    return;
  }

  isScanning = true;
  console.log("🚀 Starting scan type:", type);
  
  if (btn) {
    btn.disabled = true;
    btn.textContent = type === 0 ? 'Scanning APs...' : 'Scanning Stations...';
  }

  const channel = document.getElementById('scanChannel').value;
  const scanTime = type === 1 ? document.getElementById('scanTime').value : '0';
  
  let cmdStr = "scan " + (type === 0 ? "aps" : "stations -t " + scanTime + "s");
  cmdStr += " -ch " + channel;

  console.log("📡 Sending scan command:", cmdStr);

  // Clear any existing timeout
  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }
  fetch("/run?cmd=" + encodeURIComponent(cmdStr))
    .then(response => {
      if (!response.ok) throw new Error('Scan command failed: ' + response.status);
      return response.text();
    })
    .then(result => {
      console.log("✅ Scan command accepted:", result);
      
    // Set timeout to load results
      const timeout = type === 0 ? 8000 : (parseInt(scanTime) * 1000) + 3000;
      
      scanTimeout = setTimeout(() => {
        console.log("⏰ Loading scan results after timeout");
        loadScanResults();
      }, timeout);
    })
    .catch(error => {
      console.error('❌ Scan command error:', error);
      showMessage("Scan command failed: " + error.message);
      resetScanState(btn, type);
    });
}

function loadScanResults() {
  console.log("🔄 Loading scan results...");
  
  // Don't set isScanning here since we're just loading results
  
  Promise.all([
    fetch("/scan.json?" + Date.now()).then(r => { // Add cache bust
      if (!r.ok) throw new Error('Failed to load scan.json');
      return r.json();
    }),
    fetch("/names.json?" + Date.now()).then(r => { // Add cache bust
      if (!r.ok) throw new Error('Failed to load names.json');
      return r.json();
    })
  ])
  .then(([scanData, namesData]) => {
    console.log("✅ Scan data loaded, APs found:", scanData.aps ? scanData.aps.length : 0);
    lastScanResults = scanData;
    nameJson = namesData;
    drawScan();
    drawNames();
    updateSummary();
    lastScanTime = new Date();
    
    // Reset scanning state after successful load
    resetScanState(null, null);
  })
  .catch(error => {
    console.error('❌ Failed to load scan results:', error);
    
    // Try alternative endpoint as fallback
    fetch("/scan/results?" + Date.now())
      .then(r => r.json())
      .then(simpleResults => {
        if (Array.isArray(simpleResults)) {
          console.log("✅ Using simple scan results format");
          // Convert simple format to ESP8266 Deauther format
          lastScanResults = {
            aps: simpleResults.map((ap, i) => [
              ap.ssid || '',
              '',
              ap.channel || 1,
              ap.rssi || -100,
              ap.encryption || 'unknown',
              ap.bssid || '00:00:00:00:00:00',
              'Unknown',
              false
            ]),
            stations: []
          };
          drawScan();
          updateSummary();
          lastScanTime = new Date();
        }
      })
      .catch(fallbackError => {
        console.error('❌ Fallback also failed:', fallbackError);
        showMessage("Failed to load scan results. Please try again.");
      })
      .finally(() => {
        resetScanState(null, null);
      });
  });
}
function resetScanState(btn, type) {
  isScanning = false;
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
  
  if (btn) {
    btn.disabled = false;
    btn.textContent = type === 0 ? 'Scan APs' : 'Scan Stations';
  }
  console.log("🔄 Scan state reset");
}

function drawScan() {
  if (!lastScanResults || !lastScanResults.aps) {
    console.log("❌ No scan data available");
    document.getElementById("apNum").textContent = "0";
    document.getElementById("stNum").textContent = "0";
    
    // Show empty tables with message
    document.getElementById("apTable").innerHTML = `
      <tr>
        <th class='id'>ID</th>
        <th class='ssid'>SSID</th>
        <th class='name'>Name</th>
        <th class='ch'>Ch</th>
        <th class='rssi'>RSSI</th>
        <th class='enc'>Enc</th>
        <th class='mac'>MAC</th>
        <th class='vendor'>Vendor</th>
        <th class='select'>Select</th>
      </tr>
      <tr>
        <td colspan="9" style="text-align: center; padding: 20px;" class="muted-small">
          No scan data available. Click "Scan APs" to start scanning.
        </td>
      </tr>`;
    
    document.getElementById("stTable").innerHTML = `
      <tr>
        <th class='id'>ID</th>
        <th class='mac'>MAC</th>
        <th class='vendor'>Vendor</th>
        <th class='ch'>Ch</th>
        <th class='name'>Name</th>
        <th class='pkts'>Pkts</th>
        <th class='ap'>AP</th>
        <th class='select'>Select</th>
      </tr>
      <tr>
        <td colspan="8" style="text-align: center; padding: 20px;" class="muted-small">
          No station data available.
        </td>
      </tr>`;
    return;
  }
  // Access Points
  document.getElementById("apNum").textContent = lastScanResults.aps.length;
  let html = `
    <tr>
      <th class='id'>ID</th>
      <th class='ssid'>SSID</th>
      <th class='name'>Name</th>
      <th class='ch'>Ch</th>
      <th class='rssi'>RSSI</th>
      <th class='enc'>Enc</th>
      <th class='mac'>MAC</th>
      <th class='vendor'>Vendor</th>
      <th class='select'>Select</th>
    </tr>`;

  lastScanResults.aps.forEach((ap, i) => {
    const selected = ap[7] || false;
    const width = Math.min(100, Math.max(0, (parseInt(ap[3]) + 130)));
    let color = "meter_red";
    if (width >= 70) color = "meter_green";
    else if (width >= 50) color = "meter_orange";

    html += `
      <tr class="${selected ? 'selected' : ''}">
        <td class='id'>${i}</td>
        <td class='ssid'>${escapeHtml(ap[0])}</td>
        <td class='name'>${ap[1] && ap[1].length > 0 ? escapeHtml(ap[1]) : `<button class="btn ghost small" onclick='add(0,${i})'>Add</button>`}</td>
        <td class='ch'>${escapeHtml(ap[2])}</td>
        <td class='rssi'>
          <div class='meter_background'>
            <div class='meter_foreground ${color}' style='width: ${width}%'>
              <div class='meter_value'>${ap[3]}</div>
            </div>
          </div>
        </td>
        <td class='enc'>${escapeHtml(ap[4])}</td>
        <td class='mac'>${escapeHtml(ap[5])}</td>
        <td class='vendor'>${escapeHtml(ap[6])}</td>
        <td class='select'>
          <input type="checkbox" ${selected ? "checked" : ""} onchange="selectRow(0,${i},this.checked)">
        </td>
      </tr>`;
  });

  document.getElementById("apTable").innerHTML = html;

  // Stations
  if (lastScanResults.stations) {
    document.getElementById("stNum").textContent = lastScanResults.stations.length;
    html = `
      <tr>
        <th class='id'>ID</th>
        <th class='mac'>MAC</th>
        <th class='vendor'>Vendor</th>
        <th class='ch'>Ch</th>
        <th class='name'>Name</th>
        <th class='pkts'>Pkts</th>
        <th class='ap'>AP</th>
        <th class='select'>Select</th>
      </tr>`;

    lastScanResults.stations.forEach((station, i) => {
      const selected = station[7] || false;
      const apIndex = station[5];
      const apName = apIndex >= 0 && lastScanResults.aps[apIndex] ? lastScanResults.aps[apIndex][0] : '—';

      html += `
        <tr class="${selected ? 'selected' : ''}">
          <td class='id'>${i}</td>
          <td class='mac'>${escapeHtml(station[0])}</td>
          <td class='vendor'>${escapeHtml(station[3])}</td>
          <td class='ch'>${escapeHtml(station[1])}</td>
          <td class='name'>${station[2] && station[2].length > 0 ? escapeHtml(station[2]) : `<button class="btn ghost small" onclick='add(1,${i})'>Add</button>`}</td>
          <td class='pkts'>${escapeHtml(station[4])}</td>
          <td class='ap'>${escapeHtml(apName)}</td>
          <td class='select'>
            <input type="checkbox" ${selected ? "checked" : ""} onchange="selectRow(1,${i},this.checked)">
          </td>
        </tr>`;
    });

    document.getElementById("stTable").innerHTML = html;
  }
}

function drawNames() {
  document.getElementById("nNum").textContent = nameJson.length;
  
  let html = `
    <tr>
      <th class='id'>ID</th>
      <th class='mac'>MAC</th>
      <th class='vendor'>Vendor</th>
      <th class='name'>Name</th>
      <th class='ap'>AP-BSSID</th>
      <th class='ch'>Ch</th>
      <th class='select'>Select</th>
      <th class='actions'>Actions</th>
    </tr>`;

  nameJson.forEach((device, i) => {
    const selected = device[5] || false;
    
    html += `
      <tr class="${selected ? 'selected' : ''}">
        <td class='id'>${i}</td>
        <td class='mac' contenteditable="true" onblur="saveName(${i}, 'mac', this.textContent)">${escapeHtml(device[0])}</td>
        <td class='vendor'>${escapeHtml(device[1])}</td>
        <td class='name' contenteditable="true" onblur="saveName(${i}, 'name', this.textContent)">${escapeHtml(device[2])}</td>
        <td class='ap' contenteditable="true" onblur="saveName(${i}, 'ap', this.textContent)">${escapeHtml(device[3])}</td>
        <td class='ch' contenteditable="true" onblur="saveName(${i}, 'ch', this.textContent)">${escapeHtml(device[4])}</td>
        <td class='select'>
          <input type="checkbox" ${selected ? "checked" : ""} onchange="selectRow(2,${i},this.checked)">
        </td>
        <td class='actions'>
          <button class="btn ghost small" onclick="saveName(${i})">Save</button>
          <button class="btn ghost small red" onclick="remove(2,${i})">X</button>
        </td>
      </tr>`;
  });

  document.getElementById("nTable").innerHTML = html;
}

// Update the selectRow function to not trigger full reloads
function selectRow(type, id, selected) {
  const cmd = selected ? "select" : "deselect";
  let endpoint = "";
  
  switch (type) {
    case 0:
      endpoint = `ap ${id}`;
      break;
    case 1:
      endpoint = `station ${id}`;
      break;
    case 2:
      endpoint = `name ${id}`;
      break;
  }
  
  console.log("🎯 Selection change:", cmd, endpoint);
  
  fetch(`/run?cmd=${encodeURIComponent(cmd + " " + endpoint)}`)
    .then(response => {
      if (!response.ok) throw new Error('Selection command failed');
      return response.text();
    })
    .then(result => {
      console.log("✅ Selection updated:", result);
      // Update UI immediately without full reload
      updateSelectionUI(type, id, selected);
    })
    .catch(error => {
      console.error('❌ Selection error:', error);
      // Revert the checkbox on error
      const checkbox = document.querySelector(`#apTable input[onchange*="selectRow(0,${id}"]`) ||
                     document.querySelector(`#stTable input[onchange*="selectRow(1,${id}"]`) ||
                     document.querySelector(`#nTable input[onchange*="selectRow(2,${id}"]`);
      if (checkbox) {
        checkbox.checked = !selected;
      }
    });
}

function updateSelectionUI(type, id, selected) {
  // Find the row and update its selected class without full redraw
  let row;
  switch (type) {
    case 0:
      row = document.querySelector(`#apTable tr:nth-child(${id + 2})`);
      break;
    case 1:
      row = document.querySelector(`#stTable tr:nth-child(${id + 2})`);
      break;
    case 2:
      row = document.querySelector(`#nTable tr:nth-child(${id + 2})`);
      break;
  }
  
  if (row) {
    if (selected) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  }
}

// Update the attachPicoAP function to load initial data without scan
function attachPicoAP() {
  console.log("🔧 Initializing PicoAP...");
  // Load existing data without triggering a scan
  loadExistingData();
  showPicoTab('scan');
}

function loadExistingData() {
  console.log("📥 Loading existing scan data...");
  
  // Just load whatever data is available without triggering scan
  Promise.all([
    fetch("/scan.json?" + Date.now()).then(r => r.json().catch(() => ({ aps: [], stations: [] }))),
    fetch("/names.json?" + Date.now()).then(r => r.json().catch(() => []))
  ])
  .then(([scanData, namesData]) => {
    lastScanResults = scanData;
    nameJson = namesData;
    drawScan();
    drawNames();
    updateSummary();
    console.log("✅ Initial data loaded");
  })
  .catch(error => {
    console.error('❌ Failed to load initial data:', error);
    // Start with empty data
    lastScanResults = { aps: [], stations: [] };
    nameJson = [];
    drawScan();
    drawNames();
    updateSummary();
  });
}

function selectAll(type, select) {
  const cmd = select ? "select" : "deselect";
  let endpoint = "";
  
  switch (type) {
    case 0:
      endpoint = "aps";
      break;
    case 1:
      endpoint = "stations";
      break;
    case 2:
      endpoint = "names";
      break;
  }
  
  fetch(`/run?cmd=${encodeURIComponent(cmd + " " + endpoint)}`)
    .then(() => loadScanResults())
    .catch(error => console.error('Select all error:', error));
}

function remove(type, id) {
  let endpoint = "";
  
  switch (type) {
    case 0:
      endpoint = `ap ${id}`;
      break;
    case 1:
      endpoint = `station ${id}`;
      break;
    case 2:
      endpoint = `name ${id}`;
      break;
  }
  
  fetch(`/run?cmd=${encodeURIComponent("remove " + endpoint)}`)
    .then(() => loadScanResults())
    .catch(error => console.error('Remove error:', error));
}

function add(type, id) {
  if (nameJson.length >= 25) {
    showMessage("Device Name List is full!");
    return;
  }

  let endpoint = "";
  
  switch (type) {
    case 0:
      endpoint = `add name "${lastScanResults.aps[id][0]}" -ap ${id}`;
      break;
    case 1:
      endpoint = `add name "${lastScanResults.stations[id][0]}" station ${id}`;
      break;
    case 2:
      endpoint = `add name device_${nameJson.length} -m 00:00:00:00:00:00 -ch 1`;
      break;
  }
  
  fetch(`/run?cmd=${encodeURIComponent(endpoint)}`)
    .then(() => loadScanResults())
    .catch(error => console.error('Add error:', error));
}

function saveName(id, field, value) {
  // Implementation for saving individual name fields
  const device = nameJson[id];
  if (!device) return;
  
  // Update local data
  switch (field) {
    case 'mac':
      device[0] = value;
      break;
    case 'name':
      device[2] = value;
      break;
    case 'ap':
      device[3] = value;
      break;
    case 'ch':
      device[4] = value;
      break;
  }
  
  // Send update command
  const cmd = `replace name ${id} -n "${device[2]}" -m "${device[0]}" -ch ${device[4]} -b "${device[3]}" ${device[5] ? "-s" : ""}`;
  fetch(`/run?cmd=${encodeURIComponent(cmd)}`)
    .catch(error => console.error('Save name error:', error));
}

// ==== HELPER FUNCTIONS ====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(message) {
  // Simple message display - you can enhance this with a proper notification system
  console.log(message);
  alert(message); // Temporary - replace with better UI notification
}

function updateSummary() {
  const apCount = lastScanResults.aps ? lastScanResults.aps.length : 0;
  const stationCount = lastScanResults.stations ? lastScanResults.stations.length : 0;
  
  document.getElementById('apCount').textContent = apCount;
  document.getElementById('stationCount').textContent = stationCount;
  document.getElementById('lastScanTime').textContent = new Date().toLocaleTimeString();
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
  ['scan','clients','ssids','attack','ap'].forEach(t => {
    const el = document.getElementById('tab_' + t);
    if (el) el.style.display = (t === name) ? '' : 'none';
  });
  
  // Load data when switching to specific tabs
  if (name === 'clients') loadClients();
  if (name === 'ap') loadAPSettings();
}

function attachPicoAP() {
  loadScanResults();
  showPicoTab('scan');
}

// ==== ADDITIONAL FUNCTIONS ====
function loadClients() {
  // Implementation for loading clients
  const container = document.getElementById('clientsContainer');
  if (lastScanResults.stations && lastScanResults.stations.length > 0) {
    container.innerHTML = '<p>Clients are shown in the Scan Results tab under Stations.</p>';
  } else {
    container.innerHTML = '<p>No stations scanned yet. Use "Scan Stations" to find clients.</p>';
  }
}

function addSSID() {
  // Implementation for adding SSIDs
  showMessage("SSID management not implemented in this version");
}

function startAttack() {
  // Implementation for starting attacks
  showMessage("Attack functionality requires proper backend implementation");
}

function stopAttack() {
  // Implementation for stopping attacks
  showMessage("Attack stopped");
}

function updateAPSettings(e) {
  e.preventDefault();
  // Implementation for updating AP settings
  showMessage("AP settings updated");
}

function loadAPSettings() {
  // Implementation for loading AP settings
  showMessage("Loading AP settings...");
}

// Initialize when loaded
console.log('PicoAP with integrated scan functionality loaded');