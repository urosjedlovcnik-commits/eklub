// 🔐 Konfiguracija za trainer avtentikacijski sistem

const AUTH_CONFIG = {
    // Supabase konfiguracija (uporabi isto kot v glavnem projektu)
    SUPABASE: {
        URL: 'https://tizjimlwfkoniixbetgr.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aWxfL5M0Kb_XHEKUBYRYRXKQkdgk'
    },
    
    // Vloge in dovoljenja
    ROLES: {
        SUPER_ADMIN: 'super_admin',
        TRAINER_ADMIN: 'trainer_admin', 
        TRAINER: 'trainer'
    },
    
    PERMISSIONS: {
        FULL_ACCESS: 'FULL_ACCESS',           // Super admin - vse
        ALL_TRAININGS: 'ALL_TRAININGS',       // Trainer admin - vsi treningi
        OWN_TRAININGS_ONLY: 'OWN_TRAININGS_ONLY', // Osnovni trener - samo svoje
        NO_ACCESS: 'NO_ACCESS'                // Ni dostopa
    },
    
    // Testni uporabniki (OBSTOJEČI iz baze + demo gesla)
    TEST_USERS: {
        SUPER_ADMIN: {
            email: 'uros.jedlovcnik@gmail.com',
            password: 'PlavalnaSola2025!', // Obstoječe geslo iz auth.js
            expectedRole: 'super_admin'
        },
        TRAINER_ADMIN: {
            email: 'm4j0n3z4@gmail.com', // urke prdurke - obstoječi uporabnik
            password: 'DEMO123!', // Demo geslo - potrebno ustvariti v Supabase
            expectedRole: 'trainer_admin'
        },
        BASIC_TRAINER: {
            email: 'uros@playworldgame.ocm', // Urke Care - obstoječi uporabnik
            password: 'DEMO123!', // Demo geslo - potrebno ustvariti v Supabase
            expectedRole: 'trainer'
        }
    },
    
    // Strani za preusmeritev
    PAGES: {
        LOGIN: 'trainer-login.html',
        DASHBOARD: 'trainer-dashboard.html',
        SUPER_ADMIN: '../admin.html'  // Obstoječi admin
    },
    
    // Session nastavitve
    SESSION: {
        DURATION_HOURS: 8,
        STORAGE_KEY: 'trainerAuthSession'
    }
};

// Ustvari Supabase client
function createAuthSupabaseClient() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library ni naložen!');
        return null;
    }
    
    return window.supabase.createClient(
        AUTH_CONFIG.SUPABASE.URL, 
        AUTH_CONFIG.SUPABASE.ANON_KEY
    );
}

// Debug funkcija
function debugLog(message, data = null) {
    console.log(`[AUTH DEBUG] ${message}`, data);
}

// Izvozi konfiguracijo
console.log('🔍 DEBUG: Izvažam AUTH_CONFIG:', AUTH_CONFIG);
window.AUTH_CONFIG = AUTH_CONFIG;
window.createAuthSupabaseClient = createAuthSupabaseClient;
window.debugLog = debugLog;
console.log('🔍 DEBUG: config-auth.js naložen');
