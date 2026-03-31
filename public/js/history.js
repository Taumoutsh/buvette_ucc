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

let orders = [];
let editingOrder = null;

async function loadOrders() {
  try {
    const res = await fetch(`${API}/api/orders`, { headers });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    orders = await res.json();
    renderOrders();
  } catch {
    document.getElementById('orders-list').innerHTML = '<p class="empty-state">Erreur de chargement</p>';
  }
}

function renderOrders() {
  const list = document.getElementById('orders-list');
  const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);
  document.getElementById('history-total').textContent = formatPrice(grandTotal);

  if (orders.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucune commande enregistrée</p>';
    return;
  }

  list.innerHTML = orders.map(order => {
    const itemsDesc = order.items.map(i => {
      const name = i.plate_name || i.menu_name || 'Article supprimé';
      return `${i.quantity}x ${name}`;
    }).join(', ');

    return `
      <div class="order-card" data-id="${order.id}">
        <div class="order-card-header">
          <span class="order-card-id">#${order.id}</span>
          <span class="order-card-total">${formatPrice(order.total)}</span>
        </div>
        <div class="order-card-date">${formatDate(order.created_at)}</div>
        <div class="order-card-items">${esc(itemsDesc)}</div>
      </div>`;
  }).join('');

  list.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      openEditModal(id);
    });
  });
}

function openEditModal(orderId) {
  editingOrder = orders.find(o => o.id === orderId);
  if (!editingOrder) return;

  document.getElementById('edit-order-id').textContent = `#${editingOrder.id}`;
  renderEditItems();
  document.getElementById('modal-edit').hidden = false;
}

function renderEditItems() {
  const container = document.getElementById('edit-items');
  let total = 0;

  if (editingOrder.items.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun article</p>';
    document.getElementById('edit-total').textContent = '0,00 \u20AC';
    return;
  }

  container.innerHTML = editingOrder.items.map((item, idx) => {
    const name = item.plate_name || item.menu_name || 'Article supprimé';
    const subtotal = item.unit_price * item.quantity;
    total += subtotal;
    return `
      <div class="edit-item">
        <div class="edit-item-left">
          <button class="qty-btn" data-action="dec" data-idx="${idx}">&minus;</button>
          <span>${item.quantity}x ${esc(name)}</span>
          <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
        </div>
        <span class="order-item-price">${formatPrice(subtotal)}</span>
      </div>`;
  }).join('');

  document.getElementById('edit-total').textContent = formatPrice(total);

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.action === 'inc') {
        editingOrder.items[idx].quantity++;
      } else {
        editingOrder.items[idx].quantity--;
        if (editingOrder.items[idx].quantity <= 0) {
          editingOrder.items.splice(idx, 1);
        }
      }
      renderEditItems();
    });
  });
}

document.getElementById('edit-cancel').addEventListener('click', () => {
  document.getElementById('modal-edit').hidden = true;
  loadOrders(); // reload to discard changes
});

document.getElementById('edit-save').addEventListener('click', async () => {
  if (!editingOrder || editingOrder.items.length === 0) {
    alert('La commande doit contenir au moins un article');
    return;
  }

  const items = editingOrder.items.map(i => ({
    plate_id: i.plate_id || null,
    menu_id: i.menu_id || null,
    quantity: i.quantity,
    unit_price: i.unit_price
  }));

  try {
    const res = await fetch(`${API}/api/orders/${editingOrder.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ items })
    });
    if (res.ok) {
      document.getElementById('modal-edit').hidden = true;
      loadOrders();
    } else {
      alert('Erreur lors de la sauvegarde');
    }
  } catch {
    alert('Erreur réseau');
  }
});

document.getElementById('edit-delete').addEventListener('click', async () => {
  if (!editingOrder) return;
  if (!confirm('Supprimer cette commande ?')) return;

  try {
    const res = await fetch(`${API}/api/orders/${editingOrder.id}`, {
      method: 'DELETE',
      headers
    });
    if (res.ok) {
      document.getElementById('modal-edit').hidden = true;
      loadOrders();
    }
  } catch {
    alert('Erreur réseau');
  }
});

function formatPrice(n) {
  return n.toFixed(2).replace('.', ',') + ' \u20AC';
}

function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('btn-export').addEventListener('click', () => {
  if (orders.length === 0) return;
  const sep = ';';
  const lines = ['Commande' + sep + 'Date' + sep + 'Article' + sep + 'Quantité' + sep + 'Prix unitaire' + sep + 'Sous-total' + sep + 'Total commande'];
  orders.forEach(order => {
    order.items.forEach(item => {
      const name = item.plate_name || item.menu_name || 'Article supprimé';
      const subtotal = (item.unit_price * item.quantity).toFixed(2);
      lines.push(
        order.id + sep +
        order.created_at + sep +
        '"' + name.replace(/"/g, '""') + '"' + sep +
        item.quantity + sep +
        item.unit_price.toFixed(2) + sep +
        subtotal + sep +
        order.total.toFixed(2)
      );
    });
  });
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'buvette-historique.csv';
  a.click();
  URL.revokeObjectURL(url);
});

loadOrders();
