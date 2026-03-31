const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../db');

const router = express.Router();
router.use(auth);

// Liste des commandes (historique)
router.get('/', (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const itemsStmt = db.prepare(`
    SELECT oi.*, p.name as plate_name, m.name as menu_name
    FROM order_items oi
    LEFT JOIN plates p ON p.id = oi.plate_id
    LEFT JOIN menus m ON m.id = oi.menu_id
    WHERE oi.order_id = ?
  `);
  const result = orders.map(order => ({
    ...order,
    items: itemsStmt.all(order.id)
  }));
  res.json(result);
});

// Créer une commande
router.post('/', (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'La commande doit contenir au moins un article' });
  }

  const db = getDb();
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const insertOrder = db.prepare('INSERT INTO orders (total) VALUES (?)');
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, plate_id, menu_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
  );

  const orderId = db.transaction(() => {
    const result = insertOrder.run(total);
    const orderId = result.lastInsertRowid;
    for (const item of items) {
      insertItem.run(orderId, item.plate_id || null, item.menu_id || null, item.quantity, item.unit_price);
    }
    return orderId;
  })();

  res.status(201).json({ id: orderId, total });
});

// Modifier une commande
router.put('/:id', (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'La commande doit contenir au moins un article' });
  }

  const db = getDb();
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const updateOrder = db.prepare("UPDATE orders SET total = ?, updated_at = datetime('now', 'localtime') WHERE id = ?");
  const deleteItems = db.prepare('DELETE FROM order_items WHERE order_id = ?');
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, plate_id, menu_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    updateOrder.run(total, req.params.id);
    deleteItems.run(req.params.id);
    for (const item of items) {
      insertItem.run(req.params.id, item.plate_id || null, item.menu_id || null, item.quantity, item.unit_price);
    }
  })();

  res.json({ id: Number(req.params.id), total });
});

// Supprimer une commande
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
