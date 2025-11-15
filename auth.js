// auth.js (VERSIÓN FINAL, UNIFICADA Y CORREGIDA)

document.addEventListener('DOMContentLoaded', () => {
    // --- COMPROBACIÓN DE SEGURIDAD ---
    // Verificamos que el cliente 'supabase' (de config.js) se haya cargado correctamente.
    if (typeof supabase === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supabase') no está definido.");
        alert('Error de configuración. No se puede conectar con el servidor.');
        return;
    }

    // --- ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- FUNCIONES DE UI ---
    const showLoading = () => { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    const hideLoading = () => { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    const setErrorMessage = (message) => { if (errorMessage) errorMessage.textContent = message; }

    // --- EVENT LISTENERS ---
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleManagerRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Comprobamos la sesión del usuario al cargar cualquier página.
    checkUserSession();

    // --- LÓGICA DE AUTENTICACIÓN ---

    async function checkUserSession() {
        const { data: { session } } = await supabase.auth.getSession();
        const path = window.location.pathname.split("/").pop();
        const isAuthPage = ['index.html', 'register.html', ''].includes(path);

        if (session) {
            // Si hay sesión y el usuario está en una página de login/registro, lo redirigimos a su panel.
            if (isAuthPage) {
                await redirectToDashboard(session.user);
            } else {
                // Si está en una página interna, mostramos su email.
                const userEmailElem = document.getElementById('user-email');
                if (userEmailElem) userEmailElem.textContent = session.user.email;
            }
        } else {
            // Si no hay sesión y el usuario intenta acceder a una página protegida, lo expulsamos al login.
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
            setErrorMessage('Email o contraseña incorrectos. Por favor, inténtalo de nuevo.');
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
        const companyName = document.getElementById('company-name').value;

        if (password.length < 6) {
            setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
            hideLoading();
            return;
        }

        try {
            // 1. Registramos al usuario en el sistema de autenticación de Supabase.
            const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error("No se pudo crear el usuario.");

            // 2. Insertamos la empresa asociada a este nuevo manager (usando su ID de usuario).
            const { error: companyError } = await supabase
                .from('empresas')
                .insert({
                    id_manager: authData.user.id,
                    nombre: companyName
                });
            if (companyError) throw companyError;
            
            // 3. Creamos su perfil con el rol de 'manager'.
            const { error: profileError } = await supabase
                .from('perfiles')
                .insert({
                    id: authData.user.id,
                    rol: 'manager'
                });
            if (profileError) throw profileError;

            alert("¡Registro completado! Revisa tu correo electrónico para confirmar tu cuenta y poder iniciar sesión.");
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

    // --- FUNCIÓN DE REDIRECCIÓN INTELIGENTE ---
    async function redirectToDashboard(user) {
        try {
            // Buscamos el perfil del usuario para saber su rol.
            const { data: perfil, error } = await supabase
                .from('perfiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            // Redirigimos según el rol.
            if (perfil.rol === 'trabajador') {
                window.location.replace('fichar.html');
            } else if (perfil.rol === 'manager') {
                window.location.replace('manager.html');
            } else {
                throw new Error(`Rol '${perfil.rol}' no reconocido.`);
            }

        } catch (error) {
            console.error("Error crítico en la redirección:", error.message);
            setErrorMessage("No se pudo verificar tu perfil. Intenta iniciar sesión de nuevo.");
            await supabase.auth.signOut(); // Por seguridad, cerramos sesión si hay un error.
            hideLoading();
        }
    }
});
