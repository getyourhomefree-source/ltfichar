try {
        // PASO 1: Registrar al usuario en el sistema de autenticación.
        const { data: authData, error: authError } = await supa.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario en el sistema de autenticación.");
        
        // ¡YA NO ES NECESARIO! El disparador (trigger) en la base de datos
        // se encarga de crear el perfil automáticamente cuando el usuario de arriba se crea.
        // const { error: profileError } = await supa.from('perfiles').insert(...); // <-- LÍNEA ELIMINADA

        // PASO 2: Crear la empresa.
        // Esta llamada ahora funcionará porque el usuario ya está autenticado
        // y la política de INSERT para 'empresas' se lo permite.
        const { error: companyError } = await supa.from('empresas').insert({ 
            id_manager: authData.user.id, 
            nombre: companyName 
        });
        if (companyError) throw companyError;

        alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta.");
        window.location.replace('index.html');

    } catch (error) {
        // El mensaje de error ahora será mucho más específico y útil.
        setErrorMessage(`Error en el registro: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Sin cambios en esta función.
async function handleLogout() {
    showLoading();
    await supa.auth.signOut();
    window.location.replace('index.html');
}

// Esta función ahora debería funcionar gracias a la nueva política de SELECT en 'perfiles',
// evitando el bucle de carga infinito después de iniciar sesión.
async function redirectToDashboard(user) {
    // Añadimos un bloque try-catch para manejar el caso de que el perfil aún no exista
    try {
        const { data: perfil, error } = await supa.from('perfiles').select('rol').eq('id', user.id).single();
        if (error) throw error;

        if (perfil && perfil.rol === 'manager') {
            window.location.replace('manager.html');
        } else email, password });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario.");

        // ¡YA NO SE CREA EL PERFIL AQUÍ! La base de datos lo hace automáticamente.

        // PASO 2: Crear la empresa asociada al nuevo usuario (manager).
        // La política RLS que creamos SÍ permitirá esta acción.
        const { error: companyError } = await supa.from('empresas').insert({
            id_manager: authData.user.id,
            nombre: companyName
        });
        if (companyError) throw companyError;

        // Si ambos pasos tienen éxito, mostramos el mensaje.
        alert("¡Registro casi completo! Revisa tu correo para activar tu cuenta.");
        window.location.replace('index.html');

    } catch (error) {
        // Este error ahora será mucho más específico y útil.
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
    // Esta función ahora funcionará, ya que la política de SELECT en 'perfiles' es correcta.
    const { data: perfil, error } = await supa.from('perfiles').select('rol').eq('id', user.id).single();
    if (error) {
        console.error("Error al obtener el rol del usuario:", error);
        // Si hay un error, por seguridad lo mandamos al login.
        handleLogout();
        return;
    }

    if (perfil && perfil.rol === 'manager') {
        window.location.replace('manager.html');
    } else {
        // Si no tiene rol o es trabajador, va a la página de fichar.
        window.location.replace('fichar.html');
    }
}
