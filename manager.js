// manager.js (VERSIÓN FINAL, ESTABLE Y COMPLETA)

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const inviteForm = document.getElementById('invite-form');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const radiusInput = document.getElementById('radius');
    const employeeTableBody = document.getElementById('manager-table-body');

    let map, marker, circle;
    let companyData = {};

    // --- FUNCIÓN DE ARRANQUE ---
    async function initializeManagerPage() {
        try {
            companyData = await loadCompanyData();
            if (!companyData) return;

            await loadEmployees();
            initializeMap();

            inviteForm.addEventListener('submit', handleInvite);
            saveLocationBtn.addEventListener('click', saveLocation);
            radiusInput.addEventListener('input', updateCircleRadius);

            // MEJORA: Usar delegación de eventos para los botones 'Guardar'.
            // Es más eficiente y robusto que añadir un listener a cada botón.
            employeeTableBody.addEventListener('click', (event) => {
                if (event.target && event.target.classList.contains('btn-save-horas')) {
                    handleSaveHoras(event.target);
                }
            });

        } catch (error) {
            console.error("Error crítico al inicializar el panel de manager:", error);
            alert("No se pudo cargar el panel de manager. " + error.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    // --- CARGA DE DATOS ---
    async function loadCompanyData() {
        const { data: { user } } = await supa.auth.getUser();
        const { data: empresa, error } = await supa.from('empresas').select('*').eq('id_manager', user.id).single();
        if (error) {
            if (error.code === 'PGRST116') window.location.replace('crear-empresa.html');
            else throw error;
            return null;
        }
        return empresa;
    }

    // --- FIX: La consulta ahora carga correctamente los empleados ---
    async function loadEmployees() {
        const { data: empleados, error } = await supa
            .from('perfiles')
            .select('id, email_usuario, nombre_completo, horas_jornada_diaria')
            .eq('id_empresa', companyData.id)
            .eq('rol', 'trabajador');

        if (error) {
            console.error("Error cargando empleados:", error);
            return;
        }
        
        employeeTableBody.innerHTML = '';
        if (!empleados || empleados.length === 0) {
            employeeTableBody.innerHTML = `<tr><td colspan="4">No has invitado a ningún empleado todavía.</td></tr>`;
            return;
        }
        empleados.forEach(emp => {
            employeeTableBody.innerHTML += `
                <tr>
                    <td>${emp.nombre_completo || 'Pendiente de Registro'}</td>
                    <td>${emp.email_usuario || 'invitado@email.com'}</td>
                    <td><input type="number" class="horas-input" value="${emp.horas_jornada_diaria || 8}" min="1" max="12" step="0.5" data-user-id="${emp.id}"></td>
                    <td><button class="btn btn-secondary btn-save-horas" data-user-id="${emp.id}">Guardar</button></td>
                </tr>
            `;
        });
    }

    // --- LÓGICA DE GESTIÓN ---
    async function handleInvite(e) {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        const emailInput = document.getElementById('invite-email');
        try {
            const { data, error } = await supa.functions.invoke('invite-user', { body: { email_a_invitar: emailInput.value, id_de_la_empresa: companyData.id } });
            if (error) throw error;
            alert(data.message);
            emailInput.value = '';
            await loadEmployees(); // Recargar la lista para ver al nuevo invitado
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

    async function saveLocation() {
        loadingOverlay.classList.remove('hidden');
        const newPosition = marker.getLatLng();
        const { error } = await supa.from('empresas').update({
            latitud_empresa: newPosition.lat,
            longitud_empresa: newPosition.lng,
            radio_fichaje_metros: radiusInput.value
        }).eq('id', companyData.id);
        if (error) alert("Error al guardar la ubicación: " + error.message);
        else alert("Ubicación guardada correctamente.");
        loadingOverlay.classList.add('hidden');
    }

    function initializeMap() {
        const lat = companyData.latitud_empresa || 40.416775;
        const lng = companyData.longitud_empresa || -3.703790;
        const radius = companyData.radio_fichaje_metros || 100;
        radiusInput.value = radius;
        map = L.map('map').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        circle = L.circle([lat, lng], { radius, color: 'blue', fillColor: '#30f', fillOpacity: 0.2 }).addTo(map);
        marker.on('dragend', () => circle.setLatLng(marker.getLatLng()));
    }

    function updateCircleRadius() {
        if (circle) circle.setRadius(radiusInput.value);
    }
    
    initializeManagerPage();
});
