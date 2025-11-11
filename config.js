// config.js (VERSIÓN DE DIAGNÓSTICO)

alert("1. Fichero config.js se está ejecutando.");

const SUPABASE_URL = 'https://rlnrvgtvshkthkzxrogk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbnJ2Z3R2c2hrdGhrenhyb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY2NjksImV4cCI6MjA3ODEyMjY2OX0.AqoyTeRVSm5P1clJAn_OLOPJxuYW2HSRsB07KKKXXss';

try {
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (supabase) {
        alert("2. ¡ÉXITO! La variable 'supabase' se ha creado correctamente.");
    } else {
        alert("3. ¡FALLO! La variable 'supabase' es nula o indefinida después de createClient.");
    }
} catch (error) {
    alert(`4. ¡ERROR CRÍTICO EN CONFIG.JS! ${error.message}`);
}
