// Avtentikacija trenerjev — Supabase Auth + vloge iz tabele trainers

const TRAINER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TRAINER_ADMIN: 'trainer_admin',
    TRAINER: 'trainer'
};

const CALENDAR_VIEW_KEY = 'eklub_calendar_view';

/** Ali URL kaže na callback za ponastavitev gesla (hash ali PKCE code). */
function isRecoveryUrl(locationObj) {
    const loc = locationObj || window.location;
    const hash = (loc.hash || '').replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get('type') === 'recovery') return true;
    const searchParams = new URLSearchParams(loc.search || '');
    if (searchParams.get('type') === 'recovery') return true;
    if (searchParams.has('code')) return true;
    return false;
}

/** Preusmeri na stran za novo geslo, če Supabase pristane na koledarju/adminu. */
function redirectRecoveryToResetPage() {
    if (!isRecoveryUrl()) return false;
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('reset-password.html') || path.includes('login.html')) return false;
    window.location.replace('./reset-password.html' + window.location.search + window.location.hash);
    return true;
}

window.isRecoveryUrl = isRecoveryUrl;
window.redirectRecoveryToResetPage = redirectRecoveryToResetPage;

function mapAuthErrorMessage(message) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) {
        return 'Napačen email ali geslo. Geslo nastavite v Supabase (Authentication → Users), ne gre za admin panel geslo.';
    }
    if (msg.includes('email not confirmed')) {
        return 'Email še ni potrjen. Preverite pošto ali v Supabase potrdite uporabnika ročno.';
    }
    if (msg.includes('too many requests')) {
        return 'Preveč poskusov prijave. Počakajte minuto in poskusite znova.';
    }
    return message || 'Napaka pri prijavi';
}

class TrainerAuthManager {
    constructor() {
        this.supabase = createSupabaseClient();
        this.currentUser = null;
        this.currentTrainer = null;
        this.permissions = null;
        this.ownTermIds = new Set();
        this.viewMode = sessionStorage.getItem(CALENDAR_VIEW_KEY) || null;
    }

    calculatePermissions(role) {
        const normalized = (role || TRAINER_ROLES.TRAINER).trim().toLowerCase();
        switch (normalized) {
            case TRAINER_ROLES.SUPER_ADMIN:
                return {
                    role,
                    canViewAllTrainings: true,
                    canAccessAdmin: true,
                    label: 'Super admin'
                };
            case TRAINER_ROLES.TRAINER_ADMIN:
                return {
                    role,
                    canViewAllTrainings: true,
                    canAccessAdmin: false,
                    label: 'Admin trener'
                };
            default:
                return {
                    role: TRAINER_ROLES.TRAINER,
                    canViewAllTrainings: false,
                    canAccessAdmin: false,
                    label: 'Trener'
                };
        }
    }

    async login(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(mapAuthErrorMessage(error.message));

        const trainer = await this.loadTrainerProfile(data.user);
        if (!trainer) {
            await this.supabase.auth.signOut();
            throw new Error('Račun ni povezan s trenerjem. Kontaktirajte administratorja.');
        }

        this.currentUser = data.user;
        this.currentTrainer = trainer;
        this.permissions = this.calculatePermissions(trainer.role || TRAINER_ROLES.TRAINER);
        this.ensureViewModeDefault();
        await this.loadOwnTermIds();
        return this.getContext();
    }

    async restoreSession() {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error || !session?.user) return null;

        const trainer = await this.loadTrainerProfile(session.user);
        if (!trainer) {
            await this.supabase.auth.signOut();
            return null;
        }

        this.currentUser = session.user;
        this.currentTrainer = trainer;
        this.permissions = this.calculatePermissions(trainer.role || TRAINER_ROLES.TRAINER);
        this.ensureViewModeDefault();
        await this.loadOwnTermIds();
        return this.getContext();
    }

    async loadTrainerProfile(user) {
        const { data: byUserId } = await this.supabase
            .from('trainers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (byUserId) return byUserId;

        if (user.email) {
            const { data: byEmail } = await this.supabase
                .from('trainers')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();
            if (byEmail) return byEmail;
        }
        return null;
    }

    async loadOwnTermIds() {
        this.ownTermIds = new Set();
        if (!this.currentTrainer?.id) return;
        const { data, error } = await this.supabase
            .from('trainer_terms')
            .select('term_id')
            .eq('trainer_id', this.currentTrainer.id);
        if (error) {
            console.warn('Napaka pri nalaganju trainer_terms:', error.message);
            return;
        }
        (data || []).forEach(row => this.ownTermIds.add(row.term_id));
    }

    ensureViewModeDefault() {
        if (this.viewMode === 'all' || this.viewMode === 'own') return;
        this.viewMode = this.permissions.canViewAllTrainings ? 'all' : 'own';
        sessionStorage.setItem(CALENDAR_VIEW_KEY, this.viewMode);
    }

    shouldShowAllTerms() {
        return this.permissions?.canViewAllTrainings && this.viewMode === 'all';
    }

    setViewMode(mode) {
        if (mode !== 'all' && mode !== 'own') return;
        if (mode === 'all' && !this.permissions?.canViewAllTrainings) return;
        this.viewMode = mode;
        sessionStorage.setItem(CALENDAR_VIEW_KEY, mode);
    }

    filterTerms(terms) {
        if (!Array.isArray(terms)) return [];
        if (this.shouldShowAllTerms()) return terms;
        if (this.ownTermIds.size === 0) return [];
        return terms.filter(t => this.ownTermIds.has(t.id));
    }

    getContext() {
        return {
            user: this.currentUser,
            trainer: this.currentTrainer,
            permissions: this.permissions,
            viewMode: this.viewMode
        };
    }

    getDisplayName() {
        if (!this.currentTrainer) return '';
        return `${this.currentTrainer.first_name || ''} ${this.currentTrainer.last_name || ''}`.trim();
    }

    async logout() {
        await this.supabase.auth.signOut();
        this.currentUser = null;
        this.currentTrainer = null;
        this.permissions = null;
        this.ownTermIds.clear();
        sessionStorage.removeItem(CALENDAR_VIEW_KEY);
        this.viewMode = null;
    }
}

window.trainerAuth = new TrainerAuthManager();
