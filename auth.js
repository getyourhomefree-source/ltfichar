// auth.js (VERSIÓN FINAL Y CORRECTA - USA LA VARIABLE 'supa')

document.addEventListener('DOMContentLoaded', () => {
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

    // --- MANEJADORES DE EVENTOS Y LÓGICA DE AUTH ---

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession();
        const path = window.location.pathname;
        const isAuthPage = path.endsWith('/') || path.endsWith('index.html') || path.endsWith('register.html');
        if (session) {
            if (isAuthPage) await redirectToDashboard(session.user);
            else { const userEmailElem = document.getElementById('user-email'); if (userEmailElem) userEmailElem.textContent = session.user.email; }
        } else {
            if (!isAuthPage) window.location.replace('index.html');
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
        const companyName = document.getElementById('company-name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const { data: authData, error: authError } = await supa.auth.signUp({ email, password });
            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario en el sistema de autenticación.");

            const { error: profileError } = await supa.from('perfiles').insert({ id: authData.user.id, rol: 'manager', nombre_completo: 'Manager' });
            if (profileError) throw new Error(`Error al crear el perfil: ${profileError.message}`);

            const { error: companyError } = await supa.from('empresas').insert({ id_manager: authData.user.id, nombre: companyName });
            if (companyError) throw new Error(`Error al crear la empresa: ${companyError.message}`);

            alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta.");
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
        const { data: perfil } = await supa.from('perfiles').select('rol').eq('id', user.id).single();
        if (perfil && perfil.rol === 'manager') {
            window.location.replace('manager.html');
        } else {
            window.location.replace('fichar.html');
        }
    }
});
