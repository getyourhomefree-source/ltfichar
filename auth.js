// auth.js (VERSIÓN CON DEPURACIÓN AVANZADA)

document.addEventListener('DOMContentLoaded', () => {
    // --- COMPROBACIÓN DE SEGURIDAD ---
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido.");
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) errorMessage.textContent = 'Error de configuración. Por favor, contacta con el soporte.';
        return;
    }

    // --- INICIALIZACIÓN ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- FUNCIONES DE UTILIDAD ---
    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    function setErrorMessage(message) { if (errorMessage) errorMessage.textContent = message; }

    // --- ASIGNACIÓN DE EVENTOS ---
    if (loginForm) { loginForm.addEventListener('submit', handleLogin); }
    if (registerForm) { registerForm.addEventListener('submit', handleManagerRegister); }
    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    checkUserSession();

    // --- LÓGICA DE AUTH ---

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession();
        console.log("Chequeando sesión inicial. Sesión encontrada:", session ? session.user.email : 'No');
        const path = window.location.pathname;
        const isAuthPage = path.includes('index.html') || path.includes('register.html') || path === '/';

        if (session) {
            if (isAuthPage) {
                console.log("Usuario con sesión en página de auth. Redirigiendo...");
                await redirectToDashboard(session.user);
            } else {
                const userEmailElem = document.getElementById('user-email');
                if (userEmailElem) userEmailElem.textContent = session.user.email;
            }
        } else {
            if (!isAuthPage) {
                console.log("Usuario sin sesión en página protegida. Redirigiendo a index.html");
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
        console.log(`[DEBUG] Intentando iniciar sesión como ${email}...`);

        try {
            const { data, error } = await supa.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            console.log("[DEBUG] ¡Autenticación exitosa en Supabase! Usuario:", data.user.email);
            if (data.user) {
                await redirectToDashboard(data.user);
            }
        } catch (error) {
            console.error("[DEBUG] Error en signInWithPassword:", error);
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
            const { data, error } = await supa.auth.signUp({ email, password });
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

    // ===================================================================
    // --- FUNCIÓN DE REDIRECCIÓN CON DEPURACIÓN ---
    // ===================================================================
    async function redirectToDashboard(user) {
        console.log(`[DEBUG] 1. Iniciando redirección para el usuario: ${user.email}`);
        try {
            // 1. Obtenemos el rol del usuario.
            const { data: perfil, error: perfilError } = await supa
                .from('perfiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            // ¡ESTE ES EL PUNTO MÁS CRÍTICO!
            if (perfilError) {
                console.error("[DEBUG] ¡ERROR AL OBTENER EL PERFIL! Razón:", perfilError);
                throw new Error("No se pudo leer tu perfil de la base de datos. Verifica los permisos RLS.");
            }
            
            console.log(`[DEBUG] 2. Perfil obtenido con éxito. Rol: ${perfil.rol}`);

            if (perfil && perfil.rol === 'trabajador') {
                console.log("[DEBUG] 3. El usuario es un 'trabajador'. Redirigiendo a fichar.html");
                window.location.replace('fichar.html');
                return;
            }

            if (perfil && perfil.rol === 'manager') {
                console.log("[DEBUG] 3. El usuario es un 'manager'. Verificando si tiene una empresa...");
                const { data: empresa, error: empresaError } = await supa
                    .from('empresas')
                    .select('id')
                    .eq('id_manager', user.id)
                    .maybeSingle(); // maybeSingle() es mejor que single() si puede no existir.

                if (empresaError) throw empresaError;

                if (empresa) {
                    console.log(`[DEBUG] 4. El manager ya tiene una empresa (ID: ${empresa.id}). Redirigiendo a manager.html`);
                    window.location.replace('manager.html');
                } else {
                    console.log("[DEBUG] 4. El manager NO tiene empresa. Redirigiendo a crear-empresa.html");
                    alert("¡Bienvenido! Como es tu primera vez, vamos a registrar tu empresa.");
                    window.location.replace('crear-empresa.html'); 
                }
            }
        } catch (error) {
            console.error("[DEBUG] ERROR CRÍTICO DENTRO DE redirectToDashboard:", error.message);
            setErrorMessage("No se pudo verificar tu rol. Contacta con soporte.");
            // Forzamos el logout para evitar un bucle infinito.
            await supa.auth.signOut();
            hideLoading(); // Ocultamos el overlay de carga si todo falla.
        }
    }
});
