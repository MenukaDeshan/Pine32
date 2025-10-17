function renderHome(){
  return `
  <div class="card">
    <h2>Pine32 Dashboard</h2>
    <p class="small">Overview of device status and recent activity.</p>
    <div id="homeOverview" style="margin-top:12px">
      <div class="grid">
        <div class="card"><h3 id="homeSSIDs">SSIDs: —</h3><p class="muted-small">Total SSIDs detected</p></div>
        <div class="card"><h3 id="homeClients">Clients: —</h3><p class="muted-small">Connected clients</p></div>
        <div class="card"><h3 id="homeUptime">Uptime: —</h3><p class="muted-small">System uptime</p></div>
      </div>
    </div>
  </div>`;
}

function renderRecon(){
  return `<div class="card"><h2>Recon Module</h2><p class="small">Passive recon UI and logs.</p></div>`;
}
function renderLogs(){
  return `<div class="card"><h2>Logs</h2><p class="small">Event logs (local)</p></div>`;
}
function renderSettings(){
  return `<div class="card"><h2>Settings</h2><p class="small">Device and module settings.</p></div>`;
}
function renderProfile(){
  return `<div class="card"><h2>Profile</h2><p class="small">Admin profile</p></div>`;
}
