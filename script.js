// main.js

// --- VARIABLES GLOBALES ---
const currentPage = window.location.pathname.split("/").pop(); // Detecta la página actual (ej. 'fichar.html')

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Código que se ejecuta cuando la página ha cargado
    checkUserSession();

    // Asigna eventos según la página actual
    switch (currentPage) {
        case 'index.html':
        case '': // Para la raíz del sitio
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.addEventListener('submit', handleLogin);
            break;
        case 'fichar.html':
            const ficharBtn = document.getElementById('fichar-btn');
            if (ficharBtn) ficharBtn.addEventListener('click', handleFichar);
            loadFicharStatus();
            break;
        case 'historial.html':
            loadHistorial();
            break;
        case 'manager.html':
            loadManagerData();
            const exportCsvBtn = document.getElementById('export-csv-btn');
            if(exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
            const exportPdfBtn = document.getElementById('export-pdf-btn');
            if(exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
            break;
    }
    
    // El botón de logout está en varias páginas
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});


// --- FUNCIONES DE AUTENTICACIÓN Y NAVEGACIÓN ---

async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Si hay sesión y estamos en la página de login, redirigimos
        if (currentPage === 'index.html' || currentPage === '') {
            await redirectToDashboard(session.user);
        } else {
            // Si estamos en una página protegida, mostramos el email del usuario
            const userEmailElem = document.getElementById('user-email');
            if (userEmailElem) userEmailElem.textContent = session.user.email;
        }
    } else {
        // Si no hay sesión y no estamos en la página de login, redirigimos al login
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorMessage.textContent = 'Error al iniciar sesión: ' + error.message;
    } else if (data.user) {
        errorMessage.textContent = '';
        await redirectToDashboard(data.user);
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

async function redirectToDashboard(user) {
    // Comprobamos el rol del usuario para redirigirle a su panel
    const { data: empleado, error } = await supabase
        .from('empleados')
        .select('id_empresa, empresas(admin_email)')
        .eq('email', user.email)
        .single();

    if (error || !empleado) {
        console.error("No se encontró el perfil del empleado o es un manager.");
        // Si el usuario es el admin de una empresa, es un manager
        const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('admin_email', user.email)
            .single();
        
        if (empresa) {
            window.location.href = 'manager.html';
        } else {
             document.getElementById('error-message').textContent = 'No tienes permisos para acceder.';
             await supabase.auth.signOut();
        }
    } else {
         window.location.href = 'fichar.html';
    }
}

// --- FUNCIONES DEL EMPLEADO ---

async function loadFicharStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const statusMessage = document.getElementById('status-message');
    const ficharBtn = document.getElementById('fichar-btn');
    
    // Buscamos el último fichaje del usuario que no tenga hora de salida
    const { data: ultimoFichaje, error } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_email', user.email)
        .is('hora_salida', null)
        .order('fecha', { ascending: false })
        .order('hora_entrada', { ascending: false })
        .limit(1)
        .single();
        
    if (ultimoFichaje) {
        statusMessage.textContent = `Has fichado la entrada a las ${ultimoFichaje.hora_entrada}.`;
        ficharBtn.textContent = 'Fichar Salida';
        ficharBtn.dataset.fichajeId = ultimoFichaje.id; // Guardamos el ID para la salida
        ficharBtn.style.backgroundColor = 'var(--error-color)';
    } else {
        statusMessage.textContent = 'Estás listo para iniciar tu jornada.';
        ficharBtn.textContent = 'Fichar Entrada';
        ficharBtn.style.backgroundColor = 'var(--success-color)';
    }
    ficharBtn.disabled = false;
}

async function handleFichar() {
    const ficharBtn = document.getElementById('fichar-btn');
    ficharBtn.disabled = true;
    ficharBtn.textContent = 'Procesando...';

    const locationMessage = document.getElementById('location-message');

    // 1. Obtener geolocalización
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            locationMessage.textContent = `Ubicación obtenida: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
            
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date();
            const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const hora = now.toTimeString().split(' ')[0]; // HH:MM:SS
            
            if (ficharBtn.dataset.fichajeId) {
                // --- Realizar fichaje de SALIDA ---
                const { error } = await supabase
                    .from('fichajes')
                    .update({ 
                        hora_salida: hora,
                        // Aquí podrías calcular horas_total, o mejor hacerlo con un trigger en Supabase
                    })
                    .eq('id', ficharBtn.dataset.fichajeId);
                
                if (error) {
                    alert('Error al fichar la salida: ' + error.message);
                }
            } else {
                // --- Realizar fichaje de ENTRADA ---
                 const { error } = await supabase
                    .from('fichajes')
                    .insert({
                        empleado_email: user.email, // Usamos email como clave foránea simple
                        fecha,
                        hora_entrada: hora,
                        ubicacion_lat: latitude,
                        ubicacion_lng: longitude
                    });

                if (error) {
                    alert('Error al fichar la entrada: ' + error.message);
                }
            }
            // Recargamos el estado del botón
            loadFicharStatus();
        },
        (geoError) => {
            locationMessage.textContent = 'Error: No se pudo obtener la ubicación. Activa los permisos.';
            alert('Para fichar, es obligatorio permitir el acceso a tu ubicación.');
            ficharBtn.disabled = false;
            ficharBtn.textContent = 'Reintentar Fichaje';
        }
    );
}

async function loadHistorial() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fichajes, error } = await supabase
        .from('fichajes')
        .select('*')
        .eq('empleado_email', user.email)
        .order('fecha', { ascending: false });

    if (error) {
        console.error("Error cargando historial:", error);
        return;
    }

    const tableBody = document.getElementById('historial-table-body');
    tableBody.innerHTML = ''; // Limpiar tabla
    fichajes.forEach(f => {
        const totalHoras = f.hora_salida ? calcularHoras(f.hora_entrada, f.hora_salida) : 'En curso';
        const row = `
            <tr>
                <td>${f.fecha}</td>
                <td>${f.hora_entrada}</td>
                <td>${f.hora_salida || '---'}</td>
                <td>${totalHoras}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function calcularHoras(inicio, fin) {
    const start = new Date(`1970-01-01T${inicio}Z`);
    const end = new Date(`1970-01-01T${fin}Z`);
    const diff = end - start; // diferencia en milisegundos
    const horas = diff / (1000 * 60 * 60);
    return horas.toFixed(2);
}


// --- FUNCIONES DEL MANAGER ---

async function loadManagerData() {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     // 1. Obtener la empresa del manager
     const { data: empresa, errorEmpresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('admin_email', user.email)
        .single();

    if(errorEmpresa || !empresa) {
        console.error("No se encontró una empresa para este manager.");
        return;
    }

    // 2. Obtener todos los empleados de esa empresa
    const { data: empleados, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id_empresa', empresa.id);
        
    if(error) {
        console.error("Error cargando empleados:", error);
        return;
    }
    
    const tableBody = document.getElementById('manager-table-body');
    tableBody.innerHTML = '';
    empleados.forEach(emp => {
        const row = `
            <tr>
                <td>${emp.nombre}</td>
                <td>${emp.email}</td>
                <td>${emp.jornada}</td>
                <td>${emp.activo ? 'Sí' : 'No'}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

async function fetchReportData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert("Por favor, selecciona una fecha de inicio y fin.");
        return null;
    }
    
    const { data, error } = await supabase
        .from('fichajes')
        .select('fecha, hora_entrada, hora_salida, empleado_email')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: true });

    if (error) {
        alert("Error al obtener los datos del informe: " + error.message);
        return null;
    }
    return data;
}

async function exportToCSV() {
    const data = await fetchReportData();
    if (!data) return;

    const csvData = data.map(row => ({
        ...row,
        horas_totales: row.hora_salida ? calcularHoras(row.hora_entrada, row.hora_salida) : 0
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_fichajes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportToPDF() {
    const data = await fetchReportData();
    if (!data) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Reporte de Fichajes", 14, 16);
    
    const tableColumn = ["Email", "Fecha", "Entrada", "Salida", "Total Horas"];
    const tableRows = [];

    data.forEach(item => {
        const rowData = [
            item.empleado_email,
            item.fecha,
            item.hora_entrada,
            item.hora_salida || 'N/A',
            item.hora_salida ? calcularHoras(item.hora_entrada, item.hora_salida) : 'N/A'
        ];
        tableRows.push(rowData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.save(`reporte_fichajes_${new Date().toISOString().split('T')[0]}.pdf`);
}