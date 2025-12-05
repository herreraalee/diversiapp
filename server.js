// server.js → VERSIÓN 100% FUNCIONAL EN RAILWAY + NODE 22 + WINDOWS
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json());
app.use(cors());

// SIRVE TODOS LOS ARCHIVOS ESTÁTICOS (index.html, styles.css, script.js, etc.)
app.use(express.static(__dirname));

// Base de datos
const db = new sqlite3.Database('./diversi.db', (err) => {
    if (err) console.error('Error BD:', err);
    else console.log('Base de datos diversi.db conectada');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT, productos TEXT, costo REAL, precio_total REAL,
        envio REAL, comision REAL, ganancia REAL,
        comision_videos REAL, comision_mensajes REAL,
        neto REAL, guia TEXT, tipo_envio TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE
    )`);
});

// === TODAS TUS RUTAS API (sin cambios) ===
app.get('/api/ventas', (req, res) => {
    db.all('SELECT * FROM ventas ORDER BY id DESC', [], (err, rows) => res.json(rows || []));
});

app.post('/api/ventas', (req, res) => {
    const v = req.body;
    db.run(`INSERT INTO ventas (cliente, productos, costo, precio_total, envio, comision, ganancia, comision_videos, comision_mensajes, neto, guia, tipo_envio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [v.cliente, v.productos, v.costo, v.precio_total, v.envio, v.comision, v.ganancia || 0, v.comision_videos || 0, v.comision_mensajes || 0, v.neto, v.guia, v.tipo_envio],
        function(err) { res.json(err ? { error: err.message } : { id: this.lastID }); }
    );
});

app.put('/api/ventas/:id', (req, res) => {
    const v = req.body;
    db.run(`UPDATE ventas SET cliente=?, productos=?, costo=?, precio_total=?, envio=?, comision=?, ganancia=?, comision_videos=?, comision_mensajes=?, neto=?, guia=?, tipo_envio=? WHERE id=?`, [v.cliente, v.productos, v.costo, v.precio_total, v.envio, v.comision, v.ganancia || 0, v.comision_videos || 0, v.comision_mensajes || 0, v.neto, v.guia, v.tipo_envio, req.params.id],
        () => res.json({ success: true })
    );
});

app.delete('/api/ventas/:id', (req, res) => db.run('DELETE FROM ventas WHERE id=?', req.params.id, () => res.json({ success: true })));
app.delete('/api/ventas', (req, res) => db.run('DELETE FROM ventas', () => res.json({ success: true })));

app.get('/api/inventario', (req, res) => {
    db.all('SELECT * FROM inventario ORDER BY nombre', [], (err, rows) => res.json(rows || []));
});

app.post('/api/inventario', (req, res) => {
    db.run('INSERT OR IGNORE INTO inventario (nombre) VALUES (?)', [req.body.nombre], function() {
        res.json({ id: this.lastID || null });
    });
});

app.put('/api/inventario/:id', (req, res) => {
    db.run('UPDATE inventario SET nombre=? WHERE id=?', [req.body.nombre, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/inventario/:id', (req, res) => {
    db.run('DELETE FROM inventario WHERE id=?', req.params.id, () => res.json({ success: true }));
});

// Ruta raíz (importante tenerla explícita)
// Ruta raíz
// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all para cualquier otra ruta (funciona perfecto con Express 4)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`DIVERSIAPP corriendo en puerto ${PORT}`);
    console.log(`URL: https://diversiapp.up.railway.app`);
});



