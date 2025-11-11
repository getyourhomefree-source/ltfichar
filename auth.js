// auth.js (Versión Corregida y Robusta)

// Se obtienen los elementos al inicio para tener una referencia
const loadingOverlay = document.getElementById('loading-overlay');
const errorMessage = document.getElementById('error-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

// --- Funciones de Utilidad ---
function showLoading() {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function setErrorMessage(message) {
    if (errorMessage) errorMessage.textContent = message;
}

// --- Lógica Principal que se ejecuta al cargar la página ---
document.addEventListener('DOMContentLoaded', () => {
    // Se comprueba si el formulario de login EXISTE en la página actual antes de añadir el evento
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Se comprueba si el formulario de registro EXISTE en la página actual antes de añadir el evento
    if (registerForm) {
        registerForm.addEventListener('submit', handleManagerRegister);
    }

    // Se comprueba si el botón de logout EXISTE
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // La comprobación de sesión se ejecuta en todas las páginas de la app
    checkUserSession();
});


// --- Manejadores de Eventos y Lógica de Autenticación ---

async function checkUserSession() {
    try {
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
    } catch (error) {
        console.error("Error checking user session:", error);
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
        if (data.user) {
            await redirectToDashboard(data.user);
        }
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
        // 1. Registrar al usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario.");

        // 2. Crear su perfil con el rol de 'manager'
        const { error: profileError } = await supabase
            .from('perfiles')
            .insert({
                id: authData.user.id,
                rol: 'manager',
                nombre_completo: 'Manager' // Placeholder name
            });
        if (profileError) throw profileError;

        // 3. Crear la empresa vinculada a este manager
        const { error: companyError } = await supabase
            .from('empresas')
            .insert({
                id_manager: authData.user.id,
                nombre: companyName,
            });
        if (companyError) throw companyError;

        // 4. Informar al usuario y redirigir
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
    try {
        await supabase.auth.signOut();
        window.location.replace('index.html');
    } catch (error) {
        console.error("Error during logout:", error);
        hideLoading();
    }
}

async function redirectToDashboard(user) {
    try {
        const { data: perfil, error } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (error || !perfil) {
            // Si no hay perfil, podría ser un usuario antiguo o un error. Lo mandamos a login.
            handleLogout();
            return;
        }
        
        if (perfil.rol === 'manager') {
            window.location.replace('manager.html');
        } else {
            window.location.replace('fichar.html');
        }
    } catch (error) {
        console.error("Error redirecting to dashboard:", error);
        handleLogout(); // Si hay un error, lo mejor es cerrar sesión.
    }
}
