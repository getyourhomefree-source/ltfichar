// auth.js (VERSIÓN FINAL Y COMPLETA)

document.addEventListener('DOMContentLoaded', () => {
    // --- COMPROBACIÓN DE SEGURIDAD ---
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido.");
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) errorMessage.textContent = 'Error de configuración. Contacta con soporte.';
        return;
    }

    // --- INICIALIZACIÓN DE ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- FUNCIONES DE UTILIDAD PARA LA UI ---
    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    function setErrorMessage(message) { if (errorMessage) errorMessage.textContent = message; }

    // --- ASIGNACIÓN DE EVENTOS A LOS FORMULARIOS Y BOTONES ---
    if (loginForm) { loginForm.addEventListener('submit', handleLogin); }
    if (registerForm) { registerForm.addEventListener('submit', handleManagerRegister); }
    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    
    // Comprobamos la sesión del usuario al cargar cualquier página.
    checkUserSession();

    // --- LÓGICA DE AUTENTICACIÓN ---

    async function checkUserSession() {
        const { data: { session } } = await supa.auth.getSession();
        const path = window.location.pathname.split("/").pop();
        const isAuthPage = path === 'index.html' || path === 'register.html' || path === '';

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
            // Si no tiene sesión y NO está en una página de login/registro, lo expulsamos.
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
            // El registro solo crea el usuario en 'auth.users'.
            // La creación del perfil se hará en su primer login.
            const { error } = await supa.auth.signUp({ email, password });
            if (error) throw error;

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
    // --- FUNCIÓN DE REDIRECCIÓN INTELIGENTE (VERSIÓN FINAL) ---
    // ===================================================================
    async function redirectToDashboard(user) {
        console.log(`[DEBUG] 1. Iniciando redirección para el usuario: ${user.email}`);
        try {
            let perfil;

            // Intentamos obtener el perfil del usuario.
            const { data: perfilExistente, error: perfilError } = await supa
                .from('perfiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            // --- LÓGICA CLAVE: CREACIÓN DE PERFIL PARA NUEVOS MANAGERS ---
            // Si el perfil NO existe (error 'PGRST116'), significa que es un manager
            // nuevo en su primer login. ¡Le creamos el perfil ahora mismo!
            if (perfilError && perfilError.code === 'PGRST116') {
                console.log("[DEBUG] No se encontró perfil. Creando perfil de 'manager' para nuevo usuario...");
                const { data: nuevoPerfil, error: creacionError } = await supa
                    .from('perfiles')
                    .insert({ id: user.id, rol: 'manager' })
                    .select('rol')
                    .single();
                
                if (creacionError) {
                    throw new Error(`Fallo crítico al crear el perfil del manager: ${creacionError.message}`);
                }
                
                perfil = nuevoPerfil; // Usamos el perfil recién creado para continuar.
            } else if (perfilError) {
                // Si es cualquier otro tipo de error al leer el perfil, lo lanzamos.
                throw perfilError;
            } else {
                // Si el perfil ya existía (ej. un trabajador invitado), lo usamos.
                perfil = perfilExistente;
            }
            
            console.log(`[DEBUG] 2. Perfil obtenido/creado con éxito. Rol: ${perfil.rol}`);

            // --- REDIRECCIÓN BASADA EN EL ROL ---

            if (perfil.rol === 'trabajador') {
                console.log("[DEBUG] 3. El usuario es 'trabajador'. Redirigiendo a fichar.html");
                window.location.replace('fichar.html');
                return;
            }

            if (perfil.rol === 'manager') {
                console.log("[DEBUG] 3. El usuario es 'manager'. Verificando si tiene una empresa...");
                const { data: empresa } = await supa.from('empresas').select('id').eq('id_manager', user.id).maybeSingle();

                if (empresa) {
                    console.log("[DEBUG] 4. Manager con empresa. Redirigiendo a manager.html");
                    window.location.replace('manager.html');
                } else {
                    console.log("[DEBUG] 4. Manager SIN empresa. Redirigiendo a crear-empresa.html");
                    window.location.replace('crear-empresa.html'); 
                }
            }
        } catch (error) {
            console.error("[DEBUG] ERROR CRÍTICO DENTRO DE redirectToDashboard:", error.message);
            setErrorMessage("No se pudo verificar tu rol. Intenta iniciar sesión de nuevo.");
            // Por seguridad, si algo falla, cerramos la sesión para evitar bucles.
            await supa.auth.signOut();
            hideLoading();
        }
    }
});
