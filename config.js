// Konfiguracija aplikacije
// OPOMBA: V produkciji premesti te podatke v environment variable ali .env datoteko

const CONFIG = {
    // Supabase konfiguracija
    SUPABASE: {
        URL: 'https://tizjimlwfkoniixbetgr.supabase.co',
        // OPOZORILO: To je javni "anon" ključ - v redu za frontend
        // Vendar mora biti Supabase konfiguriran z Row Level Security (RLS)
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aWxfL5M0Kb_XHEKUBYRYRXKQkdgk'
    },
    
    // Admin konfiguracija
    ADMIN: {
        // V produkciji uporabi boljši auth sistem (Supabase Auth, Firebase Auth, itd.)
        VALID_ADMIN_EMAIL: 'uros.jedlovcnik@gmail.com',
        // OPOZORILO: V produkciji nikoli ne shranjuj gesel v frontend kodi!
        // Uporabi hash funkcije ali zunanji auth provider
        SESSION_DURATION_DAYS: 7
    },
    
    // App konfiguracija
    APP: {
        VERSION: '1.0.0',
        DEBUG: false // Nastavi na false v produkciji
    }
};

// Funkcija za pridobitev Supabase clienta
function createSupabaseClient() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library ni naložen!');
        return null;
    }
    
    return window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            // Seja v localStorage (ključ spodaj) — traja, dokler velja refresh token v Supabase Auth.
            // Trajanje nastavite v Supabase → Authentication → Settings (JWT / refresh token).
            storageKey: 'eklub-supabase-auth'
        }
    });
}

// Izvozi konfiguracijo
window.CONFIG = CONFIG;
window.createSupabaseClient = createSupabaseClient;
