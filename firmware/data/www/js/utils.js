// === Utility helpers ===
function togglePopup(){
  const m = document.getElementById('popupMenu');
  m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
window.addEventListener('click', (e)=> {
  const menu = document.getElementById('popupMenu');
  const btn = document.querySelector('.dot-button');
  if (!menu.contains(e.target) && !btn.contains(e.target)) menu.style.display = 'none';
});

function setTitle(t){ document.getElementById('pageTitle').textContent = t; }

function showModal(html){
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" onclick="closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">${html}</div>
    </div>`;
  root.style.display = 'block';
}

function closeModal(e){
  if (e) e.stopPropagation();
  const root = document.getElementById('modalRoot');
  root.style.display = 'none';
  root.innerHTML = '';
}

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}
