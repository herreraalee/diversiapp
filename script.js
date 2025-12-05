document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');

    if (localStorage.getItem('diversi_logged') === 'true') {
        loginScreen.style.display = 'none';
        app.style.display = 'block';
    }

    document.getElementById('loginBtn').addEventListener('click', () => {
        const user = document.getElementById('usernameInput').value.trim();
        const pass = document.getElementById('passwordInput').value;

        if (user === 'usuario' && pass === 'usuario') {
            localStorage.setItem('diversi_logged', 'true');
            loginScreen.style.display = 'none';
            app.style.display = 'block';
        } else {
            document.getElementById('errorMsg').style.display = 'block';
        }
    });

    document.getElementById('cerrarSesion').addEventListener('click', () => {
        localStorage.removeItem('diversi_logged');
        location.reload();
    });

    const form = document.getElementById('ventaForm');
    const tablaBody = document.querySelector('#tablaVentas tbody');
    const addProductBtn = document.getElementById('addProductBtn');
    const productosContainer = document.getElementById('productosContainer');
    const productosChartCanvas = document.getElementById('productosChart');
    const eliminarTodasBtn = document.getElementById('eliminarTodasBtn');
    const exportarBtn = document.getElementById('exportarBtn');
    const btnAgregarInventario = document.getElementById('btnAgregarInventario');
    const inputProductoNombre = document.getElementById('productoNombre');
    const tablaInventarioBody = document.querySelector('#tablaInventario tbody');
    const ctx = productosChartCanvas.getContext('2d');

    const totales = {
        ventas: document.getElementById('totalVentas'),
        envios: document.getElementById('totalEnvios'),
        comisiones: document.getElementById('totalComisiones'),
        ganancias: document.getElementById('totalGanancias'),
        costos: document.getElementById('totalCostos'),
        comisionVideos: document.getElementById('totalComisionVideos'),
        comisionMensajes: document.getElementById('totalComisionMensajes'),
        neto: document.getElementById('totalNeto')
    };

    let ventas = [];
    let inventario = [];
    let productosChart;
    let editingVentaId = null;
    let editingInventarioId = null;

    const cargarTodo = async() => {
        try {
            const [resVentas, resInventario] = await Promise.all([
                fetch('/api/ventas').then(res => res.json()),
                fetch('/api/inventario').then(res => res.json())
            ]);
            ventas = resVentas || [];
            inventario = resInventario || [];

            renderVentas();
            renderInventario();
            actualizarTotales();
            actualizarGrafica();
            actualizarSugerencias();
        } catch (err) {
            console.error('Error cargando datos:', err);
            alert('Error de conexión con el servidor. Verifica si node server.js está corriendo.');
        }
    };

    cargarTodo();

    addProductBtn.addEventListener('click', () => {
        const item = document.createElement('div');
        item.className = 'producto-item';
        item.innerHTML = `
            <div class="input-group"><label>Nombre</label><input type="text" class="producto-nombre" list="productoSuggestions" required></div>
            <div class="input-group"><label>Costo</label><input type="number" class="producto-costo" step="0.01" required></div>
            <button type="button" class="remove-item">Eliminar</button>
        `;
        productosContainer.appendChild(item);
        item.querySelector('.remove-item').onclick = () => item.remove();
        actualizarSugerencias();
    });

    form.addEventListener('submit', async(e) => {
        e.preventDefault();
        const cliente = document.getElementById('cliente').value.trim();
        const precio_total = parseFloat(document.getElementById('precio_total').value);
        const guia = document.getElementById('guia').value.trim() || 'N/A';
        const tipo_envio = document.getElementById('envioTipo').value;
        const ganancia = parseFloat(document.getElementById('ganancia').value) || 0;
        const comision_videos = parseFloat(document.getElementById('comision_videos').value) || 0;
        const comision_mensajes = parseFloat(document.getElementById('comision_mensajes').value) || 0;

        const productos = Array.from(productosContainer.querySelectorAll('.producto-item')).map(item => ({
            nombre: item.querySelector('.producto-nombre').value.trim(),
            costo: parseFloat(item.querySelector('.producto-costo').value) || 0
        })).filter(p => p.nombre && p.costo > 0);

        if (!cliente || productos.length === 0 || isNaN(precio_total)) return alert('Completa todos los campos');

        const costoTotal = productos.reduce((s, p) => s + p.costo, 0);
        let envio = 0,
            comision = 0;
        switch (tipo_envio) {
            case 'cargo':
                envio = 24;
                comision = precio_total * 0.04;
                break;
            case 'mensajeria25':
                envio = 25;
                break;
            case 'mensajeria30':
                envio = 30;
                break;
            case 'mensajeria35':
                envio = 35;
                break;
            case 'mensajeria40':
                envio = 40;
                break;
        }

        const neto = precio_total - envio - comision - ganancia - costoTotal - comision_videos - comision_mensajes;

        const venta = { cliente, productos: JSON.stringify(productos), costo: costoTotal, precio_total, envio, comision, ganancia, comision_videos, comision_mensajes, neto, guia, tipo_envio };

        try {
            const method = editingVentaId ? 'PUT' : 'POST';
            const url = editingVentaId ? `/api/ventas/${editingVentaId}` : '/api/ventas';
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(venta) });
            editingVentaId = null;
            form.reset();
            productosContainer.innerHTML = `
                <div class="producto-item">
                    <div class="input-group"><label>Nombre del producto</label><input type="text" class="producto-nombre" list="productoSuggestions" required></div>
                    <div class="input-group"><label>Costo</label><input type="number" class="producto-costo" step="0.01" required></div>
                </div>
            `;
            cargarTodo();
        } catch (err) {
            alert('Error guardando venta: ' + err.message);
        }
    });

    btnAgregarInventario.addEventListener('click', async() => {
        const nombre = inputProductoNombre.value.trim();
        if (!nombre) return alert('Escribe el nombre del producto');

        try {
            const method = editingInventarioId ? 'PUT' : 'POST';
            const url = editingInventarioId ? `/api/inventario/${editingInventarioId}` : '/api/inventario';
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
            editingInventarioId = null;
            btnAgregarInventario.textContent = 'Agregar al Inventario';
            inputProductoNombre.value = '';
            cargarTodo();
        } catch (err) {
            alert('Error en inventario: ' + err.message);
        }
    });

    function renderVentas() {
        tablaBody.innerHTML = '';
        ventas.forEach(v => {
            const prods = JSON.parse(v.productos || '[]').map(p => `${p.nombre} (Q${parseFloat(p.costo).toFixed(2)})`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${v.id}</td><td>${v.cliente}</td><td>${prods}</td><td>Q${parseFloat(v.costo).toFixed(2)}</td><td>Q${parseFloat(v.precio_total).toFixed(2)}</td><td>Q${parseFloat(v.envio).toFixed(2)}</td><td>Q${parseFloat(v.comision).toFixed(2)}</td><td>Q${parseFloat(v.ganancia).toFixed(2)}</td><td>Q${(v.comision_videos || 0).toFixed(2)}</td><td>Q${(v.comision_mensajes || 0).toFixed(2)}</td><td>Q${parseFloat(v.neto).toFixed(2)}</td><td>${v.guia}</td><td><button class="edit-btn" data-id="${v.id}">Editar</button> <button class="delete-btn" data-id="${v.id}">Eliminar</button></td>`;
            tablaBody.appendChild(tr);
        });
        document.querySelectorAll('.edit-btn').forEach(b => b.onclick = editarVenta);
        document.querySelectorAll('.delete-btn').forEach(b => b.onclick = eliminarVenta);
    }

    function renderInventario() {
        tablaInventarioBody.innerHTML = '';
        inventario.forEach(i => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i.nombre}</td><td><button class="edit-inv" data-id="${i.id}">Editar</button> <button class="del-inv" data-id="${i.id}">Eliminar</button></td>`;
            tablaInventarioBody.appendChild(tr);
        });
        document.querySelectorAll('.edit-inv').forEach(b => b.onclick = () => {
            inputProductoNombre.value = inventario.find(x => x.id == b.dataset.id).nombre;
            editingInventarioId = b.dataset.id;
            btnAgregarInventario.textContent = 'Actualizar Producto';
        });
        document.querySelectorAll('.del-inv').forEach(b => b.onclick = async() => {
            if (confirm('¿Eliminar del inventario?')) {
                await fetch(`/api/inventario/${b.dataset.id}`, { method: 'DELETE' });
                cargarTodo();
            }
        });
    }

    function editarVenta(e) {
        const v = ventas.find(x => x.id == e.target.dataset.id);
        document.getElementById('cliente').value = v.cliente;
        document.getElementById('precio_total').value = v.precio_total;
        document.getElementById('guia').value = v.guia;
        document.getElementById('envioTipo').value = v.tipo_envio;
        document.getElementById('ganancia').value = v.ganancia || 0;
        document.getElementById('comision_videos').value = v.comision_videos || 0;
        document.getElementById('comision_mensajes').value = v.comision_mensajes || 0;

        productosContainer.innerHTML = '';
        JSON.parse(v.productos || '[]').forEach(p => {
            const div = document.createElement('div');
            div.className = 'producto-item';
            div.innerHTML = `<div class="input-group"><label>Nombre</label><input type="text" class="producto-nombre" value="${p.nombre}" list="productoSuggestions" required></div>
                             <div class="input-group"><label>Costo</label><input type="number" class="producto-costo" value="${p.costo}" step="0.01" required></div>
                             <button type="button" class="remove-item">Eliminar</button>`;
            productosContainer.appendChild(div);
            div.querySelector('.remove-item').onclick = () => div.remove();
        });
        editingVentaId = v.id;
    }

    async function eliminarVenta(e) {
        if (confirm('¿Eliminar esta venta?')) {
            await fetch(`/api/ventas/${e.target.dataset.id}`, { method: 'DELETE' });
            cargarTodo();
        }
    }

    eliminarTodasBtn.onclick = async() => {
        if (confirm('¿ELIMINAR TODAS LAS VENTAS?')) {
            await fetch('/api/ventas', { method: 'DELETE' });
            cargarTodo();
        }
    };

    exportarBtn.onclick = () => {
        let csv = 'ID,Cliente,Productos,Costo,Total,Envío,Comisión,Ganancia,Com.Martin,Com.Keyla,Neto,Guía\n';
        ventas.forEach(v => {
            const prods = JSON.parse(v.productos || '[]').map(p => `${p.nombre} (Q${p.costo.toFixed(2)})`).join(' | ');
            csv += `${v.id},"${v.cliente}","${prods}",${v.costo},${v.precio_total},${v.envio},${v.comision},${v.ganancia},${v.comision_videos||0},${v.comision_mensajes||0},${v.neto},"${v.guia}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ventas_diversi.csv';
        a.click();
    };

    function actualizarSugerencias() {
        const dl = document.getElementById('productoSuggestions');
        dl.innerHTML = '';
        inventario.forEach(i => dl.innerHTML += `<option value="${i.nombre}">`);
    }

    function actualizarTotales() {
        const t = ventas.reduce((a, v) => ({
            ventas: a.ventas + v.precio_total,
            envios: a.envios + v.envio,
            comisiones: a.comisiones + v.comision,
            ganancias: a.ganancias + v.ganancia,
            costos: a.costos + v.costo,
            comisionVideos: a.comisionVideos + (v.comision_videos || 0),
            comisionMensajes: a.comisionMensajes + (v.comision_mensajes || 0),
            neto: a.neto + v.neto
        }), { ventas: 0, envios: 0, comisiones: 0, ganancias: 0, costos: 0, comisionVideos: 0, comisionMensajes: 0, neto: 0 });
        Object.keys(totales).forEach(k => totales[k].textContent = t[k].toFixed(2));
    }

    function actualizarGrafica() {
        const count = {};
        ventas.forEach(v => JSON.parse(v.productos || '[]').forEach(p => count[p.nombre] = (count[p.nombre] || 0) + 1));
        const labels = Object.keys(count);
        const data = Object.values(count);
        if (productosChart) productosChart.destroy();
        productosChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Vendidos', data, backgroundColor: '#00ffff88', borderColor: '#00ffff', borderWidth: 2 }] },
            options: { responsive: true, scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } } }
        });
    }
});