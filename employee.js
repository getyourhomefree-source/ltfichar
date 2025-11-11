// employee.js
const loadingOverlay = document.getElementById('loading-overlay');
let geofenceData = null; // { lat, lng, radius }
let userPosition = null; // { lat, lng }

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserSession(); // Asegurarse de que el usuario está logueado
    updateTime();
    setInterval(updateTime, 1000);
    
    await initializeFichaje();
    await loadHistorialReciente();
    
    document.getElementById('fichar-btn').addEventListener('click', handleFichar);
    loadingOverlay.classList.add('hidden');
});

// --- Funciones de UI ---
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Lógica de Fichaje y Geolocalización ---
async function initializeFichaje() {
    await fetchGeofenceData();
    watchUserPosition();
    await loadFicharStatus();
}

async function fetchGeofenceData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Obtener el id_empresa del empleado
    const { data: empleado, error: empError } = await supabase
        .from('empleados')
        .select('id_empresa')
        .eq('email', user.email)
        .single();
    
    if (empError || !empleado) {
        console.error("Empleado no encontrado"); return;
    }
    
    // 2. Obtener los datos de geolocalización de la empresa
    const { data: empresa, error: enpError } = await supabase
        .from('empresas')
        .select('latitud_empresa, longitud_empresa, radio_fichaje_metros')
        .eq('id', empleado.id_empresa)
        .single();

    if (empresa && empresa.latitud_empresa) {
        geofenceData = {
            lat: empresa.latitud_empresa,
            lng: empresa.longitud_empresa,
            radius: empresa.radio_fichaje_metros
        };
    }
}

function watchUserPosition() {
    if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización.");
        return;
    }
    navigator.geolocation.watchPosition(
        (position) => {
            userPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
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
        statusEl.className = 'fichar-status';
        ficharBtn.disabled = false; // Permitir fichar si no hay zona
        return;
    }

    if (!userPosition) {
        statusEl.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Obteniendo tu ubicación...`;
        return;
    }

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

// Haversine formula to calculate distance between two lat/lng points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function loadFicharStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const statusMessage = document.getElementById('status-message');
    const ficharBtn = document.getElementById('fichar-btn');

    const { data: ultimoFichaje } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_email', user.email)
        .is('hora_salida', null)
        .order('fecha', { ascending: false })
        .limit(1).single();
    
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
    loadingOverlay.classList.remove('hidden');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userPosition) {
        alert("No se pudo obtener la información del usuario o la ubicación.");
        loadingOverlay.classList.add('hidden');
        return;
    }

    const ficharBtn = document.getElementById('fichar-btn');
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    if (ficharBtn.dataset.fichajeId) {
        // --- Fichaje de SALIDA ---
        const { error } = await supabase
            .from('fichajes')
            .update({ hora_salida: hora })
            .eq('id', ficharBtn.dataset.fichajeId);
        if (error) alert(error.message);
    } else {
        // --- Fichaje de ENTRADA ---
        const { error } = await supabase.from('fichajes').insert({
            empleado_email: user.email,
            fecha,
            hora_entrada: hora,
            ubicacion_lat: userPosition.lat,
            ubicacion_lng: userPosition.lng
        });
        if (error) alert(error.message);
    }
    
    await loadFicharStatus();
    await loadHistorialReciente();
    loadingOverlay.classList.add('hidden');
}

async function loadHistorialReciente() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fichajes } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_email', user.email)
        .order('fecha', { ascending: false })
        .limit(5);

    const tableBody = document.getElementById('historial-table-body');
    tableBody.innerHTML = '';
    if (!fichajes || fichajes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4">No hay registros todavía.</td></tr>`;
        return;
    }

    fichajes.forEach(f => {
        const totalHoras = f.hora_salida ? (new Date(`1970-01-01T${f.hora_salida}`) - new Date(`1970-01-01T${f.hora_entrada}`)) / 36e5 : 0;
        const row = `
            <tr>
                <td>${f.fecha}</td>
                <td>${f.hora_entrada}</td>
                <td>${f.hora_salida || '---'}</td>
                <td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Necesitamos la función checkUserSession también aquí
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    } else {
        document.getElementById('user-email').textContent = session.user.email;
    }
}