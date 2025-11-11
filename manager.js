// manager.js (VERSIÓN CORREGIDA Y COMPLETA)

const loadingOverlay = document.getElementById('loading-overlay');
let map, marker, circle;
let companyData = {}; // Usaremos esta variable global para almacenar los datos de la empresa.

// --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
document.addEventListener('DOMContentLoaded', async () => {
    // Primero, cargamos los datos de la empresa del manager logueado.
    companyData = await loadCompanyData();

    // Si la carga de datos fue exitosa (es decir, el manager tiene una empresa registrada),
    // entonces procedemos a cargar el resto de la página.
    if (companyData) {
        await loadEmployees();
        initializeMap();
        
        // Asignamos los eventos a los botones y formularios
        document.getElementById('invite-form').addEventListener('submit', handleInvite);
        document.getElementById('save-location-btn').addEventListener('click', saveLocation);
        document.getElementById('radius').addEventListener('input', updateCircleRadius);
    }

    // Ocultamos el overlay de carga al final de todo el proceso.
    hideLoading();
});

// --- FUNCIONES DE UTILIDAD ---
function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }


// --- CARGA DE DATOS PRINCIPALES ---

async function loadCompanyData() {
    showLoading();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
        window.location.replace('index.html');
        return null;
    }

    // Buscamos la empresa usando el ID del manager (user.id), que es la forma correcta y segura.
    const { data: empresa, error } = await supa
        .from('empresas')
        .select('*')
        .eq('id_manager', user.id)
        .single();
        
    if (error) {
        // Si el error es 'PGRST116', significa "no se encontró la fila", lo cual es normal
        // para un manager nuevo. Lo redirigimos a la página de creación de empresa.
        if (error.code === 'PGRST116') {
            console.log("Manager sin empresa detectado. Redirigiendo...");
            window.location.replace('crear-empresa.html');
        } else {
            console.error("Error cargando datos de la empresa:", error);
            alert('Hubo un problema al cargar los datos de tu empresa.');
        }
        return null; // Devolvemos null para detener la ejecución.
    }
    
    return empresa;
}

async function loadEmployees() {
    if (!companyData || !companyData.id) return;

    // Consultamos la tabla 'empleados' y hacemos un "JOIN" para obtener
    // la información del perfil del empleado (nombre y rol).
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
    
    // NOTA: El HTML estático pide "Nombre", "Email", "Activo".
    // Nuestro SQL nos da "nombre_completo" y "rol". Adaptamos la tabla a los datos que tenemos.
    // Para obtener el email, se requeriría una función RPC más compleja.
    empleados.forEach(emp => {
        tableBody.innerHTML += `
            <tr>
                <td>${emp.perfiles.nombre_completo || 'Pendiente de registro'}</td>
                <td>(Email no disponible en esta vista)</td>
                <td>${emp.perfiles.rol || 'N/A'}</td>
            </tr>
        `;
    });
}


// --- LÓGICA DE GESTIÓN (INVITACIONES Y MAPA) ---

async function handleInvite(e) {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('invite-email').value;

    if (!companyData || !companyData.id) {
        alert("Error: No se ha podido identificar la empresa. Recarga la página.");
        hideLoading();
        return;
    }

    try {
        // ===================================================================
        // --- CORRECCIÓN CLAVE ---
        // Llamamos a la Edge Function 'invite-user' que creamos en Supabase.
        // Esta es la forma segura de realizar acciones de administrador.
        // ===================================================================
        const { data, error } = await supa.functions.invoke('invite-user', {
            body: { 
                email_a_invitar: email, 
                id_de_la_empresa: companyData.id 
            },
        });

        if (error) throw error;
        
        // Mostramos el mensaje de éxito que nos devuelve nuestra función.
        alert(data.message);
        document.getElementById('invite-email').value = '';
        
    } catch (error) {
        // Si la función devuelve un error (ej. permisos denegados), lo mostramos.
        const errorMessage = error.context?.body?.error || error.message;
        alert("Error al invitar: " + errorMessage);
    } finally {
        hideLoading();
    }
}

async function saveLocation() {
    showLoading();
    const newPosition = marker.getLatLng();
    const newRadius = document.getElementById('radius').value;

    // ===================================================================
    // --- CORRECCIÓN CLAVE ---
    // Este código ahora funcionará porque ya hemos añadido las columnas
    // 'latitud_empresa', 'longitud_empresa' y 'radio_fichaje_metros'
    // a la base de datos con el script SQL.
    // ===================================================================
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


// --- FUNCIONES DEL MAPA (LEAFLET.JS) ---

function initializeMap() {
    // Usamos los datos de la empresa que cargamos al inicio. Si no existen,
    // usamos valores por defecto (ej. el centro de Madrid).
    const lat = companyData.latitud_empresa || 40.416775;
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

// NOTA: La función checkUserSession no es necesaria aquí porque ya se carga
// el archivo auth.js en manager.html, que maneja la sesión globalmente.
// Esto evita duplicar código.
