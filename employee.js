// employee.js (VERSIÓN FINAL, ROBUSTA Y CORREGIDA CON 'supa')

document.addEventListener('DOMContentLoaded', () => {
    // ... (declaraciones de elementos del DOM sin cambios)
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusMessage = document.getElementById('status-message');
    const geofenceStatusEl = document.getElementById('geofence-status');
    const ficharBtn = document.getElementById('fichar-btn');
    const currentTimeEl = document.getElementById('current-time');
    const currentDateEl = document.getElementById('current-date');
    const historialTableBody = document.getElementById('historial-table-body');

    let geofenceData = null;
    let userPosition = null;

    async function initializePage() {
        try {
            updateTime();
            setInterval(updateTime, 1000);
            await initializeFichajeLogic();
            await loadHistorialReciente();
            ficharBtn.addEventListener('click', handleFichar);
        } catch (error) {
            console.error("Error al inicializar la página de fichaje:", error);
            statusMessage.textContent = `Error crítico: ${error.message}`;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    // ... (resto de funciones con 'supabase' reemplazado por 'supa')

    async function fetchGeofenceData() {
        const { data: { user } } = await supa.auth.getUser(); // CORREGIDO
        if (!user) return;

        const { data: perfil } = await supa.from('perfiles').select('id_empresa').eq('id', user.id).single(); // CORREGIDO
        if (!perfil || !perfil.id_empresa) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> No estás asignado a una empresa. Contacta a tu manager.`;
            return;
        }

        const { data: empresa } = await supa.from('empresas').select('latitud_empresa, longitud_empresa, radio_fichaje_metros').eq('id', perfil.id_empresa).single(); // CORREGIDO
        if (empresa && empresa.latitud_empresa) {
            geofenceData = { lat: empresa.latitud_empresa, lng: empresa.longitud_empresa, radius: empresa.radio_fichaje_metros };
        }
    }
    
    // ... (watchUserPosition, checkGeofence, calculateDistance no cambian)
    function updateTime() {
        const now = new Date();
        currentTimeEl.textContent = now.toLocaleTimeString('es-ES');
        currentDateEl.textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    async function initializeFichajeLogic() {
        await fetchGeofenceData();
        watchUserPosition();
        await loadFicharStatus();
    }
    function watchUserPosition() {
        if (!navigator.geolocation) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-ban"></i> Tu navegador no soporta geolocalización.`;
            ficharBtn.disabled = true;
            return;
        }
        navigator.geolocation.watchPosition(
            (position) => {
                userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
                checkGeofence();
            },
            () => {
                geofenceStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Activa los permisos de ubicación para fichar.`;
                ficharBtn.disabled = true;
            },
            { enableHighAccuracy: true }
        );
    }

    function checkGeofence() {
        if (!userPosition) return;

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
        const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    // ...

    async function loadFicharStatus() {
        const { data: { user } } = await supa.auth.getUser(); // CORREGIDO
        if (!user) return;
        
        const { data: ultimoFichaje } = await supa.from('fichajes').select('id, hora_entrada').eq('id_usuario', user.id).is('hora_salida', null).maybeSingle(); // CORREGIDO
        
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
        if (!userPosition) {
            alert("No se ha podido obtener tu ubicación. Activa los permisos y espera un momento.");
            loadingOverlay.classList.add('hidden');
            return;
        }
        
        const { data: { user } } = await supa.auth.getUser(); // CORREGIDO
        const now = new Date(), fecha = now.toISOString().split('T')[0], hora = now.toTimeString().split(' ')[0];
        
        try {
            if (ficharBtn.dataset.fichajeId) {
                const { error } = await supa.from('fichajes').update({ hora_salida: hora, ubicacion_salida_lat: userPosition.lat, ubicacion_salida_lng: userPosition.lng }).eq('id', ficharBtn.dataset.fichajeId); // CORREGIDO
                if (error) throw error;
            } else {
                const { error } = await supa.from('fichajes').insert({ id_usuario: user.id, fecha, hora_entrada: hora, ubicacion_entrada_lat: userPosition.lat, ubicacion_entrada_lng: userPosition.lng }); // CORREGIDO
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
        const { data: { user } } = await supa.auth.getUser(); // CORREGIDO
        const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single(); // CORREGIDO
        const horasJornada = perfil?.horas_jornada_diaria || 8;
        const { data: fichajes } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).order('fecha', { ascending: false }).limit(5); // CORREGIDO
        
        historialTableBody.innerHTML = '';
        if (!fichajes || fichajes.length === 0) {
            historialTableBody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`;
            return;
        }

        fichajes.forEach(f => {
            let totalHoras = 0, horasExtra = 0;
            if (f.hora_salida) {
                const entrada = new Date(`1970-01-01T${f.hora_entrada}Z`);
                const salida = new Date(`1970-01-01T${f.hora_salida}Z`);
                totalHoras = (salida - entrada) / 36e5;
                horasExtra = Math.max(0, totalHoras - horasJornada);
            }
            historialTableBody.innerHTML += `<tr><td>${f.fecha}</td><td>${f.hora_entrada}</td><td>${f.hora_salida || '---'}</td><td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td><td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">${totalHoras > 0 && horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}</td></tr>`;
        });
    }

    initializePage();
});
