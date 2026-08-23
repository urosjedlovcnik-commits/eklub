// Admin avtentikacija prek strežniške API poti (geslo ni v kodi).
// V Vercel nastavite: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET

class AuthManager {
    constructor() {
        this.sessionKey = 'adminSession';
        this.sessionDuration = CONFIG.ADMIN.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
    }

    getStoredSession() {
        try {
            const raw = localStorage.getItem(this.sessionKey);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async loginAdmin(email, password) {
        const res = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'Napačni prijavni podatki');
        }

        const loginData = {
            email: data.email,
            token: data.token,
            loginTime: Date.now()
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(loginData));
        return loginData;
    }

    async verifySessionRemote(session) {
        if (!session?.token) return false;
        try {
            const res = await fetch('/api/admin-verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                },
                body: JSON.stringify({ token: session.token })
            });
            if (!res.ok) return false;
            const data = await res.json();
            return data.valid === true;
        } catch {
            return false;
        }
    }

    /** Sinhron preverjanje – ali obstaja shranjen žeton (uporabljaj ensureAuthenticated za dejansko validacijo). */
    isAdminLoggedIn() {
        const session = this.getStoredSession();
        return session?.token ? session : false;
    }

    /** Preveri žeton na strežniku; ob neveljavnem odjavi. */
    async ensureAuthenticated() {
        const session = this.getStoredSession();
        if (!session?.token) return false;
        const valid = await this.verifySessionRemote(session);
        if (!valid) {
            this.logoutAdmin();
            return false;
        }
        return session;
    }

    logoutAdmin() {
        localStorage.removeItem(this.sessionKey);
    }

    getCurrentAdminEmail() {
        const session = this.isAdminLoggedIn();
        return session ? session.email : null;
    }

    getSessionTimeRemaining() {
        const session = this.getStoredSession();
        if (!session) return 0;
        const elapsed = Date.now() - (session.loginTime || 0);
        return Math.max(0, this.sessionDuration - elapsed);
    }

    getSessionDaysRemaining() {
        const remainingMs = this.getSessionTimeRemaining();
        return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    }
}

window.authManager = new AuthManager();
