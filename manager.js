// manager.js (VERSIÓN RESTAURADA CON CORRECCIÓN EN LA CARGA DE EMPLEADOS)

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    let map, marker, circle;
    let companyData = {};

    try {
        companyData = await loadCompanyData();
        if (companyData) {
            await loadEmployees();
            initializeMap();
            document.getElementById('invite-form').addEventListener('submit', handleInvite);
            document.getElementById('save-location-btn').addEventListener('click', saveLocation);
            document.getElementById('radius').addEventListener('input', updateCircleRadius);
            
            // Usar delegación de eventos para los botones de guardar horas
            document.getElementById('manager-table-body').addEventListener('click', (event) => {
                if (event.target && event.target.classList.contains('btn-save-horas')) {
                    handleSaveHoras(event.target);
                }
            });
        }
    } catch(error) {
        console.error("Error al cargar panel de manager", error);
        alert("Error crítico al cargar el panel de manager.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }

    async function loadCompanyData() {
        const { data: { user } } = await supa.auth.getUser();
        const { data: empresa, error } = await supa.from('empresas').select('*').eq('id_manager', user.id).single();
        if (error) {
            if (error.code === 'PGRST116') { window.location.replace('crear-empresa.html'); }
            else { console.error("Error cargando datos de la empresa:", error); }
            return null;
        }
        return empresa;
    }

    // FIX: Esta función ahora consulta 'perfiles' y muestra correctamente a los empleados.
    async function loadEmployees() {
        if (!companyData.id) return;
        const { data: empleados, error } = await supa
            .from('perfiles')
            .select('id, email_usuario, nombre_completo, horas_jornada_diaria')
            .eq('id_empresa', companyData.id)
            .eq('rol', 'trabajador');
        if (error) { console.error("Error cargando empleados:", error); return; }

        const tableBody = document.getElementById('manager-table-body');
        tableBody.innerHTML = '';
        if (!empleados || empleados.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No hay empleados invitados todavía.</td></tr>`;
            return;
        }
        empleados.forEach(emp => {
            tableBody.innerHTML += `
                <tr>
                    <td>${emp.nombre_completo || 'Pendiente de Registro'}</td>
                    <td>${emp.email_usuario}</td>
                    <td><input type="number" class="horas-input" value="${emp.horas_jornada_diaria || 8}" min="1" max="12" step="0.5" data-user-id="${emp.id}"></td>
                    <td><button class="btn btn-secondary btn-save-horas" data-user-id="${emp.id}">Guardar</button></td>
                </tr>`;
        });
    }

    async function handleInvite(e) {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        const email = document.getElementById('invite-email').value;
        try {
            const { data, error } = await supa.functions.invoke('invite-user', { body: { email_a_invitar: email, id_de_la_empresa: companyData.id } });
            if (error) throw error;
            alert(data.message);
            document.getElementById('invite-email').value = '';
            await loadEmployees();
        } catch (error) {
            alert("Error al invitar: " + (error.context?.body?.error || error.message));
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    async function handleSaveHoras(button) {
        const userId = button.dataset.userId;
        const horasInput = document.querySelector(`.horas-input[data-user-id="${userId}"]`);
        loadingOverlay.classList.remove('hidden');
        const { error } = await supa.from('perfiles').update({ horas_jornada_diaria: horasInput.value }).eq('id', userId);
        if (error) {
            alert("Error al guardar las horas: " + error.message);
        } else {
            alert("Horas de jornada actualizadas.");
            button.style.backgroundColor = 'var(--success-color)';
            setTimeout(() => { button.style.backgroundColor = ''; }, 2000);
        }
        loadingOverlay.classList.add('hidden');
    }

    async function saveLocation() { /* ... esta función se mantiene igual ... */ loadingOverlay.classList.remove('hidden'); const newPosition = marker.getLatLng(); const newRadius = document.getElementById('radius').value; const { error } = await supa.from('empresas').update({ latitud_empresa: newPosition.lat, longitud_empresa: newPosition.lng, radio_fichaje_metros: newRadius }).eq('id', companyData.id); if (error) { alert("Error al guardar la ubicación: " + error.message); } else { alert("Ubicación de la empresa guardada correctamente."); } loadingOverlay.classList.add('hidden'); }
    function initializeMap() { /* ... esta función se mantiene igual ... */ const lat = companyData.latitud_empresa || 40.416775; const lng = companyData.longitud_empresa || -3.703790; const radius = companyData.radio_fichaje_metros || 100; document.getElementById('radius').value = radius; map = L.map('map').setView([lat, lng], 16); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map); marker = L.marker([lat, lng], { draggable: true }).addTo(map); circle = L.circle([lat, lng], { color: 'blue', fillColor: '#30f', fillOpacity: 0.2, radius: radius }).addTo(map); marker.on('dragend', (event) => { const position = marker.getLatLng(); circle.setLatLng(position); }); }
    function updateCircleRadius() { /* ... esta función se mantiene igual ... */ const newRadius = document.getElementById('radius').value; if (newRadius > 0) { circle.setRadius(newRadius); } }
});
