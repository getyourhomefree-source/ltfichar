document.addEventListener('DOMContentLoaded', async () => {
    // FIX: Envolvemos la inicialización para evitar que la página se congele si algo falla.
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        // La sesión ya está verificada por auth.js, que se carga antes.
        updateTime();
        setInterval(updateTime, 1000);
        
        await initializeFichaje();
        await loadHistorialReciente();
        
        document.getElementById('fichar-btn').addEventListener('click', handleFichar);
    } catch (error) {
        console.error("Error fatal al cargar la página de fichaje:", error);
        document.getElementById('status-message').textContent = "Error al cargar los datos. Refresca la página.";
    } finally {
        // Esto garantiza que la pantalla de carga SIEMPRE se oculte.
        loadingOverlay.classList.add('hidden');
    }
});

let geofenceData = null;
let userPosition = null;

function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function initializeFichaje() {
    await fetchGeofenceData();
    watchUserPosition();
    await loadFicharStatus();
}

async function fetchGeofenceData() {
    const { data: { user } } = await supa.auth.getUser();
    const { data: perfil } = await supa.from('perfiles').select('id_empresa').eq('id', user.id).single();
    if (!perfil || !perfil.id_empresa) return;

    const { data: empresa } = await supa.from('empresas').select('latitud_empresa, longitud_empresa, radio_fichaje_metros').eq('id', perfil.id_empresa).single();
    if (empresa && empresa.latitud_empresa) {
        geofenceData = { lat: empresa.latitud_empresa, lng: empresa.longitud_empresa, radius: empresa.radio_fichaje_metros };
    }
}

function watchUserPosition() {
    if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización.");
        return;
    }
    navigator.geolocation.watchPosition(
        (position) => {
            userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            checkGeofence();
        },
        () => {
             document.getElementById('geofence-status').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Activa los permisos de ubicación.`;
        },
        { enableHighAccuracy: true }
    );
}

function checkGeofence() {
    const statusEl = document.getElementById('geofence-status');
    const ficharBtn = document.getElementById('fichar-btn');
    if (!geofenceData) {
        statusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> La empresa no ha configurado una zona de fichaje.`;
        ficharBtn.disabled = false;
        return;
    }
    if (!userPosition) return;
    const distance = calculateDistance(userPosition.lat, userPosition.lng, geofenceData.lat, geofenceData.lng);
    if (distance <= geofenceData.radius) {
        statusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Estás en la zona de fichaje.`;
        statusEl.className = 'fichar-status in-zone';
        ficharBtn.disabled = false;
    } else {
        statusEl.innerHTML = `<i class="fa-solid fa-times-circle"></i> Fuera de la zona. Distancia: ${distance.toFixed(0)}m.`;
        statusEl.className = 'fichar-status out-zone';
        ficharBtn.disabled = true;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c;
}

async function loadFicharStatus() {
    const { data: { user } } = await supa.auth.getUser();
    const statusMessage = document.getElementById('status-message');
    const ficharBtn = document.getElementById('fichar-btn');
    const { data: ultimoFichaje } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).is('hora_salida', null).order('fecha', { ascending: false }).limit(1).single();
    if (ultimoFichaje) {
        statusMessage.textContent = `Entrada registrada a las ${ultimoFichaje.hora_entrada}.`;
        ficharBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Fichar Salida`;
        ficharBtn.className = 'btn btn-large fichar-salida';
        ficharBtn.dataset.fichajeId = ultimoFichaje.id;
    } else {
        statusMessage.textContent = 'Listo para empezar tu jornada.';
        ficharBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Fichar Entrada`;
        ficharBtn.className = 'btn btn-large fichar-entrada';
        delete ficharBtn.dataset.fichajeId;
    }
}

async function handleFichar() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !userPosition) { alert("No se pudo obtener la información del usuario o la ubicación."); document.getElementById('loading-overlay').classList.add('hidden'); return; }
    const ficharBtn = document.getElementById('fichar-btn');
    const now = new Date(); const fecha = now.toISOString().split('T')[0]; const hora = now.toTimeString().split(' ')[0];
    try {
        if (ficharBtn.dataset.fichajeId) {
            const { error } = await supa.from('fichajes').update({ hora_salida: hora, ubicacion_salida_lat: userPosition.lat, ubicacion_salida_lng: userPosition.lng }).eq('id', ficharBtn.dataset.fichajeId);
            if (error) throw error;
        } else {
            // FIX: La inserción ahora usa los nombres de columna correctos de la BD.
            const { error } = await supa.from('fichajes').insert({ id_usuario: user.id, fecha: fecha, hora_entrada: hora, ubicacion_entrada_lat: userPosition.lat, ubicacion_entrada_lng: userPosition.lng });
            if (error) throw error;
        }
    } catch(error) {
        alert("Error al procesar el fichaje: " + error.message);
    } finally {
        await loadFicharStatus();
        await loadHistorialReciente();
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

async function loadHistorialReciente() {
    const { data: { user } } = await supa.auth.getUser();
    const tableBody = document.getElementById('historial-table-body');
    // FIX: Añadimos la lógica para calcular horas extra.
    const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single();
    const horasJornada = perfil?.horas_jornada_diaria || 8;
    const { data: fichajes } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).order('fecha', { ascending: false }).limit(5);
    
    if (!fichajes || fichajes.length === 0) { tableBody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`; return; }
    tableBody.innerHTML = ''; // Limpiar antes de añadir
    fichajes.forEach(f => {
        let totalHoras = 0, horasExtra = 0;
        if (f.hora_salida) { totalHoras = ((new Date(`1970-01-01T${f.hora_salida}`) - new Date(`1970-01-01T${f.hora_entrada}`)) / 36e5); horasExtra = Math.max(0, totalHoras - horasJornada); }
        tableBody.innerHTML += `<tr><td>${f.fecha}</td><td>${f.hora_entrada}</td><td>${f.hora_salida || '---'}</td><td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td><td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">${horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}</td></tr>`;
    });
