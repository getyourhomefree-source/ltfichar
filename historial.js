// historial.js - Lógica para la página de historial del empleado

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterBtn = document.getElementById('filter-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const tableBody = document.getElementById('historial-completo-table-body');
    
    // Variable para almacenar los datos filtrados
    let currentFichajes = [];
    
    // --- EVENT LISTENERS ---
    filterBtn.addEventListener('click', loadFilteredHistory);
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfBtn.addEventListener('click', exportToPDF);
    
    // --- INICIALIZACIÓN DE LA PÁGINA ---
    function initializePage() {
        // Rellenar las fechas por defecto (ej: el último mes)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        endDateInput.value = today.toISOString().split('T')[0];
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        
        // Cargar los datos iniciales
        loadFilteredHistory();
    }
    
    async function loadFilteredHistory() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            alert("Por favor, selecciona una fecha de inicio y de fin.");
            return;
        }
        
        loadingOverlay.classList.remove('hidden');
        exportCsvBtn.disabled = true;
        exportPdfBtn.disabled = true;
        tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

        try {
            const { data: { user } } = await supa.auth.getUser();
            if (!user) {
                window.location.replace('index.html');
                return;
            }

            const { data: perfil } = await supa.from('perfiles').select('horas_jornada_diaria').eq('id', user.id).single();
            const horasJornada = perfil?.horas_jornada_diaria || 8;

            // La consulta a Supabase ahora usa el rango de fechas
            const { data: fichajes, error } = await supa
                .from('fichajes')
                .select('*')
                .eq('id_empleado', user.id)
                .gte('hora_entrada', new Date(startDate).toISOString())
                .lte('hora_entrada', new Date(endDate + 'T23:59:59').toISOString()) // Incluye todo el día de fin
                .order('hora_entrada', { ascending: false });

            if (error) throw error;
            
            currentFichajes = fichajes; // Guardamos los datos para exportarlos
            renderTable(currentFichajes, horasJornada);

        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5">Error al cargar el historial: ${error.message}</td></tr>`;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function renderTable(fichajes, horasJornada) {
        tableBody.innerHTML = '';
        if (!fichajes || fichajes.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No se encontraron registros en este rango de fechas.</td></tr>';
            return;
        }

        fichajes.forEach(f => {
            let totalHoras = 0, horasExtra = 0;
            const entradaDate = new Date(f.hora_entrada);
            const salidaDate = f.hora_salida ? new Date(f.hora_salida) : null;
            const horaEntradaFormateada = entradaDate.toLocaleTimeString('es-ES');
            const horaSalidaFormateada = salidaDate ? salidaDate.toLocaleTimeString('es-ES') : '---';

            if (salidaDate) {
                totalHoras = (salidaDate - entradaDate) / 3600000;
                horasExtra = Math.max(0, totalHoras - horasJornada);
            }

            tableBody.innerHTML += `
                <tr>
                    <td>${entradaDate.toLocaleDateString('es-ES')}</td>
                    <td>${horaEntradaFormateada}</td>
                    <td>${horaSalidaFormateada}</td>
                    <td>${totalHoras > 0 ? totalHoras.toFixed(2) + 'h' : 'En curso'}</td>
                    <td style="font-weight: bold; color: ${horasExtra > 0 ? 'var(--success-color)' : 'inherit'};">
                        ${totalHoras > 0 && horasExtra > 0 ? horasExtra.toFixed(2) + 'h' : '---'}
                    </td>
                </tr>
            `;
        });

        // Habilitamos los botones de exportación ahora que hay datos
        exportCsvBtn.disabled = false;
        exportPdfBtn.disabled = false;
    }
    
    // --- FUNCIONES DE EXPORTACIÓN ---
    
    function exportToCSV() {
        if (currentFichajes.length === 0) return;

        const csvData = currentFichajes.map(f => {
            let totalHoras = 0;
            if (f.hora_salida) {
                totalHoras = ((new Date(f.hora_salida) - new Date(f.hora_entrada)) / 3600000).toFixed(2);
            }
            return {
                Fecha: new Date(f.hora_entrada).toLocaleDateString('es-ES'),
                Hora_Entrada: new Date(f.hora_entrada).toLocaleTimeString('es-ES'),
                Hora_Salida: f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString('es-ES') : 'N/A',
                Total_Horas: totalHoras > 0 ? totalHoras : 'En curso'
            };
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `mi_historial_fichajes.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function exportToPDF() {
        if (currentFichajes.length === 0) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text("Mi Historial de Fichajes", 14, 16);
        doc.text(`Desde: ${startDateInput.value} - Hasta: ${endDateInput.value}`, 14, 22);

        const tableColumn = ["Fecha", "Entrada", "Salida", "Total Horas"];
        const tableRows = [];

        currentFichajes.forEach(f => {
            let totalHoras = 0;
            if (f.hora_salida) {
                totalHoras = ((new Date(f.hora_salida) - new Date(f.hora_entrada)) / 3600000).toFixed(2);
            }
            const rowData = [
                new Date(f.hora_entrada).toLocaleDateString('es-ES'),
                new Date(f.hora_entrada).toLocaleTimeString('es-ES'),
                f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString('es-ES') : 'N/A',
                totalHoras > 0 ? totalHoras + 'h' : 'En curso'
            ];
            tableRows.push(rowData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 30 });
        doc.save(`mi_historial_fichajes.pdf`);
    }

    // Iniciar la página
    initializePage();
});
