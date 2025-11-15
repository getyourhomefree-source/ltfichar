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

// Pega este código al final de tu archivo manager.js

// --- LÓGICA DE REPORTES ---

document.addEventListener('DOMContentLoaded', () => {
    // ... tu código existente de inicialización ...

    // Añadir event listeners para los nuevos botones
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
});

async function fetchReportData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert("Por favor, selecciona una fecha de inicio y de fin.");
        return null;
    }

    // Obtenemos la empresa del manager actual
    const { data: { user } } = await supa.auth.getUser();
    const { data: empresa, error: empresaError } = await supa.from('empresas').select('id').eq('id_manager', user.id).single();
    if (empresaError || !empresa) {
        alert("No se pudo encontrar tu empresa.");
        return null;
    }

    // ¡LA MAGIA DEL JOIN! Usamos una RPC para obtener los fichajes de la empresa.
    // Esto es mucho más eficiente que traer todos los fichajes y filtrarlos en el cliente.
    const { data, error } = await supa.rpc('get_fichajes_por_empresa', {
        id_empresa_param: empresa.id,
        fecha_inicio_param: startDate,
        fecha_fin_param: endDate
    });

    if (error) {
        alert("Error al obtener los datos del informe: " + error.message);
        return null;
    }
    return data;
}

async function exportToCSV() {
    const data = await fetchReportData();
    if (!data || data.length === 0) {
        alert("No hay datos para exportar en el rango de fechas seleccionado.");
        return;
    }

    // Transformamos los datos para que sean más legibles en el CSV
    const csvData = data.map(row => {
        const entrada = new Date(row.hora_entrada);
        const salida = row.hora_salida ? new Date(row.hora_salida) : null;
        let totalHoras = 0;
        if (salida) {
            totalHoras = ((salida - entrada) / 3600000).toFixed(2);
        }
        return {
            Email: row.email_empleado,
            Fecha: entrada.toLocaleDateString('es-ES'),
            Hora_Entrada: entrada.toLocaleTimeString('es-ES'),
            Hora_Salida: salida ? salida.toLocaleTimeString('es-ES') : 'N/A',
            Total_Horas: totalHoras
        };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `reporte_fichajes_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportToPDF() {
    const data = await fetchReportData();
    if (!data || data.length === 0) {
        alert("No hay datos para exportar en el rango de fechas seleccionado.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text(`Reporte de Fichajes - ${startDate} a ${endDate}`, 14, 16);
    
    const tableColumn = ["Email", "Fecha", "Entrada", "Salida", "Total Horas"];
    const tableRows = [];

    data.forEach(item => {
        const entrada = new Date(item.hora_entrada);
        const salida = item.hora_salida ? new Date(item.hora_salida) : null;
        let totalHoras = 0;
        if (salida) {
            totalHoras = ((salida - entrada) / 3600000).toFixed(2);
        }
        const rowData = [
            item.email_empleado,
            entrada.toLocaleDateString('es-ES'),
            entrada.toLocaleTimeString('es-ES'),
            salida ? salida.toLocaleTimeString('es-ES') : 'N/A',
            totalHoras
        ];
        tableRows.push(rowData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.save(`reporte_fichajes_${startDate}_a_${endDate}.pdf`);
}
