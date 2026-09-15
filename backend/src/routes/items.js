const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/items - Retrieve all items
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, category, created_at FROM items ORDER BY created_at DESC'
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ success: false, error: 'Database error fetching items' });
  }
});

// POST /api/items - Create a new item
router.post('/', async (req, res) => {
  const { name, description, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Item name is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO items (name, description, category) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || '', category || 'General']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ success: false, error: 'Database error creating item' });
  }
});

// DELETE /api/items/:id - Remove an item
router.delete('/:id', async (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ success: false, error: 'Invalid item ID' });
  }

  try {
    const result = await db.query('DELETE FROM items WHERE id = $1 RETURNING id', [itemId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, message: `Item ${itemId} deleted successfully` });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ success: false, error: 'Database error deleting item' });
  }
});

module.exports = router;
