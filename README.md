# LTFichaje - Aplicación Web de Control Horario

**LTFichaje** es una aplicación web completa para el registro y la gestión de horarios laborales. Permite a los empleados fichar su entrada y salida con geolocalización validada, y a los managers gestionar a su equipo, definir zonas de fichaje y exportar informes.

![Captura de pantalla de la aplicación](https://via.placeholder.com/600x300.png?text=Añade+aquí+una+captura+de+tu+app)

---

## 🚀 Despliegue

La aplicación está desplegada y accesible a través de GitHub Pages en la siguiente URL:

**[Acceder a LTFichaje](https://<tu-usuario>.github.io/<tu-repositorio>/)** _<-- ¡Actualiza esta URL!_

---

## ✨ Características Principales

### Para Empleados
*   **Fichaje Inteligente:** Registro de entrada/salida con un solo clic.
*   **Geolocalización (Geo-fencing):** El fichaje solo se permite si el empleado está dentro del radio definido por el manager.
*   **Reloj en Tiempo Real:** Visualización de la hora y fecha actual.
*   **Historial de Fichajes:** Acceso rápido a los últimos registros de jornada.

### Para Managers
*   **Panel de Gestión:** Vista centralizada de todos los empleados.
*   **Mapa Interactivo:** Permite establecer la ubicación de la empresa y un radio de fichaje válido.
*   **Sistema de Invitaciones:** Los empleados solo pueden unirse a través de una invitación segura por correo electrónico.
*   **Seguridad por Roles:** Separación clara de permisos entre managers y empleados.

---

## ⚙️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Autenticación, Edge Functions, Storage)
*   **Librerías:**
    *   [Leaflet.js](https://leafletjs.com/): Para el mapa interactivo.
    *   [Font Awesome](https://fontawesome.com/): Para los iconos.

---

## 🛠️ Configuración Local

Para ejecutar este proyecto en tu máquina local:

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/<tu-usuario>/<tu-repositorio>.git
    ```
2.  Crea un fichero `config.js` a partir de `config.example.js`.
3.  Introduce tus credenciales de Supabase (URL y Anon Key) en `config.js`.
4.  Abre el fichero `index.html` en tu navegador.
