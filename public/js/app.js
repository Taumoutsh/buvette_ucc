const API = '';
const token = localStorage.getItem('token');

// Auth check
if (!token) {
  window.location.href = '/login.html';
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// State
let plates = [];
let menus = [];
let currentCategory = localStorage.getItem('category') || 'food';
let currentOrder = []; // { type: 'plate'|'menu', id, name, price, quantity }

// DOM elements
const itemsGrid = document.getElementById('items-grid');
const orderItems = document.getElementById('order-items');
const orderTotal = document.getElementById('order-total');
const tabs = document.querySelectorAll('.category-tabs .tab');

// Navigation
document.getElementById('btn-history').addEventListener('click', () => {
  window.location.href = '/history.html';
});
document.getElementById('btn-options').addEventListener('click', () => {
  window.location.href = '/options.html';
});
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
});

// Category tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentCategory = tab.dataset.category;
    localStorage.setItem('category', currentCategory);
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderItems();
  });
});

// Set active tab on load
tabs.forEach(t => {
  t.classList.toggle('active', t.dataset.category === currentCategory);
});

// Fetch data
async function loadData() {
  try {
    const [platesRes, menusRes] = await Promise.all([
      fetch(`${API}/api/plates`, { headers }),
      fetch(`${API}/api/menus`, { headers })
    ]);

    if (platesRes.status === 401 || menusRes.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

    plates = await platesRes.json();
    menus = await menusRes.json();
    renderItems();
  } catch {
    itemsGrid.innerHTML = '<p class="empty-state">Erreur de chargement</p>';
  }
}

function renderItems() {
  const filteredPlates = plates.filter(p => p.category === currentCategory);
  const filteredMenus = menus.filter(m => m.category === currentCategory);

  if (filteredPlates.length === 0 && filteredMenus.length === 0) {
    itemsGrid.innerHTML = '<p class="empty-state">Aucun article. Ajoutez-en depuis les options.</p>';
    return;
  }

  let html = '';

  filteredMenus.forEach(menu => {
    const desc = menu.plates ? menu.plates.map(p => p.name).join(' + ') : '';
    const qty = getOrderQty('menu', menu.id);
    html += `
      <button class="item-btn item-menu" data-type="menu" data-id="${menu.id}" style="background:${menu.color || '#ffffff'}">
        ${qty ? `<span class="item-badge">${qty}</span>` : ''}
        <span class="item-name">${esc(menu.name)}</span>
        <span class="item-price">${formatPrice(menu.price)}</span>
        ${desc ? `<span class="item-tag">${esc(desc)}</span>` : ''}
      </button>`;
  });

  filteredPlates.forEach(plate => {
    const qty = getOrderQty('plate', plate.id);
    html += `
      <button class="item-btn" data-type="plate" data-id="${plate.id}" style="background:${plate.color || '#ffffff'}">
        ${qty ? `<span class="item-badge">${qty}</span>` : ''}
        <span class="item-name">${esc(plate.name)}</span>
        <span class="item-price">${formatPrice(plate.price)}</span>
      </button>`;
  });

  itemsGrid.innerHTML = html;

  itemsGrid.querySelectorAll('.item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id = Number(btn.dataset.id);
      addToOrder(type, id);
    });
  });
}

function getOrderQty(type, id) {
  const item = currentOrder.find(i => i.type === type && i.id === id);
  return item ? item.quantity : 0;
}

function addToOrder(type, id) {
  const existing = currentOrder.find(i => i.type === type && i.id === id);
  if (existing) {
    existing.quantity++;
  } else {
    const source = type === 'plate'
      ? plates.find(p => p.id === id)
      : menus.find(m => m.id === id);
    if (!source) return;
    currentOrder.push({
      type,
      id: source.id,
      name: source.name,
      price: source.price,
      quantity: 1
    });
  }
  renderOrder();
  renderItems();
}

function renderOrder() {
  if (currentOrder.length === 0) {
    orderItems.innerHTML = '<p class="order-empty">Aucun article sélectionné</p>';
    orderTotal.textContent = '0,00 \u20AC';
    return;
  }

  let total = 0;
  let html = '';
  currentOrder.forEach((item, idx) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    html += `
      <div class="order-item">
        <div class="order-item-left">
          <button class="qty-btn" data-action="dec" data-idx="${idx}">&minus;</button>
          <span>${item.quantity}x ${esc(item.name)}</span>
          <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
        </div>
        <span class="order-item-price">${formatPrice(subtotal)}</span>
      </div>`;
  });

  orderItems.innerHTML = html;
  orderTotal.textContent = formatPrice(total);

  orderItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.action === 'inc') {
        currentOrder[idx].quantity++;
      } else {
        currentOrder[idx].quantity--;
        if (currentOrder[idx].quantity <= 0) {
          currentOrder.splice(idx, 1);
        }
      }
      renderOrder();
      renderItems();
    });
  });
}

// Reset
document.getElementById('btn-reset').addEventListener('click', () => {
  currentOrder = [];
  renderOrder();
  renderItems();
});

// Save
document.getElementById('btn-save').addEventListener('click', () => {
  if (currentOrder.length === 0) return;
  showConfirmModal();
});

function showConfirmModal() {
  const modal = document.getElementById('modal-confirm');
  const summary = document.getElementById('modal-summary');
  const totalEl = document.getElementById('modal-total-value');

  let total = 0;
  let html = '';
  currentOrder.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    html += `<div class="modal-summary-item">
      <span>${item.quantity}x ${esc(item.name)}</span>
      <span>${formatPrice(subtotal)}</span>
    </div>`;
  });

  summary.innerHTML = html;
  totalEl.textContent = formatPrice(total);
  modal.hidden = false;
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('modal-confirm').hidden = true;
});

async function submitOrder(paymentMethod) {
  const items = currentOrder.map(item => ({
    plate_id: item.type === 'plate' ? item.id : null,
    menu_id: item.type === 'menu' ? item.id : null,
    quantity: item.quantity,
    unit_price: item.price
  }));

  try {
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, payment_method: paymentMethod })
    });

    if (res.ok) {
      currentOrder = [];
      renderOrder();
      renderItems();
      document.getElementById('modal-confirm').hidden = true;
    } else {
      alert('Erreur lors de l\'enregistrement');
    }
  } catch {
    alert('Erreur réseau');
  }
}

document.getElementById('modal-confirm-cash').addEventListener('click', () => submitOrder('cash'));
document.getElementById('modal-confirm-card').addEventListener('click', () => submitOrder('card'));

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
loadData();
renderOrder();
