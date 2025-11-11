// auth.js (VERSIÓN DE DIAGNÓSTICO)

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

    async function checkUserSession() { /* ... (código sin cambios) ... */ }
    async function handleLogin(e) { /* ... (código sin cambios) ... */ }

    // ***** LA FUNCIÓN QUE ESTAMOS DIAGNOSTICANDO *****
    async function handleManagerRegister(e) {
        console.log("--- INICIO DEL DIAGNÓSTICO DE REGISTRO ---");
        console.log("1. Botón 'Crear Cuenta' pulsado. La función handleManagerRegister se ha iniciado.");
        
        e.preventDefault();
        setErrorMessage('');

        const privacyCheckbox = document.getElementById('privacy-policy');
        console.log("2. Buscando el checkbox de privacidad. Elemento encontrado:", privacyCheckbox);

        if (!privacyCheckbox || !privacyCheckbox.checked) {
            console.log("3. ¡FALLO! El checkbox no existe o no está marcado. Deteniendo el proceso.");
            setErrorMessage('Debes aceptar la política de privacidad para registrarte.');
            console.log("--- FIN DEL DIAGNÓSTICO ---");
            return; // La función termina aquí
        }

        console.log("3. ÉXITO. El checkbox está marcado. Continuando...");
        showLoading();
        console.log("4. Spinner de 'cargando' mostrado.");

        const companyName = document.getElementById('company-name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log("5. Datos del formulario recogidos:", { companyName, email });

        try {
            console.log("6. Iniciando bloque try...catch para contactar con Supabase.");
            
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) throw authError;
            console.log("7. Usuario creado en Supabase Auth con éxito.");

            const { error: profileError } = await supabase.from('perfiles').insert({ id: authData.user.id, rol: 'manager', nombre_completo: 'Manager' });
            if (profileError) throw new Error(`Error al crear el perfil: ${profileError.message}`);
            console.log("8. Perfil creado en la base de datos con éxito.");

            const { error: companyError } = await supabase.from('empresas').insert({ id_manager: authData.user.id, nombre: companyName });
            if (companyError) throw new Error(`Error al crear la empresa: ${companyError.message}`);
            console.log("9. Empresa creada en la base de datos con éxito.");

            alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta.");
            window.location.replace('index.html');

        } catch (error) {
            console.error("¡ERROR CAPTURADO EN EL BLOQUE CATCH!", error);
            setErrorMessage(`Error en el registro: ${error.message}`);
        } finally {
            hideLoading();
            console.log("10. Bloque 'finally' ejecutado. Spinner ocultado.");
            console.log("--- FIN DEL DIAGNÓSTICO ---");
        }
    }

    async function handleLogout() { /* ... (código sin cambios) ... */ }
    async function redirectToDashboard(user) { /* ... (código sin cambios) ... */ }
});
