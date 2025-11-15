// config.js (VERSIÓN CORREGIDA Y SEGURA)

const SUPABASE_URL = 'https://rlnrvgtvshkthkzxrogk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbnJ2Z3R2c2hrdGhrenhyb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY2NjksImV4cCI6MjA3ODEyMjY2OX0.AqoyTeRVSm5P1clJAn_OLOPJxuYW2HSRsB07KKKXXss';

// CORRECTO: Usamos el objeto global 'supabase' de la CDN para crear nuestra instancia,
// que guardamos en la constante 'supa'. No hay conflicto de nombres.
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

