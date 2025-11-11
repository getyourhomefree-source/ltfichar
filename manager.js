// manager.js

const loadingOverlay = document.getElementById('loading-overlay');
let map, marker, circle;
let companyData = {};

document.addEventListener('DOMContentLoaded', async () => {
    // La función checkUserSession está en auth.js, que ya está cargado en manager.html
    // No es necesario duplicarla aquí si auth.js siempre se carga primero.
    
    // Cargamos los datos de la empresa. Esta función ahora es más robusta.
    companyData = await loadCompanyData();

    // Solo continuamos si hemos cargado los datos de la empresa correctamente.
    if (companyData) {
        await loadEmployees();
        initializeMap();
        
        // Asignación de eventos
        document.getElementById('invite-form').addEventListener('submit', handleInvite);
        document.getElementById('save-location-btn').addEventListener('click', saveLocation);
        document.getElementById('radius').addEventListener('input', updateCircleRadius);
    }

    hideLoading();
});

function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }


async function loadCompanyData() {
    showLoading();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
        // Si por alguna razón no hay usuario, lo enviamos al login.
        window.location.replace('index.html');
        return null;
    }

    // ===================================================================
    // --- CAMBIO CLAVE ---
    // Buscamos la empresa por el 'id_manager' que corresponde al ID del usuario logueado.
    // Esto es más seguro y coherente con el SQL que hemos definido.
    // ===================================================================
    const { data: empresa, error } = await supa
        .from('empresas')
        .select('*')
        .eq('id_manager', user.id) 
        .single();
        
    if (error) {
        console.error("Error cargando datos de la empresa:", error.message);
        
        // Si el error es 'PGRST116', significa que la consulta no devolvió ninguna fila.
        // Esto es normal para un manager nuevo. Lo redirigimos para que cree su empresa.
        if (error.code === 'PGRST116') {
            console.log("Manager sin empresa detectado. Redirigiendo a crear-empresa.html");
            alert("¡Bienvenido! Como es tu primera vez, vamos a registrar tu empresa.");
            window.location.replace('crear-empresa.html');
        } else {
            // Para cualquier otro error, mostramos un mensaje genérico.
            alert('Hubo un problema al cargar los datos de tu empresa.');
        }
        return null; // Retornamos null para detener la ejecución de otras funciones.
    }
    
    return empresa;
}

async function loadEmployees() {
    // Nos aseguramos de tener un id de empresa antes de consultar.
    if (!companyData || !companyData.id) return;

    // CORRECCIÓN: Tu tabla 'empleados' no tiene 'nombre' ni 'activo'. 
    // Para mostrar los datos del empleado, necesitamos hacer un JOIN con la tabla 'perfiles'.
    const { data: empleados, error } = await supa
        .from('empleados')
        .select(`
            id_usuario,
            perfiles (
                nombre_completo,
                rol
            )
        `)
        .eq('id_empresa', companyData.id);

    if (error) {
        console.error("Error cargando empleados:", error);
        return;
    }

    const tableBody = document.getElementById('manager-table-body');
    tableBody.innerHTML = '';
    if (!empleados || empleados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3">No hay empleados invitados todavía.</td></tr>`;
        return;
    }
    
    // Mostramos los datos obtenidos del JOIN.
    empleados.forEach(emp => {
        // Obtenemos el email del usuario de la tabla de autenticación (esto es una simplificación,
        // en un caso real lo ideal sería tener el email también en perfiles).
        // Por ahora, lo dejamos pendiente para no complicar la consulta.
        tableBody.innerHTML += `
            <tr>
                <td>${emp.perfiles.nombre_completo || 'Nombre no asignado'}</td>
                <td>email_del_empleado@ejemplo.com</td> <!-- Placeholder -->
                <td>${emp.perfiles.rol}</td>
            </tr>
        `;
    });
}


async function handleInvite(e) {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('invite-email').value;

    try {
        // En Supabase, las invitaciones se manejan directamente con la API de autenticación.
        // No se necesita una Edge Function para esto.
        const { data, error } = await supa.auth.inviteUserByEmail(email, {
            data: {
                id_empresa_a_unirse: companyData.id // Enviamos metadata extra en la invitación
            }
        });

        if (error) throw error;
        
        alert(`Invitación enviada correctamente a ${email}.`);
        document.getElementById('invite-email').value = '';
        // NOTA: El empleado no aparecerá en la lista hasta que acepte la invitación y se cree la relación.
        
    } catch (error) {
        alert("Error al invitar: " + error.message);
    } finally {
        hideLoading();
    }
}

// --- Lógica del Mapa ---
function initializeMap() {
    // Si companyData es null, la función no se ejecuta.
    const lat = companyData.latitud_empresa || 40.416775; // Default a Madrid
    const lng = companyData.longitud_empresa || -3.703790;
    const radius = companyData.radio_fichaje_metros || 100;
    document.getElementById('radius').value = radius;

    map = L.map('map').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    circle = L.circle([lat, lng], {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);

    marker.on('dragend', (event) => {
        const position = marker.getLatLng();
        circle.setLatLng(position);
    });
}

function updateCircleRadius() {
    const newRadius = document.getElementById('radius').value;
    if (newRadius > 0) {
        circle.setRadius(newRadius);
    }
}

async function saveLocation() {
    showLoading();
    const newPosition = marker.getLatLng();
    const newRadius = document.getElementById('radius').value;

    const { error } = await supa
        .from('empresas')
        .update({
            latitud_empresa: newPosition.lat,
            longitud_empresa: newPosition.lng,
            radio_fichaje_metros: newRadius
        })
        .eq('id', companyData.id);

    if (error) {
        alert("Error al guardar la ubicación: " + error.message);
    } else {
        alert("Ubicación de la empresa guardada correctamente.");
    }
    hideLoading();
}

// NOTA: La función checkUserSession ya no es necesaria aquí porque la hemos centralizado en auth.js,
// que se carga en manager.html. Esto evita duplicar código.
