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
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    checkUserSession();
});

// --- Funciones Principales ---
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';

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
        errorMessage.textContent = error.message;
    } else if (data.user) {
        await redirectToDashboard(data.user);
    }
    hideLoading();
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading();
    errorMessage.textContent = '';

    const companyName = document.getElementById('company-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 1. Registrar al usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
        errorMessage.textContent = authError.message;
        hideLoading();
        return;
    }

    if (authData.user) {
        // 2. Crear la empresa vinculada a este usuario
        const { error: companyError } = await supabase
            .from('empresas')
            .insert({
                id: authData.user.id, // Vinculamos la empresa al ID del manager
                nombre: companyName,
                admin_email: email,
                plan_type: 'Freemium' // Plan por defecto
            });
        
        if (companyError) {
            errorMessage.textContent = "Error al crear la empresa: " + companyError.message;
        } else {
            // Todo ha ido bien, redirigimos al panel del manager
            alert("¡Registro completado! Por favor, revisa tu correo para verificar tu cuenta e inicia sesión.");
            window.location.href = 'index.html';
        }
    }
    hideLoading();
}

async function handleLogout() {
    showLoading();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

async function redirectToDashboard(user) {
    // Comprobamos si el usuario es manager de alguna empresa
    const { data: empresa, error } = await supabase
        .from('empresas')
        .select('id')
        .eq('admin_email', user.email)
        .single();
    
    if (empresa) {
        window.location.href = 'manager.html';
    } else {
        window.location.href = 'fichar.html';
    }
}