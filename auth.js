// auth.js (VERSIÓN FINAL, CORREGIDA CON 'supa')

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido.");
        alert('Error de configuración. No se puede conectar con el servidor.');
        return;
    }

    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    const showLoading = () => { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    const hideLoading = () => { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    const setErrorMessage = (message) => { if (errorMessage) errorMessage.textContent = message; }

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleManagerRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    checkUserSession();

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession(); // CORREGIDO
        const path = window.location.pathname.split("/").pop();
        const isAuthPage = ['index.html', 'register.html', ''].includes(path);

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
            const { data, error } = await supa.auth.signInWithPassword({ email, password }); // CORREGIDO
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
            const { data: authData, error: signUpError } = await supa.auth.signUp({ email, password }); // CORREGIDO
            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error("No se pudo crear el usuario.");

            const { error: companyError } = await supa.from('empresas').insert({ id_manager: authData.user.id, nombre: companyName }); // CORREGIDO
            if (companyError) throw companyError;
            
            const { error: profileError } = await supa.from('perfiles').insert({ id: authData.user.id, rol: 'manager' }); // CORREGIDO
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
        await supa.auth.signOut(); // CORREGIDO
        window.location.replace('index.html');
    }

    async function redirectToDashboard(user) {
        try {
            const { data: perfil, error } = await supa.from('perfiles').select('rol').eq('id', user.id).single(); // CORREGIDO
            if (error) throw error;
            
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
            await supa.auth.signOut(); // CORREGIDO
            hideLoading();
        }
    }
});
