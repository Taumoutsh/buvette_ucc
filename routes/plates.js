const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../db');

const router = express.Router();
router.use(auth);

// Liste des plats actifs
router.get('/', (req, res) => {
  const db = getDb();
  const plates = db.prepare('SELECT * FROM plates WHERE active = 1 ORDER BY name').all();
  res.json(plates);
});

// Créer un plat
router.post('/', (req, res) => {
  const { name, price, category, color } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: 'Nom, prix et catégorie requis' });
  }
  if (!['food', 'beverage'].includes(category)) {
    return res.status(400).json({ error: 'Catégorie invalide' });
  }
  const db = getDb();
  const c = color || '#ffffff';
  const result = db.prepare('INSERT INTO plates (name, price, category, color) VALUES (?, ?, ?, ?)').run(name, price, category, c);
  res.status(201).json({ id: result.lastInsertRowid, name, price, category, color: c, active: 1 });
});

// Modifier un plat
router.put('/:id', (req, res) => {
  const { name, price, category, color } = req.body;
  const db = getDb();
  const c = color || '#ffffff';
  db.prepare('UPDATE plates SET name = ?, price = ?, category = ?, color = ? WHERE id = ?').run(name, price, category, c, req.params.id);
  res.json({ id: Number(req.params.id), name, price, category, color: c });
});

// Supprimer (désactiver) un plat
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE plates SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
