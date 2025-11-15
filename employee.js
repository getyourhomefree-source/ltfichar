// employee.js (VERSIÓN CORREGIDA Y ROBUSTA)

// --- Elementos del DOM y Variables Globales ---
const loadingOverlay = document.getElementById('loading-overlay');
const statusMessage = document.getElementById('status-message');
const geofenceStatusEl = document.getElementById('geofence-status');
const ficharBtn = document.getElementById('fichar-btn');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

let geofenceData = null; // { lat, lng, radius }
let userPosition = null; // { lat, lng }

// --- INICIALIZACIÓN PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Mostramos el loader al iniciar, aunque ya sea visible por defecto.
        loadingOverlay.classList.remove('hidden');

        // 1. Verificar la sesión del usuario. Si no hay, nos redirigirá.
        await checkUserSession();

        // 2. Cargar la interfaz principal
        updateTime();
        setInterval(updateTime, 1000);
        
        // 3. Inicializar toda la lógica de fichaje (geofence, estado actual)
        await initializeFichaje();
        
        // 4. Cargar el historial reciente
        await loadHistorialReciente();
        
        // 5. Asignar evento al botón de fichar
        ficharBtn.addEventListener('click', handleFichar);

    } catch (error) {
        // --- MEJORA CLAVE: CAPTURA DE ERRORES ---
        // Si cualquier 'await' de arriba falla, caeremos aquí.
        console.error("Error crítico durante la inicialización de la página:", error);
        statusMessage.textContent = `Error al cargar: ${error.message}`;
        ficharBtn.disabled = true;
        ficharBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Error`;

    } finally {
        // --- MEJORA CLAVE: GARANTÍA DE OCULTAR EL LOADER ---
        // Este bloque se ejecuta SIEMPRE, asegurando que el loader desaparezca.
        loadingOverlay.classList.add('hidden');
    }
});


// --- Funciones de UI ---
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Lógica de Inicialización ---
async function initializeFichaje() {
    // Estas funciones ahora tienen su propio try/catch para aislar errores.
    await fetchGeofenceData();
    watchUserPosition(); // Esta función inicia un proceso, no necesita await.
    await loadFicharStatus();
}

async function fetchGeofenceData() {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");

    // -- MEJORA: Hemos añadido supa en lugar de supabase para ser consistentes con el resto de la app --
    // 1. Obtener el id_empresa del perfil del usuario (ya no de una tabla 'empleados')
    const { data: perfil, error: perfilError } = await supa
        .from('perfiles')
        .select('id_empresa')
        .eq('id', user.id)
        .single();
    
    if (perfilError || !perfil || !perfil.id_empresa) {
        // Si no tiene empresa, no podemos obtener geofence, pero no es un error fatal.
        console.warn("Este usuario no está asignado a ninguna empresa.");
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> No estás asignado a una empresa.`;
        return; // Salimos de la función sin error.
    }
    
    // 2. Obtener los datos de geolocalización de la empresa
    const { data: empresa, error: empresaError } = await supa
        .from('empresas')
        .select('latitud_empresa, longitud_empresa, radio_fichaje_metros')
        .eq('id', perfil.id_empresa)
        .single();

    if (empresaError) throw new Error("No se pudieron cargar los datos de la empresa.");

    if (empresa && empresa.latitud_empresa) {
        geofenceData = {
            lat: empresa.latitud_empresa,
            lng: empresa.longitud_empresa,
            radius: empresa.radio_fichaje_metros
        };
    }
}

// --- VERSIÓN DE GEOLOCALIZACIÓN ANTERIOR (RESTAURADA Y ASEGURADA) ---
function watchUserPosition() {
    if (!navigator.geolocation) {
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Tu navegador no soporta geolocalización.`;
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
             // Este es el manejador de errores simple que preferías.
             geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Activa los permisos de ubicación para poder fichar.`;
             ficharBtn.disabled = true; // Si no hay permisos, deshabilitamos el botón.
        },
        { enableHighAccuracy: true }
    );
}

function checkGeofence() {
    if (!geofenceData) {
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> La empresa no ha configurado una zona de fichaje.`;
        geofenceStatusEl.className = 'fichar-status';
        ficharBtn.disabled = false; // Permitir fichar si no hay zona
        return;
    }

    if (!userPosition) {
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Obteniendo tu ubicación...`;
        return;
    }

    const distance = calculateDistance(userPosition.lat, userPosition.lng, geofenceData.lat, geofenceData.lng);
    
    if (distance <= geofenceData.radius) {
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Estás en la zona de fichaje.`;
        geofenceStatusEl.className = 'fichar-status in-zone';
        ficharBtn.disabled = false;
    } else {
        geofenceStatusEl.innerHTML = `<i class="fa-solid fa-times-circle"></i> Fuera de la zona. Distancia: ${distance.toFixed(0)}m.`;
        geofenceStatusEl.className = 'fichar-status out-zone';
        ficharBtn.disabled = true;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- Lógica de Fichaje y de la BD ---
async function loadFicharStatus() {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;

    // -- MEJORA: Usamos el ID de usuario en lugar del email para mayor consistencia --
    const { data: ultimoFichaje, error } = await supa
        .from('fichajes')
        .select('id, hora_entrada')
        .eq('id_usuario', user.id)
        .is('hora_salida', null)
        .order('fecha', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Lanzamos error si no es "fila no encontrada"
    
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
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !userPosition) {
        alert("No se pudo obtener la información del usuario o la ubicación.");
        loadingOverlay.classList.add('hidden');
        return;
    }

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    try {
        if (ficharBtn.dataset.fichajeId) {
            // --- Fichaje de SALIDA ---
            const { error } = await supa
                .from('fichajes')
                .update({ hora_salida: hora, ubicacion_salida_lat: userPosition.lat, ubicacion_salida_lng: userPosition.lng })
                .eq('id', ficharBtn.dataset.fichajeId);
            if (error) throw error;
        } else {
            // --- Fichaje de ENTRADA ---
            const { error } = await supa.from('fichajes').insert({
                id_usuario: user.id, // Usamos ID de usuario
                fecha,
                hora_entrada: hora,
                ubicacion_entrada_lat: userPosition.lat,
                ubicacion_entrada_lng: userPosition.lng
            });
            if (error) throw error;
        }
    } catch (error) {
        alert(`Error al procesar el fichaje: ${error.message}`);
    } finally {
        await loadFicharStatus();
        await loadHistorialReciente();
        loadingOverlay.classList.add('hidden');
    }
}

async function loadHistorialReciente() {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;

    const { data: fichajes, error } = await supa
        .from('fichajes')
        .select('fecha, hora_entrada, hora_salida')
        .eq('id_usuario', user.id) // Usamos ID de usuario
        .order('fecha', { ascending: false })
        .limit(5);
    
    if (error) throw new Error("No se pudo cargar el historial.");

    const tableBody = document.getElementById('historial-table-body');
    tableBody.innerHTML = '';
    if (!fichajes || fichajes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4">No hay registros todavía.</td></tr>`;
        return;
    }

    fichajes.forEach(f => {
        const totalHoras = f.hora_salida ? ((new Date(`1970-01-01T${f.hora_salida}`) - new Date(`1970-01-01T${f.hora_entrada}`)) / 36e5) : 0;
        const row = `
            <tr>
                <td>${new Date(f.fecha + 'T00:00:00').toLocaleDateString()}</td>
                <td>${f.hora_entrada}</td>
                <td>${f.hora_salida || '---'}</td>
                <td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- Autenticación y Sesión ---
async function checkUserSession() {
    // Esta función está en auth.js, pero la replicamos aquí para que la página sea autónoma.
    const { data: { session } } = await supa.auth.getSession();
    if (!session) {
        window.location.replace('index.html');
    } else {
        userEmailEl.textContent = session.user.email;
        // El logout se maneja en auth.js, que debe estar incluido en fichar.html
        if (!logoutBtn.onclick) { // Evitar múltiples listeners
            logoutBtn.addEventListener('click', async () => {
                await supa.auth.signOut();
                window.location.replace('index.html');
            });
        }
    }
}
