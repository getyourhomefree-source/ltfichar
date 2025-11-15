// config.js (VERSIÓN CORREGIDA Y SEGURA)

const SUPABASE_URL = 'https://lujzmwcnatlxqnysvfuv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1anptd2NuYXRseHFueXN2ZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMTU0NzIsImV4cCI6MjA3Nzc5MTQ3Mn0.3202KwHaKka68l3JhPK_J21b0xKjMZS--gjgwe9QWlc';

// CORRECTO: Usamos el objeto global 'supabase' de la CDN para crear nuestra instancia,
// que guardamos en la constante 'supa'. No hay conflicto de nombres.
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


