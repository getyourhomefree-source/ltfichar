// employee.js (VERSIÓN FINAL, SIMPLIFICADA Y CORRECTA)

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN DE ELEMENTOS DEL DOM ---
    // Hacemos esto DENTRO del listener para garantizar que el DOM esté cargado.
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusMessage = document.getElementById('status-message');
    const geofenceStatusEl = document.getElementById('geofence-status');
    const ficharBtn = document.getElementById('fichar-btn');

    // Variables globales para la lógica de esta página
    let geofenceData = null; // { lat, lng, radius }
    let userPosition = null; // { lat, lng }

    // --- FUNCIÓN DE ARRANQUE DE LA PÁGINA ---
    async function initializePage() {
        try {
            // El script auth.js ya ha verificado la sesión. Si estamos aquí, el usuario está logueado.
            updateTime();
            setInterval(updateTime, 1000);

            await initializeFichajeLogic();
            await loadHistorialReciente();
            
            ficharBtn.addEventListener('click', handleFichar);

        } catch (error) {
            console.error("Error al inicializar la página de fichaje:", error);
            statusMessage.textContent = `Error crítico: ${error.message}`;
            statusMessage.style.color = 'var(--error-color)';
            ficharBtn.disabled = true;
            ficharBtn.innerHTML = `<i class="fa-solid fa-ban"></i> No disponible`;
        } finally {
            // Este es el paso crucial que garantiza que la pantalla de carga siempre desaparezca.
            loadingOverlay.classList.add('hidden');
        }
    }

    // --- LÓGICA DE FICHAJE ---

    function updateTime() {
        document.getElementById('current-time').textContent = new Date().toLocaleTimeString();
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    async function initializeFichajeLogic() {
        await fetchGeofenceData();
        watchUserPosition();
        await loadFicharStatus();
    }

    async function fetchGeofenceData() {
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return; // Doble chequeo por si acaso

        const { data: perfil } = await supa.from('perfiles').select('id_empresa').eq('id', user.id).single();
        if (!perfil || !perfil.id_empresa) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> No estás asignado a una empresa. Contacta a tu manager.`;
            return;
        }

        const { data: empresa } = await supa.from('empresas').select('latitud_empresa, longitud_empresa, radio_fichaje_metros').eq('id', perfil.id_empresa).single();
        if (empresa && empresa.latitud_empresa) {
            geofenceData = { lat: empresa.latitud_empresa, lng: empresa.longitud_empresa, radius: empresa.radio_fichaje_metros };
        }
    }

    // --- GEOLOCALIZACIÓN (CÓDIGO ANTERIOR RESTAURADO Y SEGURO) ---
    function watchUserPosition() {
        if (!navigator.geolocation) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Tu navegador no soporta geolocalización.`;
            ficharBtn.disabled = true;
            return;
        }
        navigator.geolocation.watchPosition(
            (position) => {
                userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
                checkGeofence();
            },
            () => {
                geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Debes activar los permisos de ubicación para fichar.`;
                ficharBtn.disabled = true;
            },
            { enableHighAccuracy: true }
        );
    }

    function checkGeofence() {
        if (!userPosition) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Obteniendo tu ubicación...`;
            return;
        }
        if (!geofenceData) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> Fichaje permitido desde cualquier ubicación.`;
            ficharBtn.disabled = false;
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
        const R = 6371e3;
        const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // --- INTERACCIÓN CON SUPABASE ---
    async function loadFicharStatus() {
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return;
        
        const { data: ultimoFichaje } = await supa.from('fichajes').select('id, hora_entrada').eq('id_usuario', user.id).is('hora_salida', null).maybeSingle();
        
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
        loadingOverlay.classList.remove('hidden'); // Muestra loader para la operación
        if (!userPosition) {
            alert("No se ha podido obtener tu ubicación. Activa los permisos y espera un momento.");
            loadingOverlay.classList.add('hidden');
            return;
        }
        const { data: { user } } = await supa.auth.getUser();
        const now = new Date(), fecha = now.toISOString().split('T')[0], hora = now.toTimeString().split(' ')[0];
        
        try {
            if (ficharBtn.dataset.fichajeId) {
                const { error } = await supa.from('fichajes').update({ hora_salida: hora }).eq('id', ficharBtn.dataset.fichajeId);
                if (error) throw error;
            } else {
                const { error } = await supa.from('fichajes').insert({ id_usuario: user.id, fecha, hora_entrada: hora, ubicacion_entrada_lat: userPosition.lat, ubicacion_entrada_lng: userPosition.lng });
                if (error) throw error;
            }
        } catch (error) {
            alert(`Error al procesar el fichaje: ${error.message}`);
        } finally {
            await loadFicharStatus();
            await loadHistorialReciente();
            loadingOverlay.classList.add('hidden'); // Oculta loader al terminar
        }
    }

async function loadHistorialReciente() {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;

    // 1. Obtenemos las horas de jornada del perfil del usuario
    const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single();
    const horasJornada = perfil?.horas_jornada_diaria || 8; // Default de 8 horas si no está definido

    // 2. Obtenemos los últimos 5 fichajes
    const { data: fichajes } = await supa
        .from('fichajes')
        .select('fecha, hora_entrada, hora_salida')
        .eq('id_usuario', user.id)
        .order('fecha', { ascending: false })
        .limit(5);

    const tableBody = document.getElementById('historial-table-body');
    tableBody.innerHTML = '';
    if (!fichajes || fichajes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`;
        return;
    }

    // 3. Actualizamos la cabecera de la tabla en el HTML
    document.querySelector('#historial-table-body').parentElement.querySelector('thead tr').innerHTML = `
        <th>Fecha</th>
        <th>Entrada</th>
        <th>Salida</th>
        <th>Total Horas</th>
        <th>Horas Extra</th>
    `;

    fichajes.forEach(f => {
        let totalHoras = 0;
        let horasExtra = 0;
        if (f.hora_salida) {
            totalHoras = ((new Date(`1970-01-01T${f.hora_salida}`) - new Date(`1970-01-01T${f.hora_entrada}`)) / 36e5);
            horasExtra = Math.max(0, totalHoras - horasJornada);
        }

        const row = `
            <tr>
                <td>${f.fecha}</td>
                <td>${f.hora_entrada}</td>
                <td>${f.hora_salida || '---'}</td>
                <td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td>
                <td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">
                    ${horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
