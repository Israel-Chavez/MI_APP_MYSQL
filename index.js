// index.js
const express = require('express');
const pool = require('./db');
const cors = require('cors');
const axios = require('axios');  // 👈 para consumir API externa
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // si tienes frontend en public/

// ----- RUTAS ----- //

// Mensaje raíz
app.get('/', (req, res) => {
  res.send('📚 Biblioteca Digital - API funcionando ✅');
});


// ==========================
// 📚 LIBROS EN TU BASE MYSQL
// ==========================

// Obtener libros con paginación y búsqueda
app.get('/libros', (req, res) => {
  const { search, autor, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  let sql = 'SELECT * FROM libros WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (titulo LIKE ? OR descripcion LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (autor) {
    sql += ' AND autor LIKE ?';
    params.push(`%${autor}%`);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  pool.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Obtener 1 libro por id
app.get('/libros/:id', (req, res) => {
  const { id } = req.params;
  pool.query('SELECT * FROM libros WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  });
});

// Crear libro en tu base
app.post('/libros', (req, res) => {
  const { titulo, autor, anio, isbn, descripcion, disponible = 1 } = req.body;
  if (!titulo || !autor) return res.status(400).json({ error: 'titulo y autor son obligatorios' });

  pool.query(
    'INSERT INTO libros (titulo, autor, anio, isbn, descripcion, disponible) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo, autor, anio || null, isbn || null, descripcion || null, disponible ? 1 : 0],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, titulo, autor });
    }
  );
});

// Actualizar libro (PATCH)
app.patch('/libros/:id', (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = ['titulo','autor','anio','isbn','descripcion','disponible'];
  const updates = [];
  const params = [];

  Object.keys(fields).forEach(key => {
    if (allowed.includes(key)) {
      updates.push(`${key} = ?`);
      params.push(fields[key]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
  params.push(id);

  const sql = `UPDATE libros SET ${updates.join(', ')} WHERE id = ?`;
  pool.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Borrar libro
app.delete('/libros/:id', (req, res) => {
  const { id } = req.params;
  pool.query('DELETE FROM libros WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true });
  });
});


// ==========================
// 🌍 LIBROS DESDE GOOGLE BOOKS
// ==========================

// Buscar libros online
// Ejemplo: GET /api/books?q=harry+potter
app.get('/api/books', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Falta el parámetro q' });

  try {
    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: { q, maxResults: 10 }
    });

    const libros = response.data.items?.map(item => ({
      id: item.id,
      titulo: item.volumeInfo.title,
      autores: item.volumeInfo.authors || [],
      publicado: item.volumeInfo.publishedDate,
      descripcion: item.volumeInfo.description,
      isbn: item.volumeInfo.industryIdentifiers ? item.volumeInfo.industryIdentifiers[0].identifier : null,
      categorias: item.volumeInfo.categories || [],
      portada: item.volumeInfo.imageLinks?.thumbnail || null,
      link: item.volumeInfo.infoLink
    })) || [];

    res.json(libros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// 🚀 ARRANQUE DEL SERVIDOR
// ==========================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
