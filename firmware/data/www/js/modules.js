// Register all pages
const modules = {
  dashboard: renderHome,
  picoap: renderPicoAP,
  recon: renderRecon,
  logs: renderLogs,
  settings: renderSettings,
  profile: renderProfile
};

function loadPage(name){
  setTitle(name.charAt(0).toUpperCase() + name.slice(1));
  const content = document.getElementById('content');
  if (modules[name]) {
    content.innerHTML = modules[name]();
    if (name === 'picoap') attachPicoAP();
  } else {
    content.innerHTML = `<div class="card"><p>Module "${name}" not found.</p></div>`;
  }
}
