// auth.js (Versión Final, Robusta y Validada)

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN ---
    // Solo buscamos los elementos DESPUÉS de que la página se ha cargado por completo.
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- FUNCIONES DE UTILIDAD ---
    function showLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    function setErrorMessage(message) {
        if (errorMessage) errorMessage.textContent = message;
    }

    // --- ASIGNACIÓN DE EVENTOS ---
    // Comprobamos si el elemento existe en ESTA página antes de asignarle un evento.
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleManagerRegister);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Comprobamos la sesión del usuario al cargar cualquier página de la app.
    checkUserSession();

    // --- MANEJADORES DE EVENTOS Y LÓGICA DE AUTH ---

    async function checkUserSession() {
        const { data: { session } } = await supabase.auth.getSession();
        const path = window.location.pathname;
        const isAuthPage = path.endsWith('/') || path.endsWith('index.html') || path.endsWith('register.html');

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
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) await redirectToDashboard(data.user);
        } catch (error) {
            setErrorMessage('Email o contraseña incorrectos.');
            hideLoading();
        }
    }

    async function handleManagerRegister(e) {
        e.preventDefault(); // Detiene el envío normal del formulario
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
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario en el sistema de autenticación.");

            const { error: profileError } = await supabase.from('perfiles').insert({
                id: authData.user.id,
                rol: 'manager',
                nombre_completo: 'Manager'
            });
            if (profileError) throw new Error(`Error al crear el perfil: ${profileError.message}`);

            const { error: companyError } = await supabase.from('empresas').insert({
                id_manager: authData.user.id,
                nombre: companyName
            });
            if (companyError) throw new Error(`Error al crear la empresa: ${companyError.message}`);

            alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta. El enlace puede tardar unos minutos en llegar.");
            window.location.replace('index.html');
        } catch (error) {
            setErrorMessage(`Error en el registro: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    async function handleLogout() {
        showLoading();
        await supabase.auth.signOut();
        window.location.replace('index.html');
    }

    async function redirectToDashboard(user) {
        const { data: perfil, error } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();

        if (error || !perfil) {
            console.error("No se pudo encontrar el perfil del usuario. Cerrando sesión.", error);
            await handleLogout();
            return;
        }

        if (perfil.rol === 'manager') {
            window.location.replace('manager.html');
        } else {
            window.location.replace('fichar.html');
        }
    }
});
