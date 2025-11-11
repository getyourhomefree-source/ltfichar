// auth.js (VERSIÓN CORREGIDA DEFINITIVA - SEPARA EL REGISTRO DE LA CREACIÓN DE EMPRESA)

document.addEventListener('DOMContentLoaded', () => {
    // --- COMPROBACIÓN DE SEGURIDAD (Se mantiene) ---
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido. Asegúrate de que 'config.js' se carga correctamente.");
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) errorMessage.textContent = 'Error de configuración. Por favor, contacta con el soporte.';
        return;
    }

    // --- INICIALIZACIÓN (Sin cambios) ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- FUNCIONES DE UTILIDAD (Sin cambios) ---
    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    function setErrorMessage(message) { if (errorMessage) errorMessage.textContent = message; }

    // --- ASIGNACIÓN DE EVENTOS (Sin cambios) ---
    if (loginForm) { loginForm.addEventListener('submit', handleLogin); }
    if (registerForm) { registerForm.addEventListener('submit', handleManagerRegister); }
    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    checkUserSession();

    // --- LÓGICA DE AUTH ---

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession();
        const path = window.location.pathname;
        const isAuthPage = path.includes('index.html') || path.includes('register.html');

        if (session) {
            // Si el usuario tiene sesión y está en una página de login/registro, lo redirigimos.
            if (isAuthPage) {
                await redirectToDashboard(session.user);
            } else {
                // Si está en otra página, mostramos su email (si el elemento existe).
                const userEmailElem = document.getElementById('user-email');
                if (userEmailElem) userEmailElem.textContent = session.user.email;
            }
        } else {
            // Si no tiene sesión y NO está en una página de login/registro, lo echamos.
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

    // ===================================================================
    // --- FUNCIÓN DE REGISTRO SIMPLIFICADA ---
    // ===================================================================
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
            // AHORA SOLO HACEMOS EL REGISTRO.
            // La base de datos creará el perfil automáticamente.
            // NO intentamos crear la empresa aquí.
            const { data, error } = await supa.auth.signUp({ email, password });
            if (error) throw error;

            // Si el registro tiene éxito, informamos al usuario.
            alert("¡Registro exitoso! Revisa tu correo electrónico para confirmar tu cuenta.");
            window.location.replace('index.html'); // Lo mandamos al login.

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
    // --- FUNCIÓN DE REDIRECCIÓN INTELIGENTE ---
    // ===================================================================
    async function redirectToDashboard(user) {
        try {
            // 1. Obtenemos el rol del usuario desde su perfil.
            const { data: perfil, error: perfilError } = await supa.from('perfiles').select('rol').eq('id', user.id).single();
            if (perfilError) throw perfilError;

            // 2. Si es un trabajador, va a la página de fichar.
            if (perfil && perfil.rol === 'trabajador') {
                window.location.replace('fichar.html');
                return;
            }

            // 3. Si es un manager, comprobamos si ya tiene una empresa.
            if (perfil && perfil.rol === 'manager') {
                const { data: empresa, error: empresaError } = await supa.from('empresas').select('id').eq('id_manager', user.id).maybeSingle();
                if (empresaError) throw empresaError;

                if (empresa) {
                    // Si tiene empresa, va al dashboard de manager.
                    window.location.replace('manager.html');
                } else {
                    // SI NO TIENE EMPRESA, lo mandamos a una página para que la cree.
                    // Necesitarás crear esta página: 'crear-empresa.html'
                    alert("¡Bienvenido! Como es tu primera vez, vamos a registrar tu empresa.");
                    window.location.replace('crear-empresa.html'); 
                }
            }
        } catch (error) {
            console.error("Error al redirigir al usuario:", error);
            setErrorMessage("No se pudo verificar tu rol. Por favor, intenta iniciar sesión de nuevo.");
            // Por seguridad, si algo falla, lo deslogueamos.
            await handleLogout();
        }
    }
});
