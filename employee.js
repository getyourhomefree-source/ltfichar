// employee.js (VERSIÓN FINAL CON TIMESTAMP COMPLETO Y MANTENIENDO TODA LA LÓGICA)

document.addEventListener('DOMContentLoaded', () => {
    //            
            ficharBtn.addEventListener('click', handleFichar);

        } catch (error) {
            console.error("Error al inicializar la página de fichaje:", error);
            statusMessage.textContent = `Error crítico: ${error.message}`;
            statusMessage.style.color = 'var(--error-color)';
            ficharBtn.disabled = true;
            ficharBtn.innerHTML = `<i class="fa-solid fa-ban"></i> No disponible`;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function updateTime() {
        const now = new Date();
        currentTime --- ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusMessage = document.getElementById('status-message');
    const geofenceStatusEl = document.getElementById('geofence-status');
    const ficharBtn = document.getElementById('fichar-btn');
    const currentTimeElEl.textContent = now.toLocaleTimeString('es-ES');
        currentDateEl.textContent = now.toLocale = document.getElementById('current-time');
    const currentDateEl = document.getElementById('current-date');
    constDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    async function initializeFichajeLogic() {
        await fetchGeofenceData();
        watchUserPosition();
        await loadFicharStatus();
    }

    // --- LÓGICA DE GEOLOCALIZACIÓN (Sin cambios) ---

    async function fetchGeofenceData() {
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return;

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
            geofence historialTableBody = document.getElementById('historial-table-body');

    // Variables de estado de la página
    let geofenceData = null; // { lat, lng, radius }
    let userPosition = null; // { lat, lng }

    // --- FUNCIÓN DE ARRANQUE DE LA PÁGINA ---
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
            statusMessage.style.color = 'var(--error-color)';
            ficharBtn.disabled = true;
            ficharBtn.innerHTML = `<i class="fa-solid fa-ban"></i> No disponible`;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

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

    // --- LÓGICA DE GEOLOCALIZACIÓN (SIN CAMBIOS) ---
    async function fetchGeofenceData() {
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return;
        const { data: perfil } = await supa.from('perfiles').select('id_empresa').eq('id', user.id).single();
        if (!perfil || !perfil.id_empresa) {
            geofenceStatusEl.innerHTML = `<i classStatusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> Fichaje permitido desde cualquier ubicación.`;
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
        const a="fa-solid fa-triangle-exclamation"></i> No estás asignado a una empresa.`;
            return;
        }
        const { data: empresa } = await supa.from('empresas').select('latitud_empresa, longitud_empresa, radio_fichaje_metros').eq('id', perfil.id_empresa).single();
        if (empresa && empresa.latitud_empresa) {
            geofenceData = { lat: empresa.latitud_empresa, lng: empresa.longitud_empresa, radius: empresa.radio_fichaje_metros };
        }
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
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> F = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // --- INTERACCIÓN CON SUPABASE (FICHAJES E HISTORIAL) ---

    async function loadFicharStatus() {
        const { data: { userichaje permitido desde cualquier ubicación.`;
            ficharBtn.disabled = false;
            return;
        }
        const distance = calculateDistance(userPosition.lat, userPosition.lng, geofenceData.lat, geofenceData.lng);
        if (distance <= geofenceData.radius) {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Estás en la zona de fichaje.`;
            geofenceStatusEl.className = 'fichar-status in-zone';
 } } = await supa.auth.getUser();
        if (!user) return;
        
        const { data: ultimoFichaje } = await supa.from('fichajes').select('id, hora_entrada').eq('id_usuario', user.id).is('hora_salida', null).maybeSingle();
        
        if (ultimoFichaje) {
            // Formateamos el timestamp para mostrar solo la hora de entrada de            ficharBtn.disabled = false;
        } else {
            geofenceStatusEl.innerHTML = `<i class="fa-solid fa-times-circle"></i> Fuera de la zona. Distancia: ${distance.toFixed(0)}m.`;
            geofenceStatusEl.className = 'fichar-status out-zone';
            ficharBtn.disabled = true;
        }
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e forma amigable
            const horaEntrada = new Date(ultimoFichaje.hora_entrada).toLocaleTimeString('es-ES');
            statusMessage.textContent = `Entrada registrada a las ${horaEntrada}.`;
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
        
        const { data: { user } } = await supa.auth.getUser();
        
        // ===================================================================
        // ---3;
        const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // --- INTERACCIÓN CON SUPABASE (CON LAS MODIFICACIONES CLAVE) ---

    async function loadFicharStatus() {
        const { data: { user } } = await supa.auth.getUser();
        if (!user) return;
        const { data: ultimoFichaje } = await supa.from('fichajes').select('id, hora_entrada').eq('id_usuario', user.id).is('hora_sal MODIFICACIÓN CLAVE: Usamos el timestamp completo en formato ISO ---
        const timestampCompleto = new Date().toISOString();
        // ===================================================================

        try {
            if (ficharBtn.dataset.fichajeId) {
                // Fichaje de SALIDA: Actualizamos con el timestamp completo.
                const {ida', null).maybeSingle();
        if (ultimoFichaje) {
            // Formateamos la hora para mostrarla de forma amigable
            const horaEntrada = new Date(ultimoFichaje.hora_entrada).toLocaleTimeString('es-ES');
            statusMessage.textContent = `Entrada registrada a las ${horaEntrada}.`;
            ficharBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket error } = await supa.from('fichajes').update({ 
                    hora_salida: timestampCompleto, 
                    ubicacion_salida_lat: userPosition.lat,
                    ubicacion_salida_lng: userPosition.lng
                }).eq('id', ficharBtn.dataset.fichajeId);
                if (error) throw error;
            } else {
                // Fichaje de ENTRADA: Insertamos el timestamp completo.
                // Mantenemos la columna 'fecha' por compatibilidad, rellenándola con la parte de la fecha del timestamp.
                const { error } = await supa.from('fichajes').insert({ 
                    id_usuario: user.id, 
                    fecha: timestampCompleto.split('T')[0], // ej: "2023-10-27"
                    hora_entrada: timestampCompleto, 
                    ubicacion_entrada_lat: userPosition.lat, 
                    ubicacion_entrada_lng: userPosition.lng 
                });
                if (error) throw error;
            }
        } catch ("></i> Fichar Salida`;
            ficharBtn.className = 'btn btn-large fichar-salida';
            ficharBtn.dataset.fichajeId = ultimoFichaje.id;
        } else {
            statusMessage.textContent = 'Listo para empezar tu jornada.';
            ficharBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Fichar Entrada`;
            ficharBtn.className = 'btn btn-large fichar-entrada';
            delete ficharBtn.dataset.fichajeId;
        }
    }
    
    // --- CAMBIO CLAVE #1 ---
    // Esta función ahora envía el timestamp completo a Supabase.
    async function handleFichar() {
        loadingOverlay.classList.remove('hidden');
        if (!userPosition) {
            alert("No se ha podido obtener tu ubicación. Activa los permisos y espera un momento.");
            loadingOverlay.classList.add('hidden');
            return;
        }
        
error) {
            alert(`Error al procesar el fichaje: ${error.message}`);
        } finally {
            await loadFicharStatus();
            await loadHistorialReciente();
            loadingOverlay.classList.add('hidden');
        }
    }

    async function loadHistorialReciente() {
        const { data: { user } } = await supa.auth.getUser();
        
        const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single();
        const horasJornada = perfil?.horas_jornada_diaria || 8;

        const { data: fichajes } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).order('hora_entrada', { ascending: false }).limit(5);
        
        historialTableBody.innerHTML = '';
        if (!fichajes || fichajes.length === 0) {
            historialTableBody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`;
            return;
        }

        fichajes.forEach(f => {
            let totalHoras = 0, horasExtra = 0;
            
            // ===================================================================
            // --- MODIFICACIÓN CLAVE: Procesamos los timestamps para la visualización ---
            const entradaDate = new Date(f.hora_entrada);
            const salidaDate = f.hora_salida ? new Date(f.hora_salida) : null;

            // Formateamos para mostrar solo la hora en la tabla
            const horaEntradaFormateada = entradaDate.toLocaleTimeString('es-ES');
            const horaSalidaFormateada = salidaDate ? salidaDate.toLocaleTimeString('es-ES') : '---';
            // ===================================================================

            if (salidaDate) {
                // El cálculo de horas es ahora más preciso al restar objetos Date
                totalHoras = (salidaDate - entradaDate        const { data: { user } } = await supa.auth.getUser();
        
        // MEJORA: Creamos un timestamp completo en formato ISO 8601.
        // Ejemplo: "2023-10-27T16:45:02.123Z". Este es el formato que PostgreSQL
        // entiende a la perfección para los campos de tipo 'timestamp with time zone'.
        const timestampCompleto = new Date().toISOString();
        
        try {
            if (ficharBtn.dataset.fichajeId) {
                // Fichaje de SALIDA: Actualizamos 'hora_salida' con el timestamp completo.
                const { error } = await supa.from('fichajes').update({ 
                    hora_salida: timestampCompleto,
                    ubicacion_salida_lat: userPosition.lat,
                    ubicacion_salida_lng: userPosition.lng
                }).eq('id', ficharBtn.dataset.fichajeId);
                if (error) throw error;
            } else {
                // Fichaje de ENTRADA: Insertamos el timestamp completo en 'hora_entrada'.
                const { error } = await supa.from('fichajes').insert({ 
                    id_usuario: user.id, 
                    // NOTA: La columna 'fecha' se vuelve redundante, pero la seguimos rellenando
                    // para no romper nada si alguna consulta la usa. Se extrae del timestamp.
                    fecha: timestampCompleto.split('T')[0], 
                    hora_entrada: timestampCompleto, 
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
            ) / 36e5;
                horasExtra = Math.max(0, totalHoras - horasJornada);
            }

            historialTableBody.innerHTML += `
                <tr>
                    <td>${entradaDate.toLocaleDateString('es-ES')}</td>
                    <td>${horaEntradaFormateada}</td>
                    <td>${horaSalidaFormateada}</td>
                    <td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td>
                    <td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">
                        ${totalHoras > 0 && horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}
                    </td>
                </tr>
            `;
        });
    }

    // --- Iniciar la ejecución de la página ---
    initializePage();
});
