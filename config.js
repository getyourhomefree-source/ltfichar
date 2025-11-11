// config.js
// REEMPLAZA ESTOS VALORES CON TUS CREDENCIALES DE SUPABASE
const SUPABASE_URL = 'https://rlnrvgtvshkthkzxrogk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbnJ2Z3R2c2hrdGhrenhyb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY2NjksImV4cCI6MjA3ODEyMjY2OX0.AqoyTeRVSm5P1clJAn_OLOPJxuYW2HSRsB07KKKXXss';

// Inicializa el cliente de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);