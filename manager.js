document.addEventListener('DOMContentLoaded', async () => {
    // --- ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const inviteForm = document.getElementById('invite-form');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const radiusInput = document.getElementById('radius');

    // --- VARIABLES GLOBALES ---
    let map, marker, circle;
    let companyData = {}; // Almacenará los datos de la empresa del manager

    // --- FUNCIÓN DE ARRANQUE ---
    async function initializeManagerPage() {
        try {
            // auth.js ya se encarga de la sesión. Si llegamos aquí, es un manager válido.
            companyData = await loadCompanyData();
            if (!companyData) return; // Si no hay empresa, la función anterior ya redirige.

            await loadEmployees();
            initializeMap();

            // Asignación de eventos
            inviteForm.addEventListener('submit', handleInvite);
            saveLocationBtn.addEventListener('click', saveLocation);
            radiusInput.addEventListener('input', updateCircleRadius);

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
            if (error.code === 'PGRST116') { // No se encontró la empresa
                window.location.replace('crear-empresa.html');
            } else {
                throw error; // Lanza cualquier otro error
            }
            return null;
        }
        return empresa;
    }

    // --- CORRECCIÓN CLAVE: Cargar empleados desde la tabla 'perfiles' ---
    async function loadEmployees() {
        if (!companyData.id) return;

        // Consultamos 'perfiles' para encontrar a todos los usuarios (rol 'trabajador')
        // que pertenecen a esta empresa.
        const { data: empleados, error } = await supa
            .from('perfiles')
            .select('id, email_usuario, nombre_completo, horas_jornada_diaria')
            .eq('id_empresa', companyData.id)
            .eq('rol', 'trabajador');

        if (error) {
            console.error("Error cargando empleados:", error);
            return;
        }

        const tableBody = document.getElementById('manager-table-body');
        tableBody.innerHTML = '';
        if (!empleados || empleados.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No has invitado a ningún empleado todavía.</td></tr>`;
            return;
        }

        empleados.forEach(emp => {
            const row = `
                <tr>
                    <td>${emp.nombre_completo || 'Pendiente de Registro'}</td>
                    <td>${emp.email_usuario}</td>
                    <td>
                        <input type="number" class="horas-input" value="${emp.horas_jornada_diaria || 8}" min="1" max="12" step="0.5" data-user-id="${emp.id}">
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-save-horas" data-user-id="${emp.id}">Guardar</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // Añadimos eventos a los botones de "Guardar" recién creados
        document.querySelectorAll('.btn-save-horas').forEach(button => {
            button.addEventListener('click', handleSaveHoras);
        });
    }

    // --- LÓGICA DE GESTIÓN (INVITACIONES, MAPA, HORAS) ---

    async function handleInvite(e) {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        const emailInput = document.getElementById('invite-email');
        const email = emailInput.value;

        try {
            const { data, error } = await supa.functions.invoke('invite-user', {
                body: { email_a_invitar: email, id_de_la_empresa: companyData.id },
            });
            if (error) throw error;
            alert(data.message);
            emailInput.value = '';
            await loadEmployees(); // Recargar la lista de empleados para ver al nuevo invitado
        } catch (error) {
            const errorMessage = error.context?.body?.error || error.message;
            alert("Error al invitar: " + errorMessage);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    // --- NUEVA FUNCIÓN: Guardar las horas de jornada ---
    async function handleSaveHoras(event) {
        const userId = event.target.dataset.userId;
        const horasInput = document.querySelector(`.horas-input[data-user-id="${userId}"]`);
        const horas = horasInput.value;

        if (!horas || horas <= 0) {
            alert("El número de horas debe ser mayor que cero.");
            return;
        }

        loadingOverlay.classList.remove('hidden');
        const { error } = await supa
            .from('perfiles')
            .update({ horas_jornada_diaria: horas })
            .eq('id', userId);
            
        if (error) {
            alert("Error al guardar las horas: " + error.message);
        } else {
            alert("Horas de jornada actualizadas correctamente.");
            event.target.style.backgroundColor = 'var(--success-color)'; // Feedback visual
            setTimeout(() => { event.target.style.backgroundColor = ''; }, 2000);
        }
        loadingOverlay.classList.add('hidden');
    }

    async function saveLocation() {
        // ... (el resto de funciones de mapa y demás se mantienen igual)
        loadingOverlay.classList.remove('hidden');
        const newPosition = marker.getLatLng();
        const newRadius = document.getElementById('radius').value;
        const { error } = await supa.from('empresas').update({
            latitud_empresa: newPosition.lat,
            longitud_empresa: newPosition.lng,
            radio_fichaje_metros: newRadius
        }).eq('id', companyData.id);

        if (error) alert("Error al guardar la ubicación: " + error.message);
        else alert("Ubicación de la empresa guardada correctamente.");
        loadingOverlay.classList.add('hidden');
    }

    function initializeMap() {
        const lat = companyData.latitud_empresa || 40.416775;
        const lng = companyData.longitud_empresa || -3.703790;
        const radius = companyData.radio_fichaje_metros || 100;
        document.getElementById('radius').value = radius;

        map = L.map('map').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        circle = L.circle([lat, lng], { radius, color: 'blue', fillColor: '#30f', fillOpacity: 0.2 }).addTo(map);

        marker.on('dragend', () => circle.setLatLng(marker.getLatLng()));
    }

    function updateCircleRadius() {
        const newRadius = document.getElementById('radius').value;
        if (newRadius > 0) circle.setRadius(newRadius);
    }
    
    // --- Iniciar la página ---
    initializeManagerPage();
});
