// server.js → ORDEN CORREGIDO PARA RAILWAY (copia desde aquí)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (ESTE ORDEN ES CLAVE)
app.use(express.json());
app.use(cors());

// ¡¡PRIMER CAMBIO: express.static AL PRINCIPIO!! (sirve index.html, css, js automáticamente)
app.use(express.static(__dirname));

// Base de datos (sin cambios)
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
    // Reemplaza la tabla inventario antigua por esta:
db.run(`CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE,
    cantidad INTEGER DEFAULT 0
)`);
});

// Rutas API (sin cambios)
app.get('/api/ventas', (req, res) => {
    db.all('SELECT * FROM ventas ORDER BY id DESC', [], (err, rows) => res.json(rows || []));
});

app.post('/api/ventas', (req, res) => {
    const v = req.body;
    db.run(`INSERT INTO ventas (cliente, productos, costo, precio_total, envio, comision, ganancia, comision_videos, comision_mensajes, neto, guia, tipo_envio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [v.cliente, v.productos, v.costo, v.precio_total, v.envio, v.comision, v.ganancia || 0, v.comision_videos || 0, v.comision_mensajes || 0, v.neto, v.guia, v.tipo_envio],
        function(err) { res.json(err ? { error: err.message } : { id: this.lastID }); }
    );
});

app.put('/api/ventas/:id', (req, res) => {
    const v = req.body;
    db.run(`UPDATE ventas SET cliente=?, productos=?, costo=?, precio_total=?, envio=?, comision=?, ganancia=?, comision_videos=?, comision_mensajes=?, neto=?, guia=?, tipo_envio=? WHERE id=?`, 
    [v.cliente, v.productos, v.costo, v.precio_total, v.envio, v.comision, v.ganancia || 0, v.comision_videos || 0, v.comision_mensajes || 0, v.neto, v.guia, v.tipo_envio, req.params.id],
        () => res.json({ success: true })
    );
});

app.delete('/api/ventas/:id', (req, res) => db.run('DELETE FROM ventas WHERE id=?', req.params.id, () => res.json({ success: true })));
app.delete('/api/ventas', (req, res) => db.run('DELETE FROM ventas', () => res.json({ success: true })));

// === INVENTARIO CON CANTIDAD ===
app.get('/api/inventario', (req, res) => {
    db.all('SELECT * FROM inventario ORDER BY nombre', [], (err, rows) => res.json(rows || []));
});

app.post('/api/inventario', (req, res) => {
    const { nombre, cantidad } = req.body;
    db.run('INSERT OR IGNORE INTO inventario (nombre, cantidad) VALUES (?, ?)', 
        [nombre, cantidad || 1], 
        function() { res.json({ id: this.lastID || null }); }
    );
});

// Nuevo: sumar o restar cantidad
app.put('/api/inventario/cantidad/:id', (req, res) => {
    const { cambio } = req.body; // +1 o -1
    db.run('UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?', 
        [cambio, req.params.id], 
        () => res.json({ success: true })
    );
});

app.delete('/api/inventario/:id', (req, res) => {
    db.run('DELETE FROM inventario WHERE id=?', req.params.id, () => res.json({ success: true }));
});

// Health check (sin cambios)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'DIVERSIAPP viva y funcionando en Railway' });
});

// ¡¡SEGUNDO CAMBIO: Rutas de SPA al final, como fallback!! (no usar * en get)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback middleware para cualquier ruta no encontrada (SPA routing)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor (sin cambios)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`DIVERSIAPP corriendo en puerto ${PORT}`);
    console.log(`URL: https://diversiapp.up.railway.app`);
    console.log(`Health check: https://diversiapp.up.railway.app/health`);
});


