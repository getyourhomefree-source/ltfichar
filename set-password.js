// set-password.js

document.addEventListener('DOMContentLoaded', () => {
    const setPasswordForm = document.getElementById('set-password-form');
    const errorMessage = document.getElementById('error-message');
    const infoMessage = document.getElementById('info-message');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Esta es la función clave. Se activa cuando la página detecta
    // un token especial en la URL (procedente del email de invitación).
    supa.auth.onAuthStateChange((event, session) => {
        // El evento 'SIGNED_IN' se dispara cuando el usuario llega desde el enlace.
        if (event === 'SIGNED_IN') {
            console.log('Usuario autenticado desde enlace mágico.');
            // Ocultamos el mensaje "Verificando..." y mostramos el formulario.
            infoMessage.classList.add('hidden');
            setPasswordForm.classList.remove('hidden');
        } else if (event === 'SIGNED_OUT') {
            // Si el usuario no está logueado, no debería estar aquí.
            window.location.replace('index.html');
        }
    });

    setPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;

        if (password.length < 6) {
            errorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }
        if (password !== passwordConfirm) {
            errorMessage.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        loadingOverlay.classList.remove('hidden');
        errorMessage.textContent = '';

        // Usamos la sesión activa del enlace para actualizar el usuario.
        const { error } = await supa.auth.updateUser({ password: password });

        if (error) {
            errorMessage.textContent = 'Error al actualizar la contraseña: ' + error.message;
            loadingOverlay.classList.add('hidden');
        } else {
            // ¡Éxito! Contraseña establecida.
            alert('¡Contraseña creada con éxito! Ahora serás redirigido a tu panel.');
            // Lo enviamos a la página de fichar.
            window.location.replace('fichar.html');
        }
    });
});