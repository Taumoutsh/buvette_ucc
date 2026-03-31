const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../db');

const router = express.Router();
router.use(auth);

// Liste des menus actifs avec leurs plats
router.get('/', (req, res) => {
  const db = getDb();
  const menus = db.prepare('SELECT * FROM menus WHERE active = 1 ORDER BY name').all();
  const menuPlatesStmt = db.prepare(`
    SELECT p.id, p.name, p.price FROM menu_plates mp
    JOIN plates p ON p.id = mp.plate_id
    WHERE mp.menu_id = ?
  `);
  const result = menus.map(menu => ({
    ...menu,
    plates: menuPlatesStmt.all(menu.id)
  }));
  res.json(result);
});

// Créer un menu
router.post('/', (req, res) => {
  const { name, price, category, color, plate_ids } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: 'Nom, prix et catégorie requis' });
  }
  const db = getDb();
  const c = color || '#ffffff';
  const insertMenu = db.prepare('INSERT INTO menus (name, price, category, color) VALUES (?, ?, ?, ?)');
  const insertMenuPlate = db.prepare('INSERT INTO menu_plates (menu_id, plate_id) VALUES (?, ?)');

  const result = db.transaction(() => {
    const menuResult = insertMenu.run(name, price, category, c);
    const menuId = menuResult.lastInsertRowid;
    if (plate_ids && plate_ids.length) {
      for (const plateId of plate_ids) {
        insertMenuPlate.run(menuId, plateId);
      }
    }
    return menuId;
  })();

  res.status(201).json({ id: result, name, price, category, color: c, plate_ids: plate_ids || [] });
});

// Modifier un menu
router.put('/:id', (req, res) => {
  const { name, price, category, color, plate_ids } = req.body;
  const db = getDb();
  const c = color || '#ffffff';
  const updateMenu = db.prepare('UPDATE menus SET name = ?, price = ?, category = ?, color = ? WHERE id = ?');
  const deleteMenuPlates = db.prepare('DELETE FROM menu_plates WHERE menu_id = ?');
  const insertMenuPlate = db.prepare('INSERT INTO menu_plates (menu_id, plate_id) VALUES (?, ?)');

  db.transaction(() => {
    updateMenu.run(name, price, category, c, req.params.id);
    deleteMenuPlates.run(req.params.id);
    if (plate_ids && plate_ids.length) {
      for (const plateId of plate_ids) {
        insertMenuPlate.run(req.params.id, plateId);
      }
    }
  })();

  res.json({ id: Number(req.params.id), name, price, category, color: c, plate_ids });
});

// Supprimer (désactiver) un menu
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE menus SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
