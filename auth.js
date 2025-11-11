// auth.js
const loadingOverlay = document.getElementById('loading-overlay');
const errorMessage = document.getElementById('error-message');

function showLoading() { loadingOverlay.classList.remove('hidden'); }
function hideLoading() { loadingOverlay.classList.add('hidden'); }

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleManagerRegister);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    checkUserSession();
});

// --- Funciones Principales ---
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthPage = window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html') || window.location.pathname.endsWith('/');

    if (session) {
        if (isAuthPage) {
            await redirectToDashboard(session.user);
        } else {
            const userEmailElem = document.getElementById('user-email');
            if (userEmailElem) userEmailElem.textContent = session.user.email;
        }
    } else {
        if (!isAuthPage) {
            window.location.href = 'index.html';
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    errorMessage.textContent = '';
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorMessage.textContent = 'Email o contraseña incorrectos.';
        hideLoading();
    } else if (data.user) {
        await redirectToDashboard(data.user);
    }
}

async function handleManagerRegister(e) {
    e.preventDefault();
    errorMessage.textContent = '';

    const privacyCheckbox = document.getElementById('privacy-policy');
    if (!privacyCheckbox.checked) {
        errorMessage.textContent = 'Debes aceptar la política de privacidad para registrarte.';
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
            password,
            options: {
                data: {
                    nombre_completo: 'Manager' // Podemos añadir info extra aquí
                }
            }
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario.");

        // 2. Crear su perfil con el rol de 'manager'
        // Esta operación ahora está permitida por la nueva política de RLS
        const { error: profileError } = await supabase
            .from('perfiles')
            .insert({
                id: authData.user.id,
                rol: 'manager',
                nombre_completo: 'Manager'
            });
        if (profileError) throw profileError;

        // 3. Crear la empresa vinculada a este manager
        // Esta operación también está permitida por la nueva política de RLS
        const { error: companyError } = await supabase
            .from('empresas')
            .insert({
                id_manager: authData.user.id,
                nombre: companyName,
            });
        if (companyError) throw companyError;

        // 4. Todo ha ido bien, informamos al usuario
        alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta. El enlace puede tardar unos minutos en llegar.");
        window.location.href = 'index.html';

    } catch (error) {
        errorMessage.textContent = "Error en el registro: " + error.message;
    } finally {
        hideLoading(); // Se ejecuta siempre, incluso si hay un error
    }
}

async function handleLogout() {
    showLoading();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

async function redirectToDashboard(user) {
    // Leemos el rol desde nuestra tabla 'perfiles'
    const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();
    
    if (perfil && perfil.rol === 'manager') {
        window.location.href = 'manager.html';
    } else {
        window.location.href = 'fichar.html';
    }
}