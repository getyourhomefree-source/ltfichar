// manager.js
const loadingOverlay = document.getElementById('loading-overlay');
let map, marker, circle;
let companyData = {};

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserSession();
    
    companyData = await loadCompanyData();
    await loadEmployees();

    initializeMap();
    
    document.getElementById('invite-form').addEventListener('submit', handleInvite);
    document.getElementById('save-location-btn').addEventListener('click', saveLocation);
    document.getElementById('radius').addEventListener('input', updateCircleRadius);

    loadingOverlay.classList.add('hidden');
});

async function loadCompanyData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: empresa, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('admin_email', user.email)
        .single();
    if (error) console.error("Error cargando datos de la empresa", error);
    return empresa;
}

async function loadEmployees() {
    const { data: empleados, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id_empresa', companyData.id);

    const tableBody = document.getElementById('manager-table-body');
    tableBody.innerHTML = '';
    if (!empleados || empleados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3">No hay empleados invitados todavía.</td></tr>`;
        return;
    }
    empleados.forEach(emp => {
        tableBody.innerHTML += `
            <tr>
                <td>${emp.nombre}</td>
                <td>${emp.email}</td>
                <td>${emp.activo ? 'Sí' : 'No'}</td>
            </tr>
        `;
    });
}

async function handleInvite(e) {
    e.preventDefault();
    loadingOverlay.classList.remove('hidden');
    const email = document.getElementById('invite-email').value;

    try {
        const { data, error } = await supabase.functions.invoke('invite-user', {
            body: { email: email, id_empresa: companyData.id },
        });

        if (error) throw error;
        
        alert(data.message);
        document.getElementById('invite-email').value = '';
        await loadEmployees();

    } catch (error) {
        alert("Error al invitar: " + error.message);
    }
    loadingOverlay.classList.add('hidden');
}

// --- Lógica del Mapa ---
function initializeMap() {
    const lat = companyData.latitud_empresa || 40.416775; // Default to Madrid
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
    loadingOverlay.classList.remove('hidden');
    const newPosition = marker.getLatLng();
    const newRadius = document.getElementById('radius').value;

    const { error } = await supabase
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
    loadingOverlay.classList.add('hidden');
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