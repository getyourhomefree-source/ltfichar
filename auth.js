// auth.js (VERSIÓN ORIGINAL Y FUNCIONAL RESTAURADA)

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido.");
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) errorMessage.textContent = 'Error de configuración. Contacta con soporte.';
        return;
    }

    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    function setErrorMessage(message) { if (errorMessage) errorMessage.textContent = message; }

    if (loginForm) { loginForm.addEventListener('submit', handleLogin); }
    if (registerForm) { registerForm.addEventListener('submit', handleManagerRegister); }
    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    
    checkUserSession();

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession();
        const path = window.location.pathname.split("/").pop();
        const isAuthPage = path === 'index.html' || path === 'register.html' || path === '';

        if (session) {
            if (isAuthPage) {
                await redirectToDashboard(session.user);
            } else {
                const userEmailElem = document.getElementById('user-email');
                if (userEmailElem) userEmailElem.textContent = session.user.email;
            }
        } else {
            if (!isAuthPage) {
                window.location.replace('index.html');
            }
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        showLoading();
        setErrorMessage('');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const { data, error } = await supa.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) await redirectToDashboard(data.user);
        } catch (error) {
            setErrorMessage('Email o contraseña incorrectos.');
            hideLoading();
        }
    }

    async function handleManagerRegister(e) {
        e.preventDefault();
        setErrorMessage('');
        const privacyCheckbox = document.getElementById('privacy-policy');
        if (!privacyCheckbox || !privacyCheckbox.checked) {
            setErrorMessage('Debes aceptar la política de privacidad para registrarte.');
            return;
        }
        showLoading();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const { error } = await supa.auth.signUp({ email, password });
            if (error) throw error;
            alert("¡Registro exitoso! Revisa tu correo electrónico para confirmar tu cuenta.");
            window.location.replace('index.html');
        } catch (error) {
            setErrorMessage(`Error en el registro: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    async function handleLogout() {
        showLoading();
        await supa.auth.signOut();
        window.location.replace('index.html');
    }

    async function redirectToDashboard(user) {
        try {
            const { data: perfil, error: perfilError } = await supa.from('perfiles').select('rol').eq('id', user.id).single();

            if (perfilError && perfilError.code === 'PGRST116') {
                console.log("Creando perfil de 'manager' para nuevo usuario...");
                const { data: nuevoPerfil, error: creacionError } = await supa.from('perfiles').insert({ id: user.id, rol: 'manager' }).select('rol').single();
                if (creacionError) throw new Error(`Fallo al crear el perfil: ${creacionError.message}`);
                
                // Es un manager nuevo, redirigir a crear empresa
                window.location.replace('crear-empresa.html');
                return;
            } else if (perfilError) {
                throw perfilError;
            }
            
            if (perfil.rol === 'trabajador') {
                window.location.replace('fichar.html');
            } else if (perfil.rol === 'manager') {
                const { data: empresa } = await supa.from('empresas').select('id').eq('id_manager', user.id).maybeSingle();
                if (empresa) {
                    window.location.replace('manager.html');
                } else {
                    window.location.replace('crear-empresa.html');
                }
            }
        } catch (error) {
            console.error("Error en la redirección:", error.message);
            setErrorMessage("No se pudo verificar tu rol. Intenta iniciar sesión de nuevo.");
            await supa.auth.signOut();
            hideLoading();
        }
    }
});
```---
#### **Paso 3: Restaurar y Corregir `employee.js`**

Esta es la versión original de `employee.js`, con dos correcciones mínimas:
1.  Un `try...catch...finally` en la carga para **evitar que la página se congele**.
2.  La función `handleFichar` ahora inserta en las columnas correctas (`fecha`, `id_usuario`, etc.).

**(Reemplaza todo el contenido de `employee.js`)**
```javascript
// employee.js (VERSIÓN RESTAURADA CON CORRECCIONES PUNTUALES)

document.addEventListener('DOMContentLoaded', async () => {
    // FIX: Envolvemos la inicialización para evitar que la página se congele si algo falla.
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        // La sesión ya está verificada por auth.js, que se carga antes.
        updateTime();
        setInterval(updateTime, 1000);
        
        await initializeFichaje();
        await loadHistorialReciente();
        
        document.getElementById('fichar-btn').addEventListener('click', handleFichar);
    } catch (error) {
        console.error("Error fatal al cargar la página de fichaje:", error);
        document.getElementById('status-message').textContent = "Error al cargar los datos. Refresca la página.";
    } finally {
        // Esto garantiza que la pantalla de carga SIEMPRE se oculte.
        loadingOverlay.classList.add('hidden');
    }
});

let geofenceData = null;
let userPosition = null;

function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function initializeFichaje() {
    await fetchGeofenceData();
    watchUserPosition();
    await loadFicharStatus();
}

async function fetchGeofenceData() {
    const { data: { user } } = await supa.auth.getUser();
    const { data: perfil } = await supa.from('perfiles').select('id_empresa').eq('id', user.id).single();
    if (!perfil || !perfil.id_empresa) return;

    const { data: empresa } = await supa.from('empresas').select('latitud_empresa, longitud_empresa, radio_fichaje_metros').eq('id', perfil.id_empresa).single();
    if (empresa && empresa.latitud_empresa) {
        geofenceData = { lat: empresa.latitud_empresa, lng: empresa.longitud_empresa, radius: empresa.radio_fichaje_metros };
    }
}

function watchUserPosition() {
    if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización.");
        return;
    }
    navigator.geolocation.watchPosition(
        (position) => {
            userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            checkGeofence();
        },
        () => {
             document.getElementById('geofence-status').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Activa los permisos de ubicación.`;
        },
        { enableHighAccuracy: true }
    );
}

function checkGeofence() {
    const statusEl = document.getElementById('geofence-status');
    const ficharBtn = document.getElementById('fichar-btn');
    if (!geofenceData) {
        statusEl.innerHTML = `<i class="fa-solid fa-info-circle"></i> La empresa no ha configurado una zona de fichaje.`;
        ficharBtn.disabled = false;
        return;
    }
    if (!userPosition) return;
    const distance = calculateDistance(userPosition.lat, userPosition.lng, geofenceData.lat, geofenceData.lng);
    if (distance <= geofenceData.radius) {
        statusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Estás en la zona de fichaje.`;
        statusEl.className = 'fichar-status in-zone';
        ficharBtn.disabled = false;
    } else {
        statusEl.innerHTML = `<i class="fa-solid fa-times-circle"></i> Fuera de la zona. Distancia: ${distance.toFixed(0)}m.`;
        statusEl.className = 'fichar-status out-zone';
        ficharBtn.disabled = true;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c;
}

async function loadFicharStatus() {
    const { data: { user } } = await supa.auth.getUser();
    const statusMessage = document.getElementById('status-message');
    const ficharBtn = document.getElementById('fichar-btn');
    const { data: ultimoFichaje } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).is('hora_salida', null).order('fecha', { ascending: false }).limit(1).single();
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
    document.getElementById('loading-overlay').classList.remove('hidden');
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !userPosition) { alert("No se pudo obtener la información del usuario o la ubicación."); document.getElementById('loading-overlay').classList.add('hidden'); return; }
    const ficharBtn = document.getElementById('fichar-btn');
    const now = new Date(); const fecha = now.toISOString().split('T')[0]; const hora = now.toTimeString().split(' ')[0];
    try {
        if (ficharBtn.dataset.fichajeId) {
            const { error } = await supa.from('fichajes').update({ hora_salida: hora, ubicacion_salida_lat: userPosition.lat, ubicacion_salida_lng: userPosition.lng }).eq('id', ficharBtn.dataset.fichajeId);
            if (error) throw error;
        } else {
            // FIX: La inserción ahora usa los nombres de columna correctos de la BD.
            const { error } = await supa.from('fichajes').insert({ id_usuario: user.id, fecha: fecha, hora_entrada: hora, ubicacion_entrada_lat: userPosition.lat, ubicacion_entrada_lng: userPosition.lng });
            if (error) throw error;
        }
    } catch(error) {
        alert("Error al procesar el fichaje: " + error.message);
    } finally {
        await loadFicharStatus();
        await loadHistorialReciente();
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

async function loadHistorialReciente() {
    const { data: { user } } = await supa.auth.getUser();
    const tableBody = document.getElementById('historial-table-body');
    // FIX: Añadimos la lógica para calcular horas extra.
    const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single();
    const horasJornada = perfil?.horas_jornada_diaria || 8;
    const { data: fichajes } = await supa.from('fichajes').select('*').eq('id_usuario', user.id).order('fecha', { ascending: false }).limit(5);
    
    if (!fichajes || fichajes.length === 0) { tableBody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`; return; }
    tableBody.innerHTML = ''; // Limpiar antes de añadir
    fichajes.forEach(f => {
        let totalHoras = 0, horasExtra = 0;
        if (f.hora_salida) { totalHoras = ((new Date(`1970-01-01T${f.hora_salida}`) - new Date(`1970-01-01T${f.hora_entrada}`)) / 36e5); horasExtra = Math.max(0, totalHoras - horasJornada); }
        tableBody.innerHTML += `<tr><td>${f.fecha}</td><td>${f.hora_entrada}</td><td>${f.hora_salida || '---'}</td><td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td><td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">${horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}</td></tr>`;
    });
}
