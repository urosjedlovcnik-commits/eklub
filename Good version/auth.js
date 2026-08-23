// Izboljšan avtentikacijski sistem
// OPOMBA: V produkciji uporabi zunanji auth provider (Supabase Auth, Firebase Auth, itd.)

class AuthManager {
    constructor() {
        this.adminCredentials = {
            // V produkciji uporabi hash funkcije ali zunanji auth
            'uros.jedlovcnik@gmail.com': this.hashPassword('PlavalnaSola2025!')
        };
        this.sessionDuration = CONFIG.ADMIN.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000; // v milisekundah
    }

    // Preprosta hash funkcija (v produkciji uporabi bcrypt ali podobno)
    hashPassword(password) {
        // TO NI VARNA HASH FUNKCIJA! Uporabi bcrypt v produkciji
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Pretvori v 32bit integer
        }
        return hash.toString();
    }

    // Preveri admin credentials
    validateAdmin(email, password) {
        const hashedPassword = this.hashPassword(password);
        return this.adminCredentials[email] === hashedPassword;
    }

    // Prijavi administratorja
    loginAdmin(email, password) {
        if (!this.validateAdmin(email, password)) {
            throw new Error('Napačni prijavni podatki');
        }

        const loginData = {
            email: email,
            loginTime: Date.now(),
            sessionId: this.generateSessionId()
        };

        localStorage.setItem('adminSession', JSON.stringify(loginData));
        debugLog('Admin uspešno prijavljen', { email });
        
        return loginData;
    }

    // Generiraj session ID
    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Preveri, če je admin prijavljen
    isAdminLoggedIn() {
        try {
            const sessionData = localStorage.getItem('adminSession');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            const now = Date.now();
            const timeDiff = now - session.loginTime;

            // Preveri, če je session potekel
            if (timeDiff > this.sessionDuration) {
                this.logoutAdmin();
                return false;
            }

            // Preveri, če je email še vedno veljaven admin
            if (!this.adminCredentials[session.email]) {
                this.logoutAdmin();
                return false;
            }

            return session;
        } catch (error) {
            debugLog('Napaka pri preverjanju session', error);
            this.logoutAdmin();
            return false;
        }
    }

    // Odjavi administratorja
    logoutAdmin() {
        localStorage.removeItem('adminSession');
        debugLog('Admin odjavljen');
    }

    // Pridobi trenutni admin email
    getCurrentAdminEmail() {
        const session = this.isAdminLoggedIn();
        return session ? session.email : null;
    }

    // Pridobi preostali čas sessiona
    getSessionTimeRemaining() {
        const session = this.isAdminLoggedIn();
        if (!session) return 0;

        const elapsed = Date.now() - session.loginTime;
        const remaining = this.sessionDuration - elapsed;
        return Math.max(0, remaining);
    }

    // Pridobi preostale dni sessiona
    getSessionDaysRemaining() {
        const remainingMs = this.getSessionTimeRemaining();
        return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    }
}

// Ustvari globalno instanco
window.authManager = new AuthManager();
