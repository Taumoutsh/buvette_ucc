const API = '';
const token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

document.getElementById('btn-back').addEventListener('click', () => {
  window.location.href = '/';
});

let plates = [];
let menus = [];

// Tabs
const optionsTabs = document.querySelectorAll('.category-tabs .tab');
optionsTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    optionsTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('section-plates').hidden = tab.dataset.tab !== 'plates';
    document.getElementById('section-menus').hidden = tab.dataset.tab !== 'menus';
  });
});

// ---- PLATES ----
async function loadPlates() {
  try {
    const res = await fetch(`${API}/api/plates`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }
    plates = await res.json();
    renderPlates();
  } catch {
    document.getElementById('plates-list').innerHTML = '<p class="empty-state">Erreur</p>';
  }
}

function renderPlates() {
  const list = document.getElementById('plates-list');
  if (plates.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun plat</p>';
    return;
  }
  list.innerHTML = plates.map(p => `
    <div class="option-card">
      <div class="option-info">
        <div class="option-name">${esc(p.name)}</div>
        <div class="option-details">${formatPrice(p.price)} · ${p.category === 'food' ? 'Nourriture' : 'Boisson'}</div>
      </div>
      <div class="option-actions">
        <button class="btn btn-primary btn-small" data-edit-plate="${p.id}">Modifier</button>
        <button class="btn btn-danger btn-small" data-delete-plate="${p.id}">Suppr.</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-plate]').forEach(btn => {
    btn.addEventListener('click', () => openPlateModal(Number(btn.dataset.editPlate)));
  });
  list.querySelectorAll('[data-delete-plate]').forEach(btn => {
    btn.addEventListener('click', () => deletePlate(Number(btn.dataset.deletePlate)));
  });
}

function openPlateModal(id) {
  const plate = id ? plates.find(p => p.id === id) : null;
  document.getElementById('plate-modal-title').textContent = plate ? 'Modifier le plat' : 'Ajouter un plat';
  document.getElementById('plate-id').value = plate ? plate.id : '';
  document.getElementById('plate-name').value = plate ? plate.name : '';
  document.getElementById('plate-price').value = plate ? plate.price : '';
  document.getElementById('plate-category').value = plate ? plate.category : 'food';
  document.getElementById('plate-color').value = plate ? (plate.color || '#ffffff') : '#ffffff';
  document.getElementById('modal-plate').hidden = false;
}

document.getElementById('btn-add-plate').addEventListener('click', () => openPlateModal(null));
document.getElementById('plate-cancel').addEventListener('click', () => {
  document.getElementById('modal-plate').hidden = true;
});

document.getElementById('plate-save').addEventListener('click', async () => {
  const id = document.getElementById('plate-id').value;
  const name = document.getElementById('plate-name').value.trim();
  const price = parseFloat(document.getElementById('plate-price').value);
  const category = document.getElementById('plate-category').value;
  const color = document.getElementById('plate-color').value;

  if (!name || isNaN(price)) {
    alert('Veuillez remplir tous les champs');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API}/api/plates/${id}` : `${API}/api/plates`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ name, price, category, color })
    });
    if (res.ok) {
      document.getElementById('modal-plate').hidden = true;
      loadPlates();
      loadMenus(); // refresh checkboxes
    } else {
      alert('Erreur');
    }
  } catch {
    alert('Erreur réseau');
  }
});

async function deletePlate(id) {
  if (!confirm('Supprimer ce plat ?')) return;
  try {
    await fetch(`${API}/api/plates/${id}`, { method: 'DELETE', headers });
    loadPlates();
  } catch {
    alert('Erreur réseau');
  }
}

// ---- MENUS ----
async function loadMenus() {
  try {
    const res = await fetch(`${API}/api/menus`, { headers });
    menus = await res.json();
    renderMenus();
  } catch {
    document.getElementById('menus-list').innerHTML = '<p class="empty-state">Erreur</p>';
  }
}

function renderMenus() {
  const list = document.getElementById('menus-list');
  if (menus.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun menu</p>';
    return;
  }
  list.innerHTML = menus.map(m => {
    const platesStr = m.plates ? m.plates.map(p => p.name).join(' + ') : '';
    return `
      <div class="option-card">
        <div class="option-info">
          <div class="option-name">${esc(m.name)}</div>
          <div class="option-details">${formatPrice(m.price)} · ${m.category === 'food' ? 'Nourriture' : 'Boisson'}${platesStr ? ' · ' + esc(platesStr) : ''}</div>
        </div>
        <div class="option-actions">
          <button class="btn btn-primary btn-small" data-edit-menu="${m.id}">Modifier</button>
          <button class="btn btn-danger btn-small" data-delete-menu="${m.id}">Suppr.</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-edit-menu]').forEach(btn => {
    btn.addEventListener('click', () => openMenuModal(Number(btn.dataset.editMenu)));
  });
  list.querySelectorAll('[data-delete-menu]').forEach(btn => {
    btn.addEventListener('click', () => deleteMenu(Number(btn.dataset.deleteMenu)));
  });
}

function openMenuModal(id) {
  const menu = id ? menus.find(m => m.id === id) : null;
  document.getElementById('menu-modal-title').textContent = menu ? 'Modifier le menu' : 'Ajouter un menu';
  document.getElementById('menu-id').value = menu ? menu.id : '';
  document.getElementById('menu-name').value = menu ? menu.name : '';
  document.getElementById('menu-price').value = menu ? menu.price : '';
  document.getElementById('menu-category').value = menu ? menu.category : 'food';
  document.getElementById('menu-color').value = menu ? (menu.color || '#ffffff') : '#ffffff';

  // Plates checkboxes
  const selectedIds = menu && menu.plates ? menu.plates.map(p => p.id) : [];
  const container = document.getElementById('menu-plates-checkboxes');
  container.innerHTML = plates.map(p => `
    <label>
      <input type="checkbox" value="${p.id}" ${selectedIds.includes(p.id) ? 'checked' : ''}>
      ${esc(p.name)} (${formatPrice(p.price)})
    </label>
  `).join('');

  document.getElementById('modal-menu').hidden = false;
}

document.getElementById('btn-add-menu').addEventListener('click', () => openMenuModal(null));
document.getElementById('menu-cancel').addEventListener('click', () => {
  document.getElementById('modal-menu').hidden = true;
});

document.getElementById('menu-save').addEventListener('click', async () => {
  const id = document.getElementById('menu-id').value;
  const name = document.getElementById('menu-name').value.trim();
  const price = parseFloat(document.getElementById('menu-price').value);
  const category = document.getElementById('menu-category').value;
  const color = document.getElementById('menu-color').value;
  const plate_ids = Array.from(
    document.querySelectorAll('#menu-plates-checkboxes input:checked')
  ).map(cb => Number(cb.value));

  if (!name || isNaN(price)) {
    alert('Veuillez remplir tous les champs');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API}/api/menus/${id}` : `${API}/api/menus`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ name, price, category, color, plate_ids })
    });
    if (res.ok) {
      document.getElementById('modal-menu').hidden = true;
      loadMenus();
    } else {
      alert('Erreur');
    }
  } catch {
    alert('Erreur réseau');
  }
});

async function deleteMenu(id) {
  if (!confirm('Supprimer ce menu ?')) return;
  try {
    await fetch(`${API}/api/menus/${id}`, { method: 'DELETE', headers });
    loadMenus();
  } catch {
    alert('Erreur réseau');
  }
}

// Utilities
function formatPrice(n) {
  return n.toFixed(2).replace('.', ',') + ' \u20AC';
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
loadPlates();
loadMenus();
