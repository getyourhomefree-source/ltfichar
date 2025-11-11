// crear-empresa.js

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const createCompanyForm = document.getElementById('create-company-form');

    // --- COMPROBACIÓN DE SEGURIDAD ---
    if (typeof supa === 'undefined') {
        console.error("Error Crítico: El cliente de Supabase ('supa') no está definido.");
        setErrorMessage('Error de configuración. Contacta con soporte.');
        return;
    }
    
    // Asignamos el evento al formulario
    if (createCompanyForm) {
        createCompanyForm.addEventListener('submit', handleCreateCompany);
    }

    // Comprobamos que el usuario tiene sesión para estar aquí
    checkUserIsLoggedIn();

    // --- FUNCIONES DE UTILIDAD ---
    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }
    function setErrorMessage(message) { if (errorMessage) errorMessage.textContent = message; }

    async function checkUserIsLoggedIn() {
        const { data: { session } } = await supa.auth.getSession();
        // Si no hay sesión, no debería estar en esta página. Lo redirigimos al login.
        if (!session) {
            window.location.replace('index.html');
        }
    }

    // --- LÓGICA PRINCIPAL ---
    async function handleCreateCompany(e) {
        e.preventDefault();
        showLoading();
        setErrorMessage('');

        const companyName = document.getElementById('company-name').value;
        if (!companyName.trim()) {
            setErrorMessage('El nombre de la empresa no puede estar vacío.');
            hideLoading();
            return;
        }

        try {
            // 1. Obtenemos el usuario actual para usar su ID como 'id_manager'
            const { data: { user }, error: userError } = await supa.auth.getUser();
            if (userError || !user) throw userError || new Error('Usuario no encontrado.');

            // 2. Insertamos la nueva empresa en la base de datos
            const { error: insertError } = await supa
                .from('empresas')
                .insert({
                    nombre: companyName,
                    id_manager: user.id 
                });
            
            if (insertError) {
                // Comprobamos si el error es por una política de RLS
                if (insertError.code === '42501') { 
                     throw new Error('No tienes permisos para crear una empresa. Revisa las políticas de RLS.');
                }
                throw insertError;
            }

            // 3. Si todo ha ido bien, lo redirigimos al panel de manager
            window.location.replace('manager.html');

        } catch (error) {
            console.error('Error al crear la empresa:', error);
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
});