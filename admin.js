// Admin stran za upravljanje plavalne šole
document.addEventListener('DOMContentLoaded', async () => {
    //// console.log('🚀 Admin stran se nalaga...');

    if (typeof redirectRecoveryToResetPage === 'function' && redirectRecoveryToResetPage()) {
        return;
    }
    
    const ctx = await trainerAuth.restoreSession();
    if (!ctx) {
        window.location.href = 'login.html?return=admin.html';
        return;
    }
    if (!ctx.permissions?.canAccessAdmin) {
        window.location.href = 'index.html';
        return;
    }

    const adminInfo = document.getElementById('adminInfo');
    if (adminInfo) {
        adminInfo.textContent = `Pozdravljeni, ${trainerAuth.getDisplayName() || ctx.trainer?.email} (super admin)`;
    }

    if (typeof setupChangePasswordButton === 'function') {
        setupChangePasswordButton('changePasswordBtn');
    }

    const supabase = trainerAuth.supabase;
    if (!supabase) {
        console.error('❌ Napaka: Ne morem vzpostaviti povezave z bazo podatkov.');
        alert('Napaka: Ne morem vzpostaviti povezave z bazo podatkov.');
        return;
    }
    
// console.log('✅ Supabase client uspešno ustvarjen:', supabase);
    


    // ===== POMOŽNE FUNKCIJE =====
    
    // Funkcija za prikaz sporočil
    function showMessage(message, type = 'info') {
        // Ustvari element za sporočilo
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // Dodaj na vrh strani
        document.body.insertBefore(messageEl, document.body.firstChild);
        
        // Avtomatsko odstrani po 5 sekundah
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    window.alert = function(message) {
        showMessage(String(message), 'info');
    };

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let trainers = [];
    let attendance = {};
    let termStatus = {};
    let trainerAttendance = {};
    let currentSection = 'swimmers'; // Dodano: sledi trenutni sekciji
    let seasons = []; // Sezone (tabela seasons v bazi)
    /** Mesečni OLY prispevek na plavalca (enako kot v Finance / calculateFinanceData) */
    const OLY_MONTHLY_CONTRIBUTION_EUR = 40;
    /** Fiksna članarina v poročilu za računovodstvo — privzeto iz PKL cenika, spremenljivo v nastavitvah */
    const MEMBERSHIP_FEE_EUR = 30;
    /** Privzete vadnine po PKL ceniku (sezona 2026/27) — https://www.plavalniklub-ljubljana.si/plavanje-odraslih/ */
    const PKL_DEFAULT_FEE_SETTINGS = {
        monthly1: 60,
        monthly2: 80,
        monthly3: 95,
        membership: 30,
        lump1: 515,
        lump2: 685,
        lump3: 815,
        installment1: 260,
        installment2: 350,
        installment3: 415
    };
    const DEFAULT_FEE_SETTINGS_STORAGE_KEY = 'eklub_default_fee_settings';
    let defaultFeeSettings = { ...PKL_DEFAULT_FEE_SETTINGS };

    function getMembershipFeeAmount() {
        return defaultFeeSettings.membership ?? MEMBERSHIP_FEE_EUR;
    }

    function loadDefaultFeeSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(DEFAULT_FEE_SETTINGS_STORAGE_KEY) || '{}');
            defaultFeeSettings = { ...PKL_DEFAULT_FEE_SETTINGS, ...saved };
        } catch {
            defaultFeeSettings = { ...PKL_DEFAULT_FEE_SETTINGS };
        }
        applyDefaultFeeSettingsToForm();
    }

    function applyDefaultFeeSettingsToForm() {
        const map = {
            defaultFeeMonthly1: 'monthly1',
            defaultFeeMonthly2: 'monthly2',
            defaultFeeMonthly3: 'monthly3',
            defaultFeeMembership: 'membership',
            defaultFeeLump1: 'lump1',
            defaultFeeLump2: 'lump2',
            defaultFeeLump3: 'lump3',
            defaultFeeInstallment1: 'installment1',
            defaultFeeInstallment2: 'installment2',
            defaultFeeInstallment3: 'installment3'
        };
        Object.entries(map).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.value = defaultFeeSettings[key];
        });
    }

    function saveDefaultFeeSettingsFromForm() {
        const read = id => parseFloat(document.getElementById(id)?.value);
        defaultFeeSettings = {
            monthly1: read('defaultFeeMonthly1') ?? PKL_DEFAULT_FEE_SETTINGS.monthly1,
            monthly2: read('defaultFeeMonthly2') ?? PKL_DEFAULT_FEE_SETTINGS.monthly2,
            monthly3: read('defaultFeeMonthly3') ?? PKL_DEFAULT_FEE_SETTINGS.monthly3,
            membership: read('defaultFeeMembership') ?? PKL_DEFAULT_FEE_SETTINGS.membership,
            lump1: read('defaultFeeLump1') ?? PKL_DEFAULT_FEE_SETTINGS.lump1,
            lump2: read('defaultFeeLump2') ?? PKL_DEFAULT_FEE_SETTINGS.lump2,
            lump3: read('defaultFeeLump3') ?? PKL_DEFAULT_FEE_SETTINGS.lump3,
            installment1: read('defaultFeeInstallment1') ?? PKL_DEFAULT_FEE_SETTINGS.installment1,
            installment2: read('defaultFeeInstallment2') ?? PKL_DEFAULT_FEE_SETTINGS.installment2,
            installment3: read('defaultFeeInstallment3') ?? PKL_DEFAULT_FEE_SETTINGS.installment3
        };
        localStorage.setItem(DEFAULT_FEE_SETTINGS_STORAGE_KEY, JSON.stringify(defaultFeeSettings));
        showMessage('Privzete vadnine so shranjene (veljajo pri predlogih, ne prepisujejo ročnih zneskov).', 'success');
    }

    function formatDefaultFeesSummary() {
        const s = defaultFeeSettings;
        return `${s.monthly1} / ${s.monthly2} / ${s.monthly3} € mesečno (1× / 2× / 3× tedensko)`;
    }
    const PAYMENT_PLAN_GROUP_ORDER = ['monthly', 'two_installments', 'lump_sum'];
    /** Zapomni si izbiro filtra sezone na zavihku Termini (vse sezone = prazen niz) */
    const TERM_LIST_SEASON_STORAGE_KEY = 'eklub_admin_termListSeason';

    /** Načini plačila in članarina: swimmer_id|season_id → { payment_plan, include_membership_fee } */
    let swimmerSeasonBilling = {};

    const PAYMENT_PLAN_LABELS = {
        monthly: 'Mesečno',
        lump_sum: 'Enkratno (oktober)',
        two_installments: '2 obroka (okt. + feb.)'
    };

    const PAYMENT_PLAN_REPORT_GROUP_LABELS = {
        monthly: 'Mesečno plačilo',
        two_installments: 'Plačilo dvakrat letno',
        lump_sum: 'Plačilo enkrat letno'
    };

    // Trenutni mesec in leto za finance sekcijo
    const now = new Date();
    let currentFinanceMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentFinanceYear = now.getFullYear();
    //// console.log('🔍 Inicializacija mesecev:');
    //// console.log('- Trenutni datum:', now);
    //// console.log('- now.getMonth():', now.getMonth(), '(0-based)');
    //// console.log('- currentFinanceMonth:', currentFinanceMonth, '(1-based)');
    //// console.log('- currentFinanceYear:', currentFinanceYear);
    
    // Trenutni mesec in leto za swimmer fees sekcijo
    let currentSwimmerFeesMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentSwimmerFeesYear = now.getFullYear();
    
    // Trenutni mesec in leto za postavke trenerjev
    let currentTrainerRatesMonth = now.getMonth() + 1; // 1-12
    let currentTrainerRatesYear = now.getFullYear();
    //// console.log('🔍 Inicializacija swimmer fees - mesec:', currentSwimmerFeesMonth, 'leto:', currentSwimmerFeesYear);
    
    // Trenutni mesec in leto za trainer summary sekcijo
    let currentTrainerSummaryMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentTrainerSummaryYear = now.getFullYear();
    //// console.log('🔍 Inicializacija trainer summary - mesec:', currentTrainerSummaryMonth, 'leto:', currentTrainerSummaryYear);
    
    // Trenutni mesec in leto za trainer notes sekcijo
    let currentTrainerNotesMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentTrainerNotesYear = now.getFullYear();
    //// console.log('🔍 Inicializacija trainer notes - mesec:', currentTrainerNotesMonth, 'leto:', currentTrainerNotesYear);
    
    // Trenutni mesec in leto za trainer hours sekcijo
    let currentTrainerHoursMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentTrainerHoursYear = now.getFullYear();
    //// console.log('🔍 Inicializacija trainer hours - mesec:', currentTrainerHoursMonth, 'leto:', currentTrainerHoursYear);
    
    // Trenutni mesec in leto za swimmer summary sekcijo
    let currentSwimmerSummaryMonth = now.getMonth() + 1; // 1-12 (September = 9)
    let currentSwimmerSummaryYear = now.getFullYear();
    //// console.log('🔍 Inicializacija swimmer summary - mesec:', currentSwimmerSummaryMonth, 'leto:', currentSwimmerSummaryYear);
    
    // Spremenljivke za OLY swimmer summary
    let currentOlySwimmerSummaryMonth = now.getMonth() + 1;
    let currentOlySwimmerSummaryYear = now.getFullYear();

    // Poročilo za računovodstvo
    let currentAccountingReportMonth = now.getMonth() + 1;
    let currentAccountingReportYear = now.getFullYear();
    /** season_id → [{ swimmer_id, sort_order }] */
    let accountingReportOrderBySeason = {};
    /** Delovni vrstni red (swimmer id[]) za trenutno sezono v urejevalniku */
    let accountingReportWorkingOrder = [];

    /** Privzeti vrstni red iz poročila maj 2026 (sezona 2025/26) */
    const ACCOUNTING_REPORT_SEED_NAMES = [
        'David Kosi', 'Filip Velko Veselinov', 'Petra Hostnik', 'Sara Breznikar', 'Stefan Gjorevski',
        'Anita Novak Valant', 'Boštjan Sluga', 'Irena Pentič', 'Iztok Škabar', 'Jaka Koren',
        'Klemen Lazarevski', 'Rok Zajc', 'Marko Kebe', 'Aljoša Koren', 'Benjamin Hadžialjević',
        'Borut Kariž', 'Ela Kranjc', 'Jan Prešeren', 'Matic Slabe', 'Nataša Rus Kukovič',
        'Urška Kos', 'Kristina Šparemblek', 'Katja Jerovšek', 'Vesna Filipovič', 'Milenko Bursać',
        'Brigita Puš', 'Juš Gašparič', 'Katja Kobolt', 'Peter Štemberger', 'Primož Podbregar',
        'Grega Boštjančič', 'Petra Turk', 'Marjan Uršič', 'Mihaela Žitko', 'Marko Jermaniš',
        'Tjaša Longar Kraševec'
    ];

    const DAYNAME = ["","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota","Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];

    // ===== Pomožne funkcije =====
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function calcTrainerCostFromSessions(sessions, ratePerSession) {
        return sessions * (parseFloat(ratePerSession) || 0);
    }

    function countTrainerSessionsInMonth(trainer, month, year, seasonId) {
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month - 1, lastDay);
        const assignedTermIds = new Set(trainer.terms || []);
        let sessions = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            TERMS.forEach(term => {
                if (!assignedTermIds.has(term.id)) return;
                if (seasonId && term.season_id !== seasonId) return;
                if (term.day !== dayOfWeek || isoDate < term.date_from || isoDate > term.date_to) return;
                const ts = getTermStatus(d, term.id);
                if (ts.status !== 'inactive') sessions += 1;
            });
        }
        return sessions;
    }

    function syncAllFinanceMonthDisplays() {
        updateFinanceMonthDisplay();
        updateSwimmerFeesMonthDisplay();
        updateTrainerRatesMonthDisplay();
        updateAccountingReportMonthDisplay();
    }

    function setAdminFinanceMonth(month, year, options = {}) {
        const { refresh = true, updateHash = false } = options;
        if (month < 1 || month > 12 || !year) return;
        currentFinanceMonth = month;
        currentFinanceYear = year;
        currentSwimmerFeesMonth = month;
        currentSwimmerFeesYear = year;
        currentTrainerRatesMonth = month;
        currentTrainerRatesYear = year;
        currentAccountingReportMonth = month;
        currentAccountingReportYear = year;
        syncAllFinanceMonthDisplays();
        if (updateHash && currentSection === 'finance') setAdminSectionHash('finance');
        if (refresh) refreshAllFinanceViews();
    }

    async function refreshAllFinanceViews() {
        calculateFinanceData();
        refreshSwimmerFees();
        await renderTrainerRatesSettings();
        refreshAccountingReportEditor();
    }

    function updateAdminSeasonContextLabels() {
        const seasonId = getAdminSeasonFilterId();
        const seasonName = getSeasonNameById(seasonId);
        const label = seasonName ? `Velja za: ${seasonName}` : 'Izberite sezono v pasu zgoraj.';
        document.querySelectorAll('[data-season-context]').forEach(el => {
            el.textContent = label;
        });
        const setupNote = document.getElementById('seasonSetupSeasonNote');
        if (setupNote) {
            setupNote.textContent = seasonName
                ? `Sezona: ${seasonName} — enaka kot v pasu zgoraj.`
                : 'Izberite sezono v pasu zgoraj.';
        }
        const pklBadge = document.querySelector('.pkl-fee-badge');
        if (pklBadge) {
            pklBadge.textContent = seasonName || 'Brez sezone';
        }
    }
    
    // Funkcije za navigacijo skozi mesece
    function updateFinanceMonthDisplay() {
        //// console.log('🔍 updateFinanceMonthDisplay - currentFinanceMonth:', currentFinanceMonth, 'currentFinanceYear:', currentFinanceYear);
        //// console.log('🔍 updateFinanceMonthDisplay - elCurrentMonthYear:', elCurrentMonthYear);
        //// console.log('🔍 updateFinanceMonthDisplay - elMonthYearInput:', elMonthYearInput);
        
        if (elCurrentMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentFinanceMonth - 1; // Convert 1-based to 0-based
// console.log('🔍 updateFinanceMonthDisplay - monthIndex:', monthIndex);
// console.log('🔍 updateFinanceMonthDisplay - monthNames[monthIndex]:', monthNames[monthIndex]);
            
            elCurrentMonthYear.textContent = `${monthNames[monthIndex]} ${currentFinanceYear}`;
// console.log('✅ Prikazan mesec:', monthNames[monthIndex], currentFinanceYear);
        } else {
            console.warn('⚠️ elCurrentMonthYear element ni najden');
        }
        
        if (elMonthYearInput) {
            elMonthYearInput.value = `${currentFinanceYear}-${currentFinanceMonth.toString().padStart(2, '0')}`;
// console.log('✅ Kalendar nastavljen na:', elMonthYearInput.value);
        } else {
            console.warn('⚠️ elMonthYearInput element ni najden');
        }
    }
    
    function updateSwimmerFeesMonthDisplay() {
// console.log('🔍 updateSwimmerFeesMonthDisplay - currentSwimmerFeesMonth:', currentSwimmerFeesMonth, 'currentSwimmerFeesYear:', currentSwimmerFeesYear);
        if (elCurrentSwimmerFeesMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentSwimmerFeesMonth - 1; // Convert 1-based to 0-based
            elCurrentSwimmerFeesMonthYear.textContent = `${monthNames[monthIndex]} ${currentSwimmerFeesYear}`;
// console.log('✅ Swimmer fees prikazan mesec:', monthNames[monthIndex], currentSwimmerFeesYear);
        } else {
            console.warn('⚠️ elCurrentSwimmerFeesMonthYear element ni najden');
        }
        if (elSwimmerFeesMonthYearInput) {
            elSwimmerFeesMonthYearInput.value = `${currentSwimmerFeesYear}-${currentSwimmerFeesMonth.toString().padStart(2, '0')}`;
// console.log('✅ Swimmer fees kalendar nastavljen na:', elSwimmerFeesMonthYearInput.value);
        } else {
            console.warn('⚠️ elSwimmerFeesMonthYearInput element ni najden');
        }
    }
    
    function updateTrainerRatesMonthDisplay() {
        const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                          "Julij", "Avgust", "September", "Oktober", "November", "December"];
        const monthIndex = currentTrainerRatesMonth - 1; // Convert 1-based to 0-based
        
        const elCurrentTrainerRatesMonthYear = document.getElementById("currentTrainerRatesMonthYear");
        if (elCurrentTrainerRatesMonthYear) {
            elCurrentTrainerRatesMonthYear.textContent = `${monthNames[monthIndex]} ${currentTrainerRatesYear}`;
        }
        
        if (elTrainerRatesMonthYearInput) {
            elTrainerRatesMonthYearInput.value = `${currentTrainerRatesYear}-${currentTrainerRatesMonth.toString().padStart(2, '0')}`;
        }
    }
    
    function navigateTrainerRatesMonth(direction) {
        let m = currentTrainerRatesMonth;
        let y = currentTrainerRatesYear;
        if (direction === 'prev') {
            m--;
            if (m < 1) { m = 12; y--; }
        } else if (direction === 'next') {
            m++;
            if (m > 12) { m = 1; y++; }
        }
        setAdminFinanceMonth(m, y);
    }
    
    function goToCurrentTrainerRatesMonth() {
        const now = new Date();
        setAdminFinanceMonth(now.getMonth() + 1, now.getFullYear());
    }
    
    function navigateFinanceMonth(direction) {
        let m = currentFinanceMonth;
        let y = currentFinanceYear;
        if (direction === 'prev') {
            m--;
            if (m < 1) { m = 12; y--; }
        } else if (direction === 'next') {
            m++;
            if (m > 12) { m = 1; y++; }
        }
        setAdminFinanceMonth(m, y, { updateHash: true });
    }
    
    function navigateSwimmerFeesMonth(direction) {
        navigateFinanceMonth(direction);
    }
    
    function goToCurrentFinanceMonth() {
        const now = new Date();
        setAdminFinanceMonth(now.getMonth() + 1, now.getFullYear(), { updateHash: true });
    }
    
    function goToCurrentSwimmerFeesMonth() {
        goToCurrentFinanceMonth();
    }
    
    // Funkcije za prikaz mesecev - trainer summary
    function updateTrainerSummaryMonthDisplay() {
// console.log('🔍 updateTrainerSummaryMonthDisplay - currentTrainerSummaryMonth:', currentTrainerSummaryMonth, 'currentTrainerSummaryYear:', currentTrainerSummaryYear);
        const elCurrentTrainerSummaryMonthYear = document.getElementById('currentTrainerSummaryMonthYear');
        const elTrainerSummaryMonthYearInput = document.getElementById('trainerSummaryMonthYearInput');
        
        if (elCurrentTrainerSummaryMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentTrainerSummaryMonth - 1; // Convert 1-based to 0-based
            elCurrentTrainerSummaryMonthYear.textContent = `${monthNames[monthIndex]} ${currentTrainerSummaryYear}`;
// console.log('✅ Trainer summary prikazan mesec:', monthNames[monthIndex], currentTrainerSummaryYear);
        } else {
            console.warn('⚠️ elCurrentTrainerSummaryMonthYear element ni najden');
        }
        
        if (elTrainerSummaryMonthYearInput) {
            elTrainerSummaryMonthYearInput.value = `${currentTrainerSummaryYear}-${currentTrainerSummaryMonth.toString().padStart(2, '0')}`;
// console.log('✅ Trainer summary kalendar nastavljen na:', elTrainerSummaryMonthYearInput.value);
        } else {
            console.warn('⚠️ elTrainerSummaryMonthYearInput element ni najden');
        }
    }
    
    function navigateTrainerSummaryMonth(direction) {
        if (direction === 'prev') {
            currentTrainerSummaryMonth--;
            if (currentTrainerSummaryMonth < 1) {
                currentTrainerSummaryMonth = 12;
                currentTrainerSummaryYear--;
            }
        } else if (direction === 'next') {
            currentTrainerSummaryMonth++;
            if (currentTrainerSummaryMonth > 12) {
                currentTrainerSummaryMonth = 1;
                currentTrainerSummaryYear++;
            }
        }
        updateTrainerSummaryMonthDisplay();
        calculateTrainerSummaryData();
    }
    
    function goToCurrentTrainerSummaryMonth() {
        const now = new Date();
        currentTrainerSummaryMonth = now.getMonth() + 1;
        currentTrainerSummaryYear = now.getFullYear();
        updateTrainerSummaryMonthDisplay();
        calculateTrainerSummaryData();
    }
    
    // Funkcije za prikaz mesecev - trainer hours
    function updateTrainerHoursMonthDisplay() {
// console.log('🔍 updateTrainerHoursMonthDisplay - currentTrainerHoursMonth:', currentTrainerHoursMonth, 'currentTrainerHoursYear:', currentTrainerHoursYear);
        const elCurrentTrainerHoursMonthYear = document.getElementById('currentTrainerHoursMonthYear');
        const elTrainerHoursMonthYearInput = document.getElementById('trainerHoursMonthYearInput');
        
        if (elCurrentTrainerHoursMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentTrainerHoursMonth - 1; // Convert 1-based to 0-based
            elCurrentTrainerHoursMonthYear.textContent = `${monthNames[monthIndex]} ${currentTrainerHoursYear}`;
// console.log('✅ Trainer hours prikazan mesec:', monthNames[monthIndex], currentTrainerHoursYear);
        } else {
            console.warn('⚠️ elCurrentTrainerHoursMonthYear element ni najden');
        }
        
        if (elTrainerHoursMonthYearInput) {
            elTrainerHoursMonthYearInput.value = `${currentTrainerHoursYear}-${currentTrainerHoursMonth.toString().padStart(2, '0')}`;
// console.log('✅ Trainer hours kalendar nastavljen na:', elTrainerHoursMonthYearInput.value);
        } else {
            console.warn('⚠️ elTrainerHoursMonthYearInput element ni najden');
        }
    }
    
    function navigateTrainerHoursMonth(direction) {
        if (direction === 'prev') {
            currentTrainerHoursMonth--;
            if (currentTrainerHoursMonth < 1) {
                currentTrainerHoursMonth = 12;
                currentTrainerHoursYear--;
            }
        } else if (direction === 'next') {
            currentTrainerHoursMonth++;
            if (currentTrainerHoursMonth > 12) {
                currentTrainerHoursMonth = 1;
                currentTrainerHoursYear++;
            }
        }
        updateTrainerHoursMonthDisplay();
        calculateTrainerHoursCostsData();
    }
    
    function goToCurrentTrainerHoursMonth() {
        const now = new Date();
        currentTrainerHoursMonth = now.getMonth() + 1;
        currentTrainerHoursYear = now.getFullYear();
        updateTrainerHoursMonthDisplay();
        calculateTrainerHoursCostsData();
    }
    
    // Funkcije za prikaz mesecev - trainer notes
    function updateTrainerNotesMonthDisplay() {
// console.log('🔍 updateTrainerNotesMonthDisplay - currentTrainerNotesMonth:', currentTrainerNotesMonth, 'currentTrainerNotesYear:', currentTrainerNotesYear);
        const elCurrentTrainerNotesMonthYear = document.getElementById('currentTrainerNotesMonthYear');
        const elTrainerNotesMonthYearInput = document.getElementById('trainerNotesMonthYearInput');
        
        if (elCurrentTrainerNotesMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentTrainerNotesMonth - 1; // Convert 1-based to 0-based
            elCurrentTrainerNotesMonthYear.textContent = `${monthNames[monthIndex]} ${currentTrainerNotesYear}`;
// console.log('✅ Trainer notes prikazan mesec:', monthNames[monthIndex], currentTrainerNotesYear);
        } else {
            console.warn('⚠️ elCurrentTrainerNotesMonthYear element ni najden');
        }
        
        if (elTrainerNotesMonthYearInput) {
            elTrainerNotesMonthYearInput.value = `${currentTrainerNotesYear}-${currentTrainerNotesMonth.toString().padStart(2, '0')}`;
// console.log('✅ Trainer notes kalendar nastavljen na:', elTrainerNotesMonthYearInput.value);
        } else {
            console.warn('⚠️ elTrainerNotesMonthYearInput element ni najden');
        }
    }
    
    function navigateTrainerNotesMonth(direction) {
        if (direction === 'prev') {
            currentTrainerNotesMonth--;
            if (currentTrainerNotesMonth < 1) {
                currentTrainerNotesMonth = 12;
                currentTrainerNotesYear--;
            }
        } else if (direction === 'next') {
            currentTrainerNotesMonth++;
            if (currentTrainerNotesMonth > 12) {
                currentTrainerNotesMonth = 1;
                currentTrainerNotesYear++;
            }
        }
        updateTrainerNotesMonthDisplay();
        calculateTrainerNotesData();
    }
    
    function goToCurrentTrainerNotesMonth() {
        const now = new Date();
        currentTrainerNotesMonth = now.getMonth() + 1;
        currentTrainerNotesYear = now.getFullYear();
        updateTrainerNotesMonthDisplay();
        calculateTrainerNotesData();
    }
    
    // Funkcije za prikaz mesecev - swimmer summary
    function updateSwimmerSummaryMonthDisplay() {
// console.log('🔍 updateSwimmerSummaryMonthDisplay - currentSwimmerSummaryMonth:', currentSwimmerSummaryMonth, 'currentSwimmerSummaryYear:', currentSwimmerSummaryYear);
        const elCurrentSwimmerSummaryMonthYear = document.getElementById('currentSwimmerSummaryMonthYear');
        const elSwimmerSummaryMonthYearInput = document.getElementById('swimmerSummaryMonthYearInput');
        
        if (elCurrentSwimmerSummaryMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentSwimmerSummaryMonth - 1; // Convert 1-based to 0-based
            elCurrentSwimmerSummaryMonthYear.textContent = `${monthNames[monthIndex]} ${currentSwimmerSummaryYear}`;
// console.log('✅ Swimmer summary prikazan mesec:', monthNames[monthIndex], currentSwimmerSummaryYear);
        } else {
            console.warn('⚠️ elCurrentSwimmerSummaryMonthYear element ni najden');
        }
        
        if (elSwimmerSummaryMonthYearInput) {
            elSwimmerSummaryMonthYearInput.value = `${currentSwimmerSummaryYear}-${currentSwimmerSummaryMonth.toString().padStart(2, '0')}`;
// console.log('✅ Swimmer summary kalendar nastavljen na:', elSwimmerSummaryMonthYearInput.value);
        } else {
            console.warn('⚠️ elSwimmerSummaryMonthYearInput element ni najden');
        }
    }
    
    function navigateSwimmerSummaryMonth(direction) {
        if (direction === 'prev') {
            currentSwimmerSummaryMonth--;
            if (currentSwimmerSummaryMonth < 1) {
                currentSwimmerSummaryMonth = 12;
                currentSwimmerSummaryYear--;
            }
        } else if (direction === 'next') {
            currentSwimmerSummaryMonth++;
            if (currentSwimmerSummaryMonth > 12) {
                currentSwimmerSummaryMonth = 1;
                currentSwimmerSummaryYear++;
            }
        }
        updateSwimmerSummaryMonthDisplay();
        refreshSwimmerSummary();
    }
    
    function goToCurrentSwimmerSummaryMonth() {
        const now = new Date();
        currentSwimmerSummaryMonth = now.getMonth() + 1;
        currentSwimmerSummaryYear = now.getFullYear();
        updateSwimmerSummaryMonthDisplay();
        refreshSwimmerSummary();
    }
    
    // Funkcije za prikaz mesecev - OLY swimmer summary
    function updateOlySwimmerSummaryMonthDisplay() {
        const elCurrentOlySwimmerSummaryMonthYear = document.getElementById('currentOlySwimmerSummaryMonthYear');
        const elOlySwimmerSummaryMonthYearInput = document.getElementById('olySwimmerSummaryMonthYearInput');
        
        if (elCurrentOlySwimmerSummaryMonthYear) {
            const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                              "Julij", "Avgust", "September", "Oktober", "November", "December"];
            const monthIndex = currentOlySwimmerSummaryMonth - 1;
            elCurrentOlySwimmerSummaryMonthYear.textContent = `${monthNames[monthIndex]} ${currentOlySwimmerSummaryYear}`;
        }
        
        if (elOlySwimmerSummaryMonthYearInput) {
            elOlySwimmerSummaryMonthYearInput.value = `${currentOlySwimmerSummaryYear}-${currentOlySwimmerSummaryMonth.toString().padStart(2, '0')}`;
        }
    }
    
    function navigateOlySwimmerSummaryMonth(direction) {
        if (direction === 'prev') {
            currentOlySwimmerSummaryMonth--;
            if (currentOlySwimmerSummaryMonth < 1) {
                currentOlySwimmerSummaryMonth = 12;
                currentOlySwimmerSummaryYear--;
            }
        } else if (direction === 'next') {
            currentOlySwimmerSummaryMonth++;
            if (currentOlySwimmerSummaryMonth > 12) {
                currentOlySwimmerSummaryMonth = 1;
                currentOlySwimmerSummaryYear++;
            }
        }
        updateOlySwimmerSummaryMonthDisplay();
        refreshOlySwimmerSummary();
    }
    
    function goToCurrentOlySwimmerSummaryMonth() {
        const now = new Date();
        currentOlySwimmerSummaryMonth = now.getMonth() + 1;
        currentOlySwimmerSummaryYear = now.getFullYear();
        updateOlySwimmerSummaryMonthDisplay();
        refreshOlySwimmerSummary();
    }

    function isValidPhone(phone) {
        // Preveri, ali je telefonska številka v veljavnem formatu
        // Dovoli različne formate: +386 40 123 456, 040 123 456, 040123456, itd.
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
        return phoneRegex.test(phone);
    }

    // ===== UI elementi =====
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
    const elNewEmail = document.getElementById("newEmail");
    const elNewPhone = document.getElementById("newPhone");
    const elNewAddress = document.getElementById("newAddress");
    const elNewPostalCode = document.getElementById("newPostalCode");
    const elAddSwimmerBtn = document.getElementById("addSwimmerBtn");
    const elSwimmerSelect = document.getElementById("swimmerSelect");
    const elAssignTermBtn = document.getElementById("assignTermBtn");
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn");
    const elSwimmerInfo = document.getElementById("swimmerInfo");
    const elSwimmersList = document.getElementById("swimmersList");
    const elCsvInput = document.getElementById("csvInput");
    const elCsvTermsInput = document.getElementById("csvTermsInput");
    const elCsvFeesInput = document.getElementById("csvFeesInput");
    const elCsvFeesMonthSelect = document.getElementById("csvFeesMonthSelect");
    const elCsvFeesYearSelect = document.getElementById("csvFeesYearSelect");
    const elCsvAttendanceInput = document.getElementById("csvAttendanceInput");
    const elRestoreAttendanceBtn = document.getElementById("restoreAttendanceBtn");
    const elRestoreAttendanceInfo = document.getElementById("restoreAttendanceInfo");
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");
    
    // UI elementi za mailing liste
    const elMailingFilterType = document.getElementById("mailingFilterType");
    const elMailingTermsCheckboxes = document.getElementById("mailingTermsCheckboxes");
    const elMailingTermSelectRow = document.getElementById("mailingTermSelectRow");
    const elLoadMailingListBtn = document.getElementById("loadMailingListBtn");
    const elCopyMailingListBtn = document.getElementById("copyMailingListBtn");
    const elMailingListBox = document.getElementById("mailingListBox");

    // UI elementi za povzetek udeležbe plavalcev
    // Opomba: Stari elementi so bili zamenjani z navigacijskimi gumbi
    const elSwimmerSummaryBox = document.getElementById("swimmerSummaryBox");
    
    // UI elementi za povzetek udeležbe OLY plavalcev
    const elOlySwimmerSummaryBox = document.getElementById("olySwimmerSummaryBox");
    
    // UI elementi za navigacijo mesecev
    const elCurrentMonthYear = document.getElementById("currentMonthYear");
    const elPrevMonthBtn = document.getElementById("prevMonthBtn");
    const elNextMonthBtn = document.getElementById("nextMonthBtn");
    const elCurrentMonthBtn = document.getElementById("currentMonthBtn");
    const elMonthYearInput = document.getElementById("monthYearInput");
    
// console.log('🔍 UI elementi za navigacijo mesecev:');
// console.log('- elCurrentMonthYear:', elCurrentMonthYear);
// console.log('- elPrevMonthBtn:', elPrevMonthBtn);
// console.log('- elNextMonthBtn:', elNextMonthBtn);
// console.log('- elCurrentMonthBtn:', elCurrentMonthBtn);
// console.log('- elMonthYearInput:', elMonthYearInput);
    
    // UI elementi za navigacijo mesecev plavalcev
    const elCurrentSwimmerFeesMonthYear = document.getElementById("currentSwimmerFeesMonthYear");
    const elPrevSwimmerFeesMonthBtn = document.getElementById("prevSwimmerFeesMonthBtn");
    const elNextSwimmerFeesMonthBtn = document.getElementById("nextSwimmerFeesMonthBtn");
    const elCurrentSwimmerFeesMonthBtn = document.getElementById("currentSwimmerFeesMonthBtn");
    const elSwimmerFeesMonthYearInput = document.getElementById("swimmerFeesMonthYearInput");

    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDateFrom = document.getElementById("newTermDateFrom");
    const elNewTermDateTo = document.getElementById("newTermDateTo");
    const elAddTermBtn = document.getElementById("addTermBtn");
    const elTermList = document.getElementById("termList");

    // UI elementi za trenerje
    const elNewTrainerFirst = document.getElementById("newTrainerFirst");
    const elNewTrainerLast = document.getElementById("newTrainerLast");
    const elNewTrainerEmail = document.getElementById("newTrainerEmail");
    const elNewTrainerPhone = document.getElementById("newTrainerPhone");
    const elAddTrainerBtn = document.getElementById("addTrainerBtn");
    const elTrainerSelect = document.getElementById("trainerSelect");
    const elAssignTrainerTermBtn = document.getElementById("assignTrainerTermBtn");
    const elDeleteTrainerBtn = document.getElementById("deleteTrainerBtn");
    const elTrainerInfo = document.getElementById("trainerInfo");
    const elTrainersList = document.getElementById("trainersList");
    // Opomba: Stari elementi za trainer summary so bili zamenjani z navigacijskimi gumbi
    const elTrainerSummaryBox = document.getElementById("trainerSummaryBox");
    const elTrainerHoursCostsBox = document.getElementById("trainerHoursCostsBox");
    
    // UI elementi za Finance sekcijo
    // Opomba: Stari elementi so bili zamenjani z navigacijskimi gumbi
    const elFinanceSummaryBox = document.getElementById("financeSummaryBox");
    const elDetailedCostsBox = document.getElementById("detailedCostsBox");
    const elManagementCostPerMonth = document.getElementById("managementCostPerMonth");
    const elSaveCostsBtn = document.getElementById("saveCostsBtn");
    
    // UI elementi za nastavitve stroškov prog in urnih postavk
    const elTermCostsSettings = document.getElementById("termCostsSettings");
    const elSaveTermCostsBtn = document.getElementById("saveTermCostsBtn");
    const elTrainerRatesSettings = document.getElementById("trainerRatesSettings");
    const elSaveTrainerRatesBtn = document.getElementById("saveTrainerRatesBtn");
    const elTrainerRatesMonthYearInput = document.getElementById("trainerRatesMonthYearInput");
    
    // UI elementi za upravljanje pristojbin plavalcev
    // Opomba: Stari elementi so bili zamenjani z navigacijskimi gumbi
    const elSwimmerFeesBox = document.getElementById("swimmerFeesBox");
    
    const elEditTermModal = document.getElementById("editTermModal");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elEditTermStart = document.getElementById("editTermStart");
    const elEditTermEnd = document.getElementById("editTermEnd");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
    const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");

    // Elementi za modal urejanja plavalca
    const elEditSwimmerModal = document.getElementById("editSwimmerModal");
    const elEditSwimmerModalTitle = document.getElementById("editSwimmerModalTitle");
    const elEditSwimmerFirst = document.getElementById("editSwimmerFirst");
    const elEditSwimmerLast = document.getElementById("editSwimmerLast");
    const elEditSwimmerEmail = document.getElementById("editSwimmerEmail");
    const elEditSwimmerPhone = document.getElementById("editSwimmerPhone");
    const elEditSwimmerAddress = document.getElementById("editSwimmerAddress");
    const elEditSwimmerPostalCode = document.getElementById("editSwimmerPostalCode");
    const elEditSwimmerPaymentPlan = document.getElementById("editSwimmerPaymentPlan");
    const elEditSwimmerOly = document.getElementById("editSwimmerOly");
    const elEditSwimmerOlyHint = document.getElementById("editSwimmerOlyHint");
    const elEditSwimmerNotes = document.getElementById("editSwimmerNotes");
    const elEditSwimmerTermsBox = document.getElementById("editSwimmerTermsBox");
    const elEditSwimmerSeasonLabel = document.getElementById("editSwimmerSeasonLabel");
    const elEditSwimmerPastSeasons = document.getElementById("editSwimmerPastSeasons");
    const elSaveEditSwimmerBtn = document.getElementById("saveEditSwimmerBtn");
    const elCloseEditSwimmerModalBtn = document.getElementById("closeEditSwimmerModalBtn");
    const elEditSwimmerInfo = document.getElementById("editSwimmerInfo");

    // Elementi za modal urejanja trenerja
    const elEditTrainerModal = document.getElementById("editTrainerModal");
    const elEditTrainerModalTitle = document.getElementById("editTrainerModalTitle");
    const elEditTrainerFirst = document.getElementById("editTrainerFirst");
    const elEditTrainerLast = document.getElementById("editTrainerLast");
    const elEditTrainerEmail = document.getElementById("editTrainerEmail");
    const elEditTrainerPhone = document.getElementById("editTrainerPhone");
    const elEditTrainerRole = document.getElementById("editTrainerRole");
    const elEditTrainerAuthHint = document.getElementById("editTrainerAuthHint");
    const elEditTrainerTermsBox = document.getElementById("editTrainerTermsBox");
    const elEditTrainerSeasonLabel = document.getElementById("editTrainerSeasonLabel");
    const elEditTrainerRate = document.getElementById("editTrainerRate");
    const elEditTrainerRateMonthLabel = document.getElementById("editTrainerRateMonthLabel");
    const elEditTrainerPastSeasons = document.getElementById("editTrainerPastSeasons");
    const elSaveEditTrainerBtn = document.getElementById("saveEditTrainerBtn");
    const elCloseEditTrainerModalBtn = document.getElementById("closeEditTrainerModalBtn");
    const elEditTrainerInfo = document.getElementById("editTrainerInfo");
    const elInviteTrainerFromModalBtn = document.getElementById("inviteTrainerFromModalBtn");
    const elInviteAllTrainersBtn = document.getElementById("inviteAllTrainersBtn");

    // ===== Pomožne funkcije =====
    function mkSwimmer(first,last,terms=[]){ return { first_name:first, last_name:last, terms:[...new Set(terms)] }; }
    function iso(d){ 
      // Formatira lokalni datum kot ISO string (YYYY-MM-DD)
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      
      const isoString = year + '-' + 
                       String(month + 1).padStart(2, '0') + '-' + 
                       String(day).padStart(2, '0');
      
      return isoString;
    }
    
    // Formatira čas brez sekund (HH:MM:SS -> HH:MM)
    function formatTimeWithoutSeconds(timeStr) {
        if (!timeStr) return '';
        // Če čas vsebuje sekunde, jih odstrani
        if (timeStr.includes(':') && timeStr.split(':').length === 3) {
            return timeStr.slice(0, 5); // Vzemi prve 5 znakov (HH:MM)
        }
        // Če je že v formatu HH:MM, ga vrni kot je
        return timeStr;
    }
    
    function parseDate(dateStr) {
      const parts = dateStr.split(/[\s/.]/).filter(Boolean);
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
      }
      return iso(date);
    }

    function formatDate(isoStr) {
      if (!isoStr) return "";
      const [y, m, d] = isoStr.split('-').map(Number);
      return `${String(d).padStart(2, '0')} / ${String(m).padStart(2, '0')} / ${y}`;
    }

    /** Aktiven plavalec z vsaj enim dodeljenim terminom (polje terms) */
    function swimmerHasAssignedTerms(swimmer) {
        return !!(swimmer && !swimmer.is_deleted && swimmer.terms && swimmer.terms.length > 0);
    }
    
    function getTermsForDate(date) {
        const w = date.getDay() === 0 ? 7 : date.getDay();
        const isoDate = iso(date);
        return TERMS.filter(t => isoDate >= t.date_from && isoDate <= t.date_to && t.day == w);
    }
    
    function getTermStatus(date, termId) {
        const ymd = iso(date);
        const status = termStatus[ymd]?.[termId]?.status || "active";
        const note = termStatus[ymd]?.[termId]?.note || "";
        const notes = termStatus[ymd]?.[termId]?.notes || "";
        return { status, note, notes };
    }

    /** Začetek pred 12:00 = jutranji blok poročila */
    function isTermMorningSlot(term) {
        if (!term || !term.start_time) return false;
        const h = parseInt(String(term.start_time).split(':')[0], 10);
        return !Number.isNaN(h) && h < 12;
    }

    function getTermsForSeason(season) {
        if (!season || !season.id) return [];
        return TERMS.filter(t => {
            if (t.season_id) return t.season_id === season.id;
            const tf = t.date_from;
            const tt = t.date_to;
            return !(tt < season.date_from || tf > season.date_to);
        });
    }

    function ymInSeasonRange(year, month, season) {
        const d = new Date(year, month - 1, 1);
        const s = new Date(season.date_from);
        const e = new Date(season.date_to);
        const startM = new Date(s.getFullYear(), s.getMonth(), 1);
        const endM = new Date(e.getFullYear(), e.getMonth(), 1);
        return d >= startM && d <= endM;
    }

    // Funkcija za pridobitev aktivnih terminov (ki še niso potekli)
    function getActiveTerms() {
        const today = new Date();
        const todayISO = iso(today);
        return TERMS.filter(term => term.date_to >= todayISO);
    }

    function getAdminSeasonFilterId() {
        const el = document.getElementById('adminSeasonFilter');
        if (el && el.value) return el.value;
        const rawSaved = sessionStorage.getItem(TERM_LIST_SEASON_STORAGE_KEY);
        if (rawSaved && seasons.some(s => s.id === rawSaved)) return rawSaved;
        const activeS = seasons.find(s => s.is_active);
        return activeS ? activeS.id : (seasons[0]?.id || '');
    }

    function getSwimmersSeasonFilterId() {
        return getAdminSeasonFilterId();
    }

    function getAdminSeasonTermIds() {
        const seasonId = getAdminSeasonFilterId();
        if (!seasonId) return null;
        return getAdminSeasonTermIdsForSeason(seasonId);
    }

    function getAdminSeasonTermIdsForSeason(seasonId) {
        if (!seasonId) return null;
        return new Set(TERMS.filter(t => t.season_id === seasonId).map(t => t.id));
    }

    function getSwimmersSeasonTermIds() {
        return getAdminSeasonTermIds();
    }

    function termMatchesAdminSeasonFilter(termId) {
        const seasonTermIds = getAdminSeasonTermIds();
        if (!seasonTermIds) return true;
        return seasonTermIds.has(termId);
    }

    function termMatchesSwimmersSeasonFilter(termId) {
        return termMatchesAdminSeasonFilter(termId);
    }

    function entityHasTermsInAdminSeason(entity) {
        if (!entity?.terms?.length) return false;
        const seasonId = getAdminSeasonFilterId();
        if (!seasonId) return true;
        return entity.terms.some(tid => {
            const t = TERMS.find(x => x.id === tid);
            return t && t.season_id === seasonId;
        });
    }

    function countTermsInAdminSeason(termIds) {
        const seasonTermIds = getAdminSeasonTermIds();
        if (!seasonTermIds) return (termIds || []).length;
        return (termIds || []).filter(tid => seasonTermIds.has(tid)).length;
    }

    /** Obračunska obdobja: 1. obrok/enkratno = oktober, 2. obrok = februar (leto za februar = leto oktobra + 1) */
    function getSeasonBillingSchedule(season) {
        const df = season?.date_from || '';
        const parts = df.split('-').map(Number);
        const startYear = parts[0] || new Date().getFullYear();
        const startMonth = parts[1] || 9;
        const billing1Year = startMonth <= 9 ? startYear : startYear + 1;
        return {
            billing1: { month: 10, year: billing1Year },
            billing2: { month: 2, year: billing1Year + 1 }
        };
    }

    function isBillingMonthForPlan(paymentPlan, month, year, season) {
        if (!paymentPlan || paymentPlan === 'monthly') return true;
        if (!season) return paymentPlan === 'monthly';
        const { billing1, billing2 } = getSeasonBillingSchedule(season);
        const matches = (b) => month === b.month && year === b.year;
        if (paymentPlan === 'lump_sum') return matches(billing1);
        if (paymentPlan === 'two_installments') return matches(billing1) || matches(billing2);
        return true;
    }

    /** Ali mesec/leto spada v koledarsko obdobje sezone */
    function isMonthInSeason(month, year, season) {
        if (!season?.date_from || !season?.date_to) return true;
        const d = new Date(year, month - 1, 1);
        const from = new Date(season.date_from);
        const to = new Date(season.date_to);
        from.setDate(1);
        to.setDate(1);
        d.setHours(0, 0, 0, 0);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return d >= from && d <= to;
    }

    /** Kratka sezona (npr. poletna = 1 mesec) — samo mesečno plačilo */
    function isShortSeason(season) {
        if (!season?.date_from || !season?.date_to) return false;
        const from = new Date(season.date_from);
        const to = new Date(season.date_to);
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
        return months <= 1;
    }

    function getAllowedPaymentPlansForSeason(season) {
        if (isShortSeason(season)) return ['monthly'];
        return Object.keys(PAYMENT_PLAN_LABELS);
    }

    /** Ali naj plavalec pride v obračun / poročilo za določen mesec */
    function shouldIncludeSwimmerInBillingMonth(swimmerId, month, year, season, seasonId) {
        const plan = getSwimmerPaymentPlan(swimmerId, seasonId);
        if (plan === 'monthly') return isMonthInSeason(month, year, season);
        return isBillingMonthForPlan(plan, month, year, season);
    }

    const EMPTY_BILLING_RECORD = {
        payment_plan: 'monthly',
        membership_charged_month: null,
        membership_charged_year: null
    };

    function getSwimmerSeasonBillingRecord(swimmerId, seasonId) {
        const sid = seasonId || getAdminSeasonFilterId();
        if (!sid) return { ...EMPTY_BILLING_RECORD };
        return swimmerSeasonBilling[`${swimmerId}|${sid}`] || { ...EMPTY_BILLING_RECORD };
    }

    function getSwimmerPaymentPlan(swimmerId, seasonId) {
        const plan = getSwimmerSeasonBillingRecord(swimmerId, seasonId).payment_plan;
        const sid = seasonId || getAdminSeasonFilterId();
        const season = seasons.find(s => s.id === sid);
        if (season && isShortSeason(season) && plan !== 'monthly') return 'monthly';
        return plan;
    }

    /** Mesec/leto obračuna članarine za sezono, ali null če je plavalec ne plača */
    function getMembershipChargedPeriod(swimmerId, seasonId) {
        const rec = getSwimmerSeasonBillingRecord(swimmerId, seasonId);
        if (!rec.membership_charged_month || !rec.membership_charged_year) return null;
        return { month: rec.membership_charged_month, year: rec.membership_charged_year };
    }

    function isMembershipChargedInMonth(swimmerId, seasonId, month, year) {
        const p = getMembershipChargedPeriod(swimmerId, seasonId);
        return !!p && p.month === month && p.year === year;
    }

    function formatMembershipPeriod(period) {
        if (!period) return '';
        return new Date(period.year, period.month - 1, 1)
            .toLocaleDateString('sl-SI', { month: 'short', year: 'numeric' });
    }

    async function upsertSwimmerSeasonBilling(swimmerId, seasonId, patch) {
        const sid = seasonId || getAdminSeasonFilterId();
        if (!sid) {
            showMessage('Izberite sezono v pasu zgoraj.', 'warning');
            return false;
        }
        const current = getSwimmerSeasonBillingRecord(swimmerId, sid);
        const next = {
            payment_plan: patch.payment_plan || current.payment_plan || 'monthly',
            membership_charged_month: patch.membership_charged_month !== undefined
                ? patch.membership_charged_month
                : current.membership_charged_month,
            membership_charged_year: patch.membership_charged_year !== undefined
                ? patch.membership_charged_year
                : current.membership_charged_year
        };
        try {
            const { error } = await supabase.from('swimmer_season_billing').upsert({
                swimmer_id: swimmerId,
                season_id: sid,
                payment_plan: next.payment_plan,
                include_membership_fee: !!next.membership_charged_month,
                membership_charged_month: next.membership_charged_month,
                membership_charged_year: next.membership_charged_year
            }, { onConflict: 'swimmer_id,season_id' });
            if (error) throw error;
            swimmerSeasonBilling[`${swimmerId}|${sid}`] = next;
            return true;
        } catch (e) {
            console.error(e);
            showMessage('Napaka pri shranjevanju: ' + (e.message || e), 'error');
            return false;
        }
    }

    /** Paketno shranjevanje (globalni gumb) – en zahtevek namesto zanke */
    async function bulkUpsertSeasonBilling(entries, seasonId) {
        const sid = seasonId || getAdminSeasonFilterId();
        if (!sid || !entries.length) return false;
        const payload = entries.map(({ swimmerId, membership_charged_month, membership_charged_year }) => {
            const current = getSwimmerSeasonBillingRecord(swimmerId, sid);
            return {
                swimmer_id: swimmerId,
                season_id: sid,
                payment_plan: current.payment_plan || 'monthly',
                include_membership_fee: !!membership_charged_month,
                membership_charged_month,
                membership_charged_year
            };
        });
        try {
            const { error } = await supabase.from('swimmer_season_billing')
                .upsert(payload, { onConflict: 'swimmer_id,season_id' });
            if (error) throw error;
            payload.forEach(p => {
                swimmerSeasonBilling[`${p.swimmer_id}|${sid}`] = {
                    payment_plan: p.payment_plan,
                    membership_charged_month: p.membership_charged_month,
                    membership_charged_year: p.membership_charged_year
                };
            });
            return true;
        } catch (e) {
            console.error(e);
            showMessage('Napaka pri shranjevanju članarin: ' + (e.message || e), 'error');
            return false;
        }
    }

    function buildPaymentPlanSelectHtml(swimmerId, selectedPlan, disabled, season) {
        const allowed = getAllowedPaymentPlansForSeason(season);
        const effectivePlan = allowed.includes(selectedPlan) ? selectedPlan : 'monthly';
        const opts = Object.entries(PAYMENT_PLAN_LABELS)
            .filter(([value]) => allowed.includes(value))
            .map(([value, label]) =>
                `<option value="${value}"${value === effectivePlan ? ' selected' : ''}>${label}</option>`
            ).join('');
        const dis = disabled ? ' disabled' : '';
        return `<select class="payment-plan-select" onchange="updateSwimmerPaymentPlan('${swimmerId}', this.value)"${dis} style="font-size:12px;max-width:180px">${opts}</select>`;
    }

    function getPaymentPlanBillingHint(paymentPlan, season) {
        if (!paymentPlan || paymentPlan === 'monthly') return '';
        const { billing1, billing2 } = getSeasonBillingSchedule(season);
        const fmt = (b) => new Date(b.year, b.month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        if (paymentPlan === 'lump_sum') return `Obračun: ${fmt(billing1)}`;
        if (paymentPlan === 'two_installments') return `Obroka: ${fmt(billing1)}, ${fmt(billing2)}`;
        return '';
    }

    async function loadSwimmerSeasonBilling() {
        swimmerSeasonBilling = {};
        try {
            const { data, error } = await supabase
                .from('swimmer_season_billing')
                .select('swimmer_id, season_id, payment_plan, membership_charged_month, membership_charged_year');
            if (error) throw error;
            (data || []).forEach(row => {
                swimmerSeasonBilling[`${row.swimmer_id}|${row.season_id}`] = {
                    payment_plan: row.payment_plan || 'monthly',
                    membership_charged_month: row.membership_charged_month || null,
                    membership_charged_year: row.membership_charged_year || null
                };
            });
        } catch (e) {
            console.warn('Načini plačila niso naloženi (poženite SQL/fix_swimmer_season_billing_rls.sql):', e.message || e);
        }
    }

    async function setSwimmerPaymentPlan(swimmerId, seasonId, paymentPlan) {
        const sid = seasonId || getAdminSeasonFilterId();
        if (!sid) {
            showMessage('Izberite sezono v pasu zgoraj.', 'warning');
            return false;
        }
        if (!PAYMENT_PLAN_LABELS[paymentPlan]) return false;
        const season = seasons.find(s => s.id === sid);
        if (!getAllowedPaymentPlansForSeason(season).includes(paymentPlan)) {
            showMessage('Za kratko sezono (npr. poletno) je na voljo samo mesečno plačilo.', 'warning');
            return false;
        }
        const ok = await upsertSwimmerSeasonBilling(swimmerId, sid, { payment_plan: paymentPlan });
        if (ok) {
            updateSwimmersList();
            refreshSwimmerFees();
            if (typeof refreshAccountingReportEditor === 'function') refreshAccountingReportEditor();
            if (typeof calculateFinanceData === 'function') calculateFinanceData();
        }
        return ok;
    }

    window.updateSwimmerPaymentPlan = async function(swimmerId, paymentPlan) {
        await setSwimmerPaymentPlan(swimmerId, getAdminSeasonFilterId(), paymentPlan);
    };

    window.applyBulkPaymentPlan = async function(plan) {
        const seasonId = getAdminSeasonFilterId();
        if (!seasonId || !plan) {
            showMessage('Izberite sezono in način plačila.', 'warning');
            return;
        }
        const season = seasons.find(s => s.id === seasonId);
        if (!getAllowedPaymentPlansForSeason(season).includes(plan)) {
            showMessage('Ta način plačila ni na voljo za izbrano sezono.', 'warning');
            return;
        }
        const targets = swimmers.filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s));
        if (!targets.length) {
            showMessage('Ni plavalcev v izbrani sezoni.', 'warning');
            return;
        }
        let ok = 0;
        for (const s of targets) {
            if (await upsertSwimmerSeasonBilling(s.id, seasonId, { payment_plan: plan })) ok++;
        }
        updateSwimmersList();
        refreshSwimmerFees();
        if (typeof refreshAccountingReportEditor === 'function') refreshAccountingReportEditor();
        if (typeof calculateFinanceData === 'function') calculateFinanceData();
        showMessage(`Način «${PAYMENT_PLAN_LABELS[plan]}» nastavljen pri ${ok} plavalcih.`, 'success');
    };

    async function refreshAfterMembershipChange() {
        updateSwimmersList();
        const season = getAccountingReportSeason(currentAccountingReportMonth, currentAccountingReportYear);
        renderAccountingReportEditorTable(accountingReportWorkingOrder, season);
        syncGlobalMembershipCheckbox();
        if (typeof calculateFinanceData === 'function') calculateFinanceData();
    }

    /** Obkljuka = članarina se obračuna v mesecu, ki je odprt v poročilu (enkrat na sezono) */
    window.updateSwimmerMembershipFee = async function(swimmerId, included) {
        const seasonId = getAdminSeasonFilterId();
        const patch = included === true
            ? { membership_charged_month: currentAccountingReportMonth, membership_charged_year: currentAccountingReportYear }
            : { membership_charged_month: null, membership_charged_year: null };
        const ok = await upsertSwimmerSeasonBilling(swimmerId, seasonId, patch);
        if (ok) await refreshAfterMembershipChange();
    };

    window.clearSwimmerMembershipFee = async function(swimmerId) {
        const ok = await upsertSwimmerSeasonBilling(swimmerId, getAdminSeasonFilterId(), {
            membership_charged_month: null,
            membership_charged_year: null
        });
        if (ok) await refreshAfterMembershipChange();
    };

    async function applyGlobalMembershipFeeToReport(checked) {
        const seasonId = getAdminSeasonFilterId();
        if (!seasonId || !accountingReportWorkingOrder.length) return;
        const month = currentAccountingReportMonth;
        const year = currentAccountingReportYear;
        const entries = [];
        accountingReportWorkingOrder.forEach(row => {
            const period = getMembershipChargedPeriod(row.swimmer.id, seasonId);
            if (checked) {
                // Ne premikaj članarine, ki je bila že obračunana v drugem mesecu
                if (period) return;
                entries.push({ swimmerId: row.swimmer.id, membership_charged_month: month, membership_charged_year: year });
            } else {
                if (!period || period.month !== month || period.year !== year) return;
                entries.push({ swimmerId: row.swimmer.id, membership_charged_month: null, membership_charged_year: null });
            }
        });
        if (!entries.length) {
            syncGlobalMembershipCheckbox();
            return;
        }
        const ok = await bulkUpsertSeasonBilling(entries, seasonId);
        if (ok) await refreshAfterMembershipChange();
    }

    function syncGlobalMembershipCheckbox() {
        const el = document.getElementById('accountingIncludeMembershipFee');
        if (!el) return;
        const seasonId = getAdminSeasonFilterId();
        const month = currentAccountingReportMonth;
        const year = currentAccountingReportYear;
        const eligible = accountingReportWorkingOrder.filter(r => {
            const period = getMembershipChargedPeriod(r.swimmer.id, seasonId);
            return !period || (period.month === month && period.year === year);
        });
        if (!eligible.length) {
            el.checked = false;
            el.indeterminate = false;
            return;
        }
        const states = eligible.map(r => isMembershipChargedInMonth(r.swimmer.id, seasonId, month, year));
        el.checked = states.every(Boolean);
        el.indeterminate = !el.checked && states.some(Boolean);
    }

    function getTermsForAdminSeason(options = {}) {
        const { excludeTermIds = [] } = options;
        const seasonId = getAdminSeasonFilterId();
        let list = seasonId ? TERMS.filter(t => t.season_id === seasonId) : [...TERMS];
        if (excludeTermIds.length) {
            const excluded = new Set(excludeTermIds);
            list = list.filter(t => !excluded.has(t.id));
        }
        return list.sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.start_time.localeCompare(b.start_time);
        });
    }

    function getTermsForSwimmersSeason(options = {}) {
        return getTermsForAdminSeason(options);
    }

    function applyAdminSeasonFilter(seasonId, sourceEl) {
        sessionStorage.setItem(TERM_LIST_SEASON_STORAGE_KEY, seasonId || '');
        const termListSf = document.getElementById('termListSeasonFilter');
        const adminSf = document.getElementById('adminSeasonFilter');
        if (termListSf && termListSf !== sourceEl) termListSf.value = seasonId || '';
        if (adminSf && adminSf !== sourceEl && seasonId) adminSf.value = seasonId;
        onAdminSeasonFilterChanged();
    }

    function onAdminSeasonFilterChanged() {
        updateTermList();
        updateSwimmersList();
        updateBulkPaymentPlanSelect();
        renderTermCheckboxesForSwimmer(elSwimmerSelect?.value || '');
        refreshSwimmerSummary();
        refreshOlySwimmerSummary();
        updateTrainersList();
        populateUnassignedTerms();
        renderTermCheckboxesForTrainer(elTrainerSelect?.value || '');
        calculateTrainerSummaryData();
        calculateTrainerHoursCostsData();
        calculateTrainerNotesData();
        refreshSwimmerFees();
        renderTermCostsSettings();
        updateMailingTermSelect();
        if (typeof calculateFinanceData === 'function') {
            calculateFinanceData();
        }
        if (typeof refreshAccountingReportEditor === 'function') {
            refreshAccountingReportEditor();
        }
        renderTrainerRatesSettings();
        updateAdminSeasonContextLabels();
        updateAdminSeasonBarHint();
        if (currentSection === 'seasons') {
            renderSeasonSetupChecklist();
        }
    }

    // ===== Navigacija med sekcijami (URL: admin.html#finance) =====
    const ADMIN_SECTIONS = ['swimmers', 'terms', 'seasons', 'trainers', 'finance', 'csv', 'mailing'];

    function parseAdminHash() {
        const raw = (location.hash || '').replace(/^#/, '').trim();
        const sectionPart = raw.split(/[/?&]/)[0].toLowerCase();
        const queryPart = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryPart);
        const m = parseInt(params.get('m'), 10);
        const y = parseInt(params.get('y'), 10);
        return {
            section: ADMIN_SECTIONS.includes(sectionPart) ? sectionPart : null,
            month: m >= 1 && m <= 12 ? m : null,
            year: y >= 2000 && y <= 2100 ? y : null
        };
    }

    function getAdminSectionFromHash() {
        return parseAdminHash().section;
    }

    function setAdminSectionHash(section) {
        if (!ADMIN_SECTIONS.includes(section)) return;
        let next = `#${section}`;
        if (section === 'finance') {
            next += `?m=${currentFinanceMonth}&y=${currentFinanceYear}`;
        }
        if (location.hash !== next) history.replaceState(null, '', next);
    }

    function showAdminSection(section, options = {}) {
        const { updateHash = true } = options;
        if (!ADMIN_SECTIONS.includes(section)) section = 'swimmers';

        const targetEl = document.getElementById(`${section}-section`);
        if (!targetEl) return;

        document.querySelectorAll('.admin-nav .btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-section') === section);
        });
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        targetEl.classList.add('active');
        currentSection = section;

        if (updateHash) setAdminSectionHash(section);

        const seasonBar = document.getElementById('adminSeasonBar');
        if (seasonBar) {
            seasonBar.style.display = 'flex';
        }
        updateAdminSeasonContextLabels();

        if (section === 'seasons') {
            renderSeasonsAdminList();
            populateSeasonSelects();
            renderSeasonSetupChecklist();
        }
        if (section === 'terms') {
            populateSeasonSelects();
            const browseSel = document.getElementById('seasonTermsBrowseSelect');
            renderSeasonTermsForSeason(browseSel ? browseSel.value : '');
            updateTermList();
        }
        if (section === 'finance') {
            refreshAllFinanceViews();
        }
    }

    function applyAdminSectionFromHash() {
        const { section, month, year } = parseAdminHash();
        if (section === 'finance' && month && year) {
            setAdminFinanceMonth(month, year, { refresh: false, updateHash: false });
        }
        showAdminSection(section || currentSection || 'swimmers', { updateHash: !!section });
    }

    document.querySelectorAll('.admin-nav .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            showAdminSection(section, { updateHash: true });
        });
    });

    window.addEventListener('hashchange', () => {
        const { section, month, year } = parseAdminHash();
        if (section === 'finance' && month && year) {
            setAdminFinanceMonth(month, year, { refresh: false, updateHash: false });
        }
        if (section && section !== currentSection) {
            showAdminSection(section, { updateHash: false });
        } else if (section === 'finance') {
            refreshAllFinanceViews();
        }
    });

    // ===== Nalaganje podatkov =====
    async function loadData() {
        try {
// console.log('🔄 Začenjam nalaganje podatkov iz Supabase...');
            
            // Naloži termine iz Supabase
            const { data: termsData, error: termsError } = await supabase
                .from('terms')
                .select('*');
            
            if (termsError) {
                console.error('❌ Napaka pri nalaganju terminov:', termsError);
            } else {
                // Dodaj label za vsak termin (če še ni) - uporabi polni dan namesto okrajšave s piko
                TERMS = (termsData || []).map(t => ({
                    ...t,
                    label: t.label || `${DAYNAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`
                }));
// console.log(`✅ Naloženih terminov: ${TERMS.length}`, TERMS);
            }

            // Naloži plavalce iz Supabase
// console.log('🔍 Nalagam plavalce iz Supabase...');
            const { data: swimmersData, error: swimmersError } = await supabase
                .from('swimmers')
                .select('*');
            
            if (swimmersError) {
                console.error('❌ Napaka pri nalaganju plavalcev:', swimmersError);
            } else {
                swimmers = swimmersData || [];
// console.log(`✅ Naloženih plavalcev: ${swimmers.length}`, swimmers);
                
                // Preveri, ali so podatki pravilno naloženi
                if (swimmers.length > 0) {
// console.log('📊 Prvi plavalec:', swimmers[0]);
                } else {
// console.log('⚠️ Ni plavalcev v bazi podatkov');
                }
            }

            // Naloži prisotnost iz Supabase
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('*');
            
            if (attendanceError) {
                console.error('Napaka pri nalaganju prisotnosti:', attendanceError);
            } else {
                // Pretvori podatke v format, ki ga pričakuje aplikacija
                attendance = {};
                if (attendanceData) {
                    attendanceData.forEach(row => {
                        if (!attendance[row.date]) attendance[row.date] = {};
                        if (!attendance[row.date][row.term_id]) attendance[row.date][row.term_id] = {};
                        attendance[row.date][row.term_id][row.swimmer_id] = row.status;
                    });
                }
            }

            // Naloži status terminov iz Supabase
            const { data: termStatusData, error: termStatusError } = await supabase
                .from('term_status')
                .select('*');
            
            if (termStatusError) {
                console.error('Napaka pri nalaganju statusa terminov:', termStatusError);
            } else {
                // Pretvori podatke v format, ki ga pričakuje aplikacija
                termStatus = {};
                if (termStatusData) {
                    termStatusData.forEach(row => {
                        if (!termStatus[row.date]) termStatus[row.date] = {};
                        termStatus[row.date][row.term_id] = {
                            status: row.status,
                            note: row.note,
                            notes: row.notes
                        };
                    });
                }
            }

            // Naloži trenerje iz Supabase
            const { data: trainersData, error: trainersError } = await supabase
                .from('trainers')
                .select('*');
            
            if (trainersError) {
                console.error('❌ Napaka pri nalaganju trenerjev:', trainersError);
            } else {
                trainers = trainersData || [];
// console.log(`✅ Naloženih trenerjev: ${trainers.length}`, trainers);
            }

            // Naloži prisotnost trenerjev iz Supabase
            const { data: trainerAttendanceData, error: trainerAttendanceError } = await supabase
                .from('trainer_attendance')
                .select('*');
            
            if (trainerAttendanceError) {
                console.error('Napaka pri nalaganju prisotnosti trenerjev:', trainerAttendanceError);
            } else {
                // Pretvori podatke v format, ki ga pričakuje aplikacija
                trainerAttendance = {};
                if (trainerAttendanceData) {
                    trainerAttendanceData.forEach(row => {
                        if (!trainerAttendance[row.date]) trainerAttendance[row.date] = {};
                        if (!trainerAttendance[row.date][row.term_id]) trainerAttendance[row.date][row.term_id] = {};
                        trainerAttendance[row.date][row.term_id][row.trainer_id] = {
                            present: row.present,
                            note: row.note
                        };
                    });
                }
            }

            // Naloži termine trenerjev iz Supabase
            const { data: trainerTermsData, error: trainerTermsError } = await supabase
                .from('trainer_terms')
                .select('*');
            
            if (trainerTermsError) {
                console.error('Napaka pri nalaganju terminov trenerjev:', trainerTermsError);
            } else {
                // Dodaj termine k trenerjem
                if (trainerTermsData) {
                    trainerTermsData.forEach(row => {
                        const trainer = trainers.find(t => t.id === row.trainer_id);
                        if (trainer) {
                            if (!trainer.terms) trainer.terms = [];
                            trainer.terms.push(row.term_id);
                        }
                    });
                }
            }

            await loadSeasons();
            await loadAccountingReportOrders();
            await loadSwimmerSeasonBilling();
            populateSeasonSelects();

            // Posodobi UI
            updateSwimmerSelects();
            updateTermSelects();
            updateTrainerSelects();
            updateMailingTermSelect();
// console.log('🔄 Posodabljam UI elemente...');
            updateSwimmersList();
            updateTermList();
            updateTrainersList();
            updateExportSelects();
    updateCsvFeesSelects();
            updateTrainerSummaryControls();
            calculateTrainerSummaryData(); // Prikaži povzetek trenerjev
            calculateTrainerHoursCostsData(); // Prikaži ure in stroške trenerjev
            calculateTrainerNotesData(); // Prikaži opombe trenerjev
            
            // Osveži povzetek udeležbe plavalcev
            await refreshSwimmerSummary();
            
            // Osveži povzetek udeležbe OLY plavalcev
            await refreshOlySwimmerSummary();
            
            // Prikaži nastavitve stroškov prog in urnih postavk trenerjev
            await renderTermCostsSettings();
            await renderTrainerRatesSettings();
            updateTrainerRatesMonthDisplay();
            
            // Inicializiraj prikaz mesecev
// console.log('🔄 Inicializiram prikaz mesecev...');
// console.log('🔍 Trenutni mesec (finance):', currentFinanceMonth, currentFinanceYear);
// console.log('🔍 Elementi za inicializacijo:');
// console.log('- elCurrentMonthYear:', document.getElementById("currentMonthYear"));
// console.log('- elMonthYearInput:', document.getElementById("monthYearInput"));
            
            updateFinanceMonthDisplay();
            updateSwimmerFeesMonthDisplay();
            updateTrainerSummaryMonthDisplay();
            updateTrainerHoursMonthDisplay();
            updateTrainerNotesMonthDisplay();
            updateSwimmerSummaryMonthDisplay();
            updateOlySwimmerSummaryMonthDisplay();
            
// console.log('✅ Inicializacija prikaza mesecev končana');
            
// console.log('✅ Vsi podatki so bili uspešno naloženi in UI posodobljen!');
            
            // Preveri vadnine, stroške terminov in urne postavke trenerjev
// console.log('🔍 Preverjam vadnine, stroške terminov in urne postavke trenerjev...');
            
            // Preveri vadnine
            const { data: feesData, error: feesError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .limit(5);
            
            if (feesError) {
                console.error('❌ Napaka pri nalaganju vadnin:', feesError);
            } else {
// console.log('📊 Vadnine v bazi:', feesData);
            }
            
            // Preveri stroške terminov
            const { data: termCostsData, error: termCostsError } = await supabase
                .from('term_costs')
                .select('*');
            
            if (termCostsError) {
                console.error('❌ Napaka pri nalaganju stroškov terminov:', termCostsError);
            } else {
// console.log('📊 Stroški terminov v bazi:', termCostsData);
            }
            
            // Preveri urne postavke trenerjev
            const { data: trainerRatesData, error: trainerRatesError } = await supabase
                .from('trainer_rates')
                .select('*');
            
            if (trainerRatesError) {
                console.error('❌ Napaka pri nalaganju urnih postavk trenerjev:', trainerRatesError);
            } else {
// console.log('📊 Urne postavke trenerjev v bazi:', trainerRatesData);
            }

            applyAdminSectionFromHash();
            updateAdminSeasonContextLabels();

        } catch (error) {
            console.error('❌ Napaka pri nalaganju podatkov:', error);
        }
    }

    // ===== Upravljanje plavalcev =====

    function personDisplayName(p) {
        return `${p.first_name} ${p.last_name}`.trim();
    }

    function personMatchesSearch(p, query) {
        if (!query || !query.trim()) return true;
        const q = query.trim().toLowerCase();
        const full = personDisplayName(p).toLowerCase();
        const reversed = `${p.last_name || ''} ${p.first_name || ''}`.trim().toLowerCase();
        return full.includes(q) || reversed.includes(q) ||
            (p.email || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q);
    }

    function fillSearchableSelect(selectEl, items, emptyLabel, selectedId) {
        if (!selectEl) return;
        const prev = selectedId !== undefined ? selectedId : selectEl.value;
        selectEl.innerHTML = `<option value="">${emptyLabel}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = personDisplayName(item);
            selectEl.appendChild(option);
        });
        if (prev && [...selectEl.options].some(o => o.value === prev)) {
            selectEl.value = prev;
        }
    }

    function refreshSwimmerAssignSelect() {
        const searchInput = document.getElementById('swimmerSearchInput');
        const query = searchInput ? searchInput.value : '';
        const sorted = swimmers
            .filter(s => !s.is_deleted && personMatchesSearch(s, query))
            .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'sl'));
        fillSearchableSelect(elSwimmerSelect, sorted, 'Izberi plavalca');
        renderTermCheckboxesForSwimmer(elSwimmerSelect?.value || '');
    }

    function refreshTrainerAssignSelect() {
        const searchInput = document.getElementById('trainerSearchInput');
        const query = searchInput ? searchInput.value : '';
        const sorted = trainers
            .filter(t => !t.is_deleted && personMatchesSearch(t, query))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'sl') ||
                (a.first_name || '').localeCompare(b.first_name || '', 'sl'));
        fillSearchableSelect(elTrainerSelect, sorted, 'Izberi trenerja');
        renderTermCheckboxesForTrainer(elTrainerSelect?.value || '');
    }

    function updateSwimmerSelects() {
        refreshSwimmerAssignSelect();
        const modalSwimmerSelect = document.getElementById('modalSwimmerSelect');
        if (modalSwimmerSelect) {
            const sortedSwimmers = swimmers
                .filter(s => !s.is_deleted)
                .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'sl'));
            fillSearchableSelect(modalSwimmerSelect, sortedSwimmers, 'Izberi plavalca');
        }
    }

    function updateTermSelects() {
        renderTermCheckboxesForSwimmer(elSwimmerSelect?.value || '');
    }

    function renderTermCheckboxesForSwimmer(swimmerId) {
        const box = document.getElementById('termAssignCheckboxes');
        if (!box) return;

        if (!getSwimmersSeasonFilterId()) {
            box.innerHTML = '<p class="muted" style="margin:0">Ni izbrane sezone.</p>';
            return;
        }

        if (!swimmerId) {
            box.innerHTML = '<p class="muted" style="margin:0">Najprej izberite plavalca.</p>';
            return;
        }

        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            box.innerHTML = '<p class="muted" style="margin:0">Plavalec ni najden.</p>';
            return;
        }

        const available = getTermsForSwimmersSeason({ excludeTermIds: swimmer.terms || [] });
        if (available.length === 0) {
            box.innerHTML = '<p class="muted" style="margin:0">V tej sezoni ni razpoložljivih terminov (ali jih plavalec že ima vse).</p>';
            return;
        }

        const seasonName = getSeasonNameById(getSwimmersSeasonFilterId());
        box.innerHTML = `<div style="font-size:12px;font-weight:600;color:#4338ca;margin-bottom:8px">${escapeHtml(seasonName)} — izberite termine:</div>` +
            available.map(t => `
                <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:14px;padding:2px 4px">
                    <input type="checkbox" class="term-assign-cb" value="${t.id}">
                    ${escapeHtml(formatTermTimeLabel(t))}
                </label>
            `).join('');
    }

    // Funkcija za posodabljanje select elementa za termine pri dodeljevanju plavalcem
    function updateTermSelectForSwimmer(swimmerId) {
        renderTermCheckboxesForSwimmer(swimmerId);
    }

    function getUnassignedTermsForTrainers() {
        const assignedTermIds = new Set();
        trainers.forEach(trainer => {
            if (trainer.terms && trainer.terms.length > 0) {
                trainer.terms.forEach(termId => assignedTermIds.add(termId));
            }
        });
        return getTermsForAdminSeason().filter(term => !assignedTermIds.has(term.id));
    }

    function renderTermCheckboxesForTrainer(trainerId) {
        const box = document.getElementById('termTrainerAssignCheckboxes');
        if (!box) return;

        if (!getAdminSeasonFilterId()) {
            box.innerHTML = '<p class="muted" style="margin:0">Ni izbrane sezone.</p>';
            return;
        }

        if (!trainerId) {
            box.innerHTML = '<p class="muted" style="margin:0">Najprej izberite trenerja.</p>';
            return;
        }

        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) {
            box.innerHTML = '<p class="muted" style="margin:0">Trener ni najden.</p>';
            return;
        }

        const available = getUnassignedTermsForTrainers();
        if (available.length === 0) {
            box.innerHTML = '<p class="muted" style="margin:0">V tej sezoni ni nedodeljenih terminov (vsi so že dodeljeni trenerjem).</p>';
            return;
        }

        const seasonName = getSeasonNameById(getAdminSeasonFilterId());
        box.innerHTML = `<div style="font-size:12px;font-weight:600;color:#4338ca;margin-bottom:8px">${escapeHtml(seasonName)} — izberite termine:</div>` +
            available.map(t => `
                <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:14px;padding:2px 4px">
                    <input type="checkbox" class="term-trainer-assign-cb" value="${t.id}">
                    ${escapeHtml(formatTermTimeLabel(t))}
                </label>
            `).join('');
    }

    function updateTrainerSelects() {
        refreshTrainerAssignSelect();
    }

    function updateTermSelectForTrainer(trainerId) {
        renderTermCheckboxesForTrainer(trainerId);
    }

    function populateUnassignedTerms() {
        renderTermCheckboxesForTrainer(elTrainerSelect?.value || '');
    }

    function getSeasonNameById(seasonId) {
        if (!seasonId) return '';
        return seasons.find(se => se.id === seasonId)?.name || '';
    }

    function formatTermTimeLabel(term) {
        return `${DAY_SHORT_NAME[term.day]} ${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}`;
    }

    function formatTermSelectLabel(term) {
        const season = getSeasonNameById(term.season_id);
        const time = formatTermTimeLabel(term);
        return season ? `${season} · ${time}` : time;
    }

    function formatTermLabelById(termId) {
        const term = TERMS.find(t => t.id === termId);
        return term ? formatTermSelectLabel(term) : termId;
    }

    function getTrainerTermsActiveInMonth(trainer, month, year, seasonId) {
        const lastDay = new Date(year, month, 0).getDate();
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return (trainer.terms || [])
            .map(tid => TERMS.find(t => t.id === tid))
            .filter(term => {
                if (!term) return false;
                if (seasonId && term.season_id !== seasonId) return false;
                return term.date_from <= monthEnd && term.date_to >= monthStart;
            })
            .sort((a, b) => {
                if (a.day !== b.day) return a.day - b.day;
                return a.start_time.localeCompare(b.start_time);
            });
    }
    function groupSwimmerTermsBySeason(termIds, seasonFilterId) {
        const grouped = new Map();
        (termIds || []).forEach(termId => {
            const term = TERMS.find(t => t.id === termId);
            if (seasonFilterId && (!term || term.season_id !== seasonFilterId)) return;
            const key = term?.season_id || '__none__';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push({ termId, term });
        });
        const seasonSortKey = key => {
            if (key === '__none__') return '0000-01-01';
            return seasons.find(se => se.id === key)?.date_from || '0000-01-01';
        };
        return [...grouped.keys()]
            .sort((a, b) => seasonSortKey(b).localeCompare(seasonSortKey(a)))
            .map(key => ({
                seasonName: key === '__none__' ? 'Brez sezone' : (getSeasonNameById(key) || 'Neznana sezona'),
                entries: grouped.get(key).sort((a, b) => {
                    if (!a.term || !b.term) return 0;
                    if (a.term.day !== b.term.day) return a.term.day - b.term.day;
                    return a.term.start_time.localeCompare(b.term.start_time);
                })
            }));
    }

    function formatSwimmerTermsSummary(swimmer, seasonFilterId) {
        const filterId = seasonFilterId !== undefined ? seasonFilterId : getSwimmersSeasonFilterId();
        const groups = groupSwimmerTermsBySeason(swimmer?.terms, filterId || null);
        if (groups.length === 0) return '<span class="muted">—</span>';
        if (filterId && groups.length === 1) {
            const labels = groups[0].entries
                .map(({ term, termId }) => term ? formatTermTimeLabel(term) : termId)
                .join(', ');
            return labels ? escapeHtml(labels) : '<span class="muted">—</span>';
        }
        return groups.map(({ seasonName, entries }) => {
            const labels = entries
                .map(({ term, termId }) => term ? formatTermTimeLabel(term) : termId)
                .join(', ');
            return `<div style="font-size:12px;margin-bottom:3px"><span style="font-weight:600;color:#4338ca">${escapeHtml(seasonName)}:</span> ${escapeHtml(labels)}</div>`;
        }).join('');
    }

    function buildAssignedTermsHtml(entity, seasonFilterId, removeHandler) {
        const removeFn = removeHandler || 'removeTermFromSwimmer';
        const filterId = seasonFilterId !== undefined ? seasonFilterId : getAdminSeasonFilterId();
        const groups = groupSwimmerTermsBySeason(entity.terms, filterId || null);
        if (groups.length === 0) return '<span class="muted">Brez terminov v tej sezoni</span>';

        const renderChips = entries => entries.map(({ termId, term }) => {
            const label = term ? formatTermTimeLabel(term) : termId;
            if (entity.is_deleted) {
                return `<span class="chip">${escapeHtml(label)}</span>`;
            }
            return `<span class="chip" data-term-id="${termId}">
                ${escapeHtml(label)}
                <button class="remove-term-btn" onclick="${removeFn}('${entity.id}', '${termId}')" title="Odstrani termin">✖</button>
            </span>`;
        }).join(' ');

        if (filterId && groups.length === 1) {
            return `<div>${renderChips(groups[0].entries)}</div>`;
        }

        return groups.map(({ seasonName, entries }) => `
            <div class="swimmer-season-terms" style="margin-bottom:8px">
                <div style="font-size:11px;font-weight:600;color:#4338ca;margin-bottom:3px">${escapeHtml(seasonName)}</div>
                <div>${renderChips(entries)}</div>
            </div>
        `).join('');
    }

    function buildSwimmerTermsHtml(swimmer, seasonFilterId) {
        return buildAssignedTermsHtml(swimmer, seasonFilterId, 'removeTermFromSwimmer');
    }

    function getSwimmerTermIdsInSeason(swimmer, seasonId) {
        if (!swimmer?.terms?.length) return [];
        return swimmer.terms.filter(tid => {
            const term = TERMS.find(t => t.id === tid);
            return term && term.season_id === seasonId;
        });
    }

    function getTrainerTermIdsInSeason(trainer, seasonId) {
        if (!trainer?.terms?.length) return [];
        return trainer.terms.filter(tid => {
            const term = TERMS.find(t => t.id === tid);
            return term && term.season_id === seasonId;
        });
    }

    function getTrainerIdForTerm(termId, excludeTrainerId = null) {
        for (const t of trainers) {
            if (t.is_deleted || t.id === excludeTrainerId) continue;
            if (t.terms?.includes(termId)) return t.id;
        }
        return null;
    }

    function getTrainerSeasonHistory(trainer) {
        return getSwimmerSeasonHistory(trainer);
    }

    function getSwimmerSeasonHistory(swimmer) {
        const bySeason = new Map();
        (swimmer?.terms || []).forEach(termId => {
            const term = TERMS.find(t => t.id === termId);
            const key = term?.season_id || '__none__';
            if (!bySeason.has(key)) bySeason.set(key, []);
            bySeason.get(key).push(term || { id: termId });
        });
        const seasonSortKey = key => {
            if (key === '__none__') return '0000-01-01';
            return seasons.find(se => se.id === key)?.date_from || '0000-01-01';
        };
        return [...bySeason.keys()]
            .sort((a, b) => seasonSortKey(b).localeCompare(seasonSortKey(a)))
            .map(key => ({
                seasonId: key,
                seasonName: key === '__none__' ? 'Brez sezone' : (getSeasonNameById(key) || 'Neznana sezona'),
                dateFrom: key === '__none__' ? null : seasons.find(s => s.id === key)?.date_from,
                terms: bySeason.get(key).sort((a, b) => {
                    if (!a.day || !b.day) return 0;
                    if (a.day !== b.day) return a.day - b.day;
                    return (a.start_time || '').localeCompare(b.start_time || '');
                })
            }));
    }

    function renderEditSwimmerPastSeasons(swimmer, currentSeasonId) {
        if (!elEditSwimmerPastSeasons) return;
        const history = getSwimmerSeasonHistory(swimmer).filter(h =>
            h.seasonId !== currentSeasonId && h.seasonId !== '__none__'
        );
        if (history.length === 0) {
            elEditSwimmerPastSeasons.innerHTML = '<span class="muted">Ni zgodovine dodeljenih terminov v prejšnjih sezonah.</span>';
            return;
        }
        elEditSwimmerPastSeasons.innerHTML = history.map(h => {
            const labels = h.terms.map(t => formatTermTimeLabel(t)).join(', ');
            const dates = h.dateFrom ? ` <span style="color:#64748b">(${escapeHtml(h.dateFrom.slice(0, 4))})</span>` : '';
            return `<div style="margin-bottom:8px"><strong>${escapeHtml(h.seasonName)}</strong>${dates}: ${escapeHtml(labels)}</div>`;
        }).join('');
    }

    function renderEditSwimmerTermsCheckboxes(swimmer, seasonId) {
        if (!elEditSwimmerTermsBox) return;
        if (!seasonId) {
            elEditSwimmerTermsBox.innerHTML = '<p class="muted" style="margin:0">Izberite sezono v pasu zgoraj.</p>';
            return;
        }
        const seasonTerms = TERMS.filter(t => t.season_id === seasonId).sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.start_time.localeCompare(b.start_time);
        });
        if (seasonTerms.length === 0) {
            elEditSwimmerTermsBox.innerHTML = '<p class="muted" style="margin:0">V tej sezoni ni terminov.</p>';
            return;
        }
        const assigned = new Set(getSwimmerTermIdsInSeason(swimmer, seasonId));
        elEditSwimmerTermsBox.innerHTML = seasonTerms.map(t => `
            <label>
                <input type="checkbox" class="edit-swimmer-term-cb" value="${t.id}" ${assigned.has(t.id) ? 'checked' : ''}>
                ${escapeHtml(formatTermTimeLabel(t))}
            </label>
        `).join('');
    }

    function populateEditSwimmerPaymentPlanSelect(swimmerId, seasonId) {
        if (!elEditSwimmerPaymentPlan) return;
        const season = seasons.find(s => s.id === seasonId);
        const plan = getSwimmerPaymentPlan(swimmerId, seasonId);
        const allowed = getAllowedPaymentPlansForSeason(season);
        const effectivePlan = allowed.includes(plan) ? plan : 'monthly';
        elEditSwimmerPaymentPlan.innerHTML = Object.entries(PAYMENT_PLAN_LABELS)
            .filter(([value]) => allowed.includes(value))
            .map(([value, label]) =>
                `<option value="${value}"${value === effectivePlan ? ' selected' : ''}>${label}</option>`
            ).join('');
        const hint = getPaymentPlanBillingHint(effectivePlan, season);
        if (elEditSwimmerSeasonLabel && season) {
            elEditSwimmerSeasonLabel.textContent = `Sezona: ${season.name}${hint ? ' · ' + hint : ''}`;
        }
    }

    async function populateEditSwimmerModal(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) return;

        const seasonId = getAdminSeasonFilterId();
        elEditSwimmerModalTitle.textContent = `Uredi plavalca — ${swimmer.first_name} ${swimmer.last_name}`;

        elEditSwimmerFirst.value = swimmer.first_name || '';
        elEditSwimmerLast.value = swimmer.last_name || '';
        elEditSwimmerEmail.value = swimmer.email || '';
        elEditSwimmerPhone.value = swimmer.phone || '';
        elEditSwimmerAddress.value = swimmer.address || '';
        elEditSwimmerPostalCode.value = swimmer.postal_code || '';
        if (elEditSwimmerNotes) elEditSwimmerNotes.value = swimmer.notes || '';

        renderEditSwimmerTermsCheckboxes(swimmer, seasonId);
        populateEditSwimmerPaymentPlanSelect(swimmerId, seasonId);
        renderEditSwimmerPastSeasons(swimmer, seasonId);

        const month = currentFinanceMonth;
        const year = currentFinanceYear;
        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        let isOly = false;
        let olyCount = 0;
        try {
            const fees = await getSwimmerFeesFromDB(month, year);
            isOly = fees[swimmerId]?.is_oly === true;
            olyCount = Object.values(fees).filter(f => f?.is_oly === true).length;
        } catch (e) {
            console.warn('OLY status ni naložen:', e);
        }
        if (elEditSwimmerOly) {
            elEditSwimmerOly.checked = isOly;
            const canOly = olyCount < 15 || isOly;
            elEditSwimmerOly.disabled = !canOly;
        }
        if (elEditSwimmerOlyHint) {
            elEditSwimmerOlyHint.textContent = `Velja za ${monthLabel} · trenutno ${olyCount}/15 OLY · vadnina 0 € + 40 € prispevek`;
        }

        elEditSwimmerInfo.textContent = '';
    }

    async function removeTermFromSwimmerQuiet(swimmerId, termId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) return false;
        const updatedTerms = swimmer.terms.filter(t => t !== termId);
        const { error } = await supabase
            .from('swimmers')
            .update({ terms: updatedTerms })
            .eq('id', swimmerId);
        if (error) throw error;

        const today = new Date().toISOString().split('T')[0];
        await supabase
            .from('swimmer_term_assignments')
            .update({ assigned_to_date: today })
            .eq('swimmer_id', swimmerId)
            .eq('term_id', termId)
            .is('assigned_to_date', null);

        swimmer.terms = updatedTerms;
        return true;
    }

    async function syncSwimmerTermsForSeason(swimmerId, seasonId, desiredTermIds) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer || !seasonId) return;

        const current = getSwimmerTermIdsInSeason(swimmer, seasonId);
        const toAdd = desiredTermIds.filter(id => !current.includes(id));
        const toRemove = current.filter(id => !desiredTermIds.includes(id));

        for (const termId of toRemove) {
            await removeTermFromSwimmerQuiet(swimmerId, termId);
        }
        for (const termId of toAdd) {
            await assignTermToSwimmer(swimmerId, termId);
        }
    }

    async function saveTrainerProfileToDb(trainerId, data, { isInsert = false } = {}) {
        const payload = { ...data };
        const phone = payload.phone;
        const table = supabase.from('trainers');
        let result = isInsert
            ? await table.insert([payload]).select()
            : await table.update(payload).eq('id', trainerId);

        if (result.error && phone != null && (result.error.message?.includes('phone') || result.error.code === '42703')) {
            const fallback = { ...payload };
            delete fallback.phone;
            result = isInsert
                ? await table.insert([fallback]).select()
                : await table.update(fallback).eq('id', trainerId);
            if (!result.error) {
                showMessage('Telefon ni shranjen — poženite SQL/add_trainer_phone.sql v Supabase.', 'warning');
            }
        }
        return result;
    }

    function buildTrainerTermsHtml(trainer, seasonFilterId) {
        return buildAssignedTermsHtml(trainer, seasonFilterId, 'removeTermFromTrainer');
    }

    function renderEditTrainerPastSeasons(trainer, currentSeasonId) {
        if (!elEditTrainerPastSeasons) return;
        const history = getTrainerSeasonHistory(trainer).filter(h =>
            h.seasonId !== currentSeasonId && h.seasonId !== '__none__'
        );
        if (history.length === 0) {
            elEditTrainerPastSeasons.innerHTML = '<span class="muted">Ni zgodovine dodeljenih terminov v prejšnjih sezonah.</span>';
            return;
        }
        elEditTrainerPastSeasons.innerHTML = history.map(h => {
            const labels = h.terms.map(t => formatTermTimeLabel(t)).join(', ');
            const dates = h.dateFrom ? ` <span style="color:#64748b">(${escapeHtml(h.dateFrom.slice(0, 4))})</span>` : '';
            return `<div style="margin-bottom:8px"><strong>${escapeHtml(h.seasonName)}</strong>${dates}: ${escapeHtml(labels)}</div>`;
        }).join('');
    }

    function renderEditTrainerTermsCheckboxes(trainer, seasonId) {
        if (!elEditTrainerTermsBox) return;
        if (!seasonId) {
            elEditTrainerTermsBox.innerHTML = '<p class="muted" style="margin:0">Izberite sezono v pasu zgoraj.</p>';
            return;
        }
        const seasonTerms = TERMS.filter(t => t.season_id === seasonId).sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.start_time.localeCompare(b.start_time);
        });
        if (seasonTerms.length === 0) {
            elEditTrainerTermsBox.innerHTML = '<p class="muted" style="margin:0">V tej sezoni ni terminov.</p>';
            return;
        }
        const assigned = new Set(getTrainerTermIdsInSeason(trainer, seasonId));
        elEditTrainerTermsBox.innerHTML = seasonTerms.map(t => {
            const isMine = assigned.has(t.id);
            const otherTrainerId = getTrainerIdForTerm(t.id, trainer.id);
            const otherTrainer = otherTrainerId ? trainers.find(tr => tr.id === otherTrainerId) : null;
            const disabled = !isMine && !!otherTrainerId;
            const otherLabel = otherTrainer
                ? ` <span class="muted" style="font-size:12px">(${escapeHtml(otherTrainer.first_name + ' ' + otherTrainer.last_name)})</span>`
                : '';
            return `
                <label class="${disabled ? 'disabled' : ''}">
                    <input type="checkbox" class="edit-trainer-term-cb" value="${t.id}"
                        ${isMine ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                    ${escapeHtml(formatTermTimeLabel(t))}${otherLabel}
                </label>
            `;
        }).join('');
    }

    async function populateEditTrainerModal(trainerId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) return;

        const seasonId = getAdminSeasonFilterId();
        elEditTrainerModalTitle.textContent = `Uredi trenerja — ${trainer.first_name} ${trainer.last_name}`;

        elEditTrainerFirst.value = trainer.first_name || '';
        elEditTrainerLast.value = trainer.last_name || '';
        elEditTrainerEmail.value = trainer.email || '';
        elEditTrainerPhone.value = trainer.phone || '';
        if (elEditTrainerRole) {
            elEditTrainerRole.value = trainer.role === 'super_admin' ? 'super_admin' : 'trainer';
        }
        if (elEditTrainerAuthHint) {
            elEditTrainerAuthHint.textContent = trainer.user_id
                ? '✓ Povezan z računom za prijavo. Če je pozabil geslo, kliknite »Ponastavi geslo«.'
                : '⚠ Še nima računa. Kliknite »Pošlji prijavo na e-pošto« — Dashboard in SQL nista potrebna.';
            elEditTrainerAuthHint.style.color = trainer.user_id ? '#059669' : '#b45309';
        }
        if (elInviteTrainerFromModalBtn) {
            elInviteTrainerFromModalBtn.textContent = trainer.user_id
                ? 'Ponastavi geslo'
                : 'Pošlji prijavo na e-pošto';
        }

        const seasonName = getSeasonNameById(seasonId);
        if (elEditTrainerSeasonLabel) {
            elEditTrainerSeasonLabel.textContent = seasonId
                ? `Sezona: ${seasonName || '—'} · obkljukajte termine, ki jih vodi ta trener`
                : 'Izberite sezono v pasu zgoraj.';
        }

        renderEditTrainerTermsCheckboxes(trainer, seasonId);
        renderEditTrainerPastSeasons(trainer, seasonId);

        const month = currentFinanceMonth;
        const year = currentFinanceYear;
        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        if (elEditTrainerRateMonthLabel) {
            elEditTrainerRateMonthLabel.textContent = `Postavka velja za ${monthLabel} (isti mesec kot Finance).`;
        }
        try {
            const rate = await getTrainerRate(trainerId, month, year);
            if (elEditTrainerRate) elEditTrainerRate.value = rate;
        } catch (e) {
            console.warn('Postavka trenerja ni naložena:', e);
            if (elEditTrainerRate) elEditTrainerRate.value = 25;
        }

        if (elEditTrainerInfo) elEditTrainerInfo.textContent = '';
    }

    async function removeTermFromTrainerQuiet(trainerId, termId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) return false;
        const updatedTerms = trainer.terms.filter(t => t !== termId);
        const { error } = await supabase
            .from('trainer_terms')
            .delete()
            .eq('trainer_id', trainerId)
            .eq('term_id', termId);
        if (error) throw error;
        trainer.terms = updatedTerms;
        return true;
    }

    async function syncTrainerTermsForSeason(trainerId, seasonId, desiredTermIds) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer || !seasonId) return;

        const current = getTrainerTermIdsInSeason(trainer, seasonId);
        const toAdd = desiredTermIds.filter(id => !current.includes(id));
        const toRemove = current.filter(id => !desiredTermIds.includes(id));

        for (const termId of toRemove) {
            await removeTermFromTrainerQuiet(trainerId, termId);
        }
        for (const termId of toAdd) {
            const owner = getTrainerIdForTerm(termId, trainerId);
            if (owner) {
                throw new Error(`Termin ${formatTermLabelById(termId)} je že dodeljen drugemu trenerju.`);
            }
            await assignTermToTrainer(trainerId, termId);
        }
    }

    function updateSwimmersList() {
// console.log('🔄 Posodabljam seznam plavalcev...', swimmers.length, 'plavalcev');
        elSwimmersList.innerHTML = '';
        
        if (swimmers.length === 0) {
// console.log('⚠️ Ni plavalcev za prikaz');
            elSwimmersList.innerHTML = '<p class="muted">Ni plavalcev</p>';
            return;
        }

        const table = document.createElement('table');
        const seasonFilterId = getSwimmersSeasonFilterId();
        const seasonName = getSeasonNameById(seasonFilterId);
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Ime</th>
                    <th>Priimek</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Sezone / Termini</th>
                    <th>Način plačila${seasonName ? ` (${escapeHtml(seasonName)})` : ''}</th>
                    <th>Članarina (30 €)</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        const showSwimmersWithoutTerms = document.getElementById('showSwimmersWithoutTerms')?.checked === true;
        const searchQ = (document.getElementById('swimmersTableSearchInput')?.value || '').trim().toLowerCase();

        // Sortiraj plavalce po abecedi po priimku, nato po imenu
        const activeSwimmers = swimmers
            .filter(swimmer => {
                if (swimmer.is_deleted) return false;
                const hasTermsInSeason = (swimmer.terms || []).some(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    return term && term.season_id === seasonFilterId;
                });
                if (!showSwimmersWithoutTerms && !hasTermsInSeason) return false;
                if (searchQ) {
                    const hay = `${swimmer.first_name} ${swimmer.last_name} ${swimmer.email || ''} ${swimmer.phone || ''}`.toLowerCase();
                    if (!hay.includes(searchQ)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });
        
        const deletedSwimmers = swimmers
            .filter(swimmer => swimmer.is_deleted)
            .sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });
        
        const sortedSwimmers = [...activeSwimmers, ...deletedSwimmers];

        if (sortedSwimmers.length === 0) {
            elSwimmersList.innerHTML = '<p class="muted">Ni plavalcev za prikaz. Obkljukajte »Prikaži tudi plavalce brez dodeljenega termina«, če jih iščete.</p>';
            return;
        }

        sortedSwimmers.forEach(swimmer => {
            const row = document.createElement('tr');
            const termsHtml = buildSwimmerTermsHtml(swimmer);
            const hasTermsInSeason = (swimmer.terms || []).some(termId => {
                const term = TERMS.find(t => t.id === termId);
                return term && term.season_id === seasonFilterId;
            });
            const paymentPlan = getSwimmerPaymentPlan(swimmer.id, seasonFilterId);
            let paymentPlanCell = '<span class="muted">—</span>';
            let membershipCell = '<span class="muted">—</span>';
            if (!swimmer.is_deleted && hasTermsInSeason && seasonFilterId) {
                const seasonObj = seasons.find(s => s.id === seasonFilterId);
                paymentPlanCell = buildPaymentPlanSelectHtml(swimmer.id, paymentPlan, false, seasonObj);
                const period = getMembershipChargedPeriod(swimmer.id, seasonFilterId);
                membershipCell = period
                    ? `<span class="badge ok" style="font-size:11px">${escapeHtml(formatMembershipPeriod(period))}</span>
                       <button type="button" class="btn" style="padding:1px 6px;font-size:11px;margin-left:4px" onclick="clearSwimmerMembershipFee('${swimmer.id}')" title="Prekliči obračun članarine">×</button>`
                    : '<span class="muted" style="font-size:11px" title="Članarino obračunate v Finance → Poročilo za računovodstvo">Ne plača</span>';
            }

            // Določi stil vrstice glede na status
            if (swimmer.is_deleted) {
                row.style.opacity = '0.6';
                row.style.backgroundColor = '#f8f9fa';
            }
            
            row.innerHTML = `
                <td>${swimmer.first_name} ${swimmer.is_deleted ? '<span class="badge warn">Izbrisan</span>' : ''}</td>
                <td>${swimmer.last_name}</td>
                <td>${swimmer.email || '<span class="muted" title="Manjka email">⚠ brez email</span>'}</td>
                <td>${swimmer.phone || '<span class="muted">Brez telefona</span>'}</td>
                <td class="terms-cell">${swimmer.is_deleted ? '<span class="muted">Izbrisan</span>' : termsHtml}</td>
                <td>${paymentPlanCell}</td>
                <td style="text-align:center">${membershipCell}</td>
                <td>
                    ${swimmer.is_deleted ? 
                        `<button class="btn success" onclick="restoreSwimmer('${swimmer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Obnovi plavalca
                        </button>` :
                        `<button class="btn pri" onclick="editSwimmer('${swimmer.id}')" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">
                            Uredi
                        </button>
                        <button class="btn warn" onclick="deleteSwimmer('${swimmer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši plavalca
                        </button>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });

        elSwimmersList.appendChild(table);
        elSwimmersList.classList.add('admin-table-scroll');
// console.log('✅ Seznam plavalcev uspešno posodobljen');
    }

    function updateTrainersList() {
        elTrainersList.innerHTML = '';
        
        if (trainers.length === 0) {
            elTrainersList.innerHTML = '<p class="muted">Ni trenerjev</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Ime</th>
                    <th>Priimek</th>
                    <th>Email</th>
                    <th>Prijava</th>
                    <th>Termini</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainers = [...trainers]
            .filter(trainer => !trainer.is_deleted)
            .sort((a, b) => {
            // Najprej sortiraj po priimku
            const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '', 'sl');
            if (lastNameCompare !== 0) {
                return lastNameCompare;
            }
            // Če so priimki enaki, sortiraj po imenu
            return (a.first_name || '').localeCompare(b.first_name || '', 'sl');
        });

        sortedTrainers.forEach(trainer => {
                const row = document.createElement('tr');
                const termsHtml = buildTrainerTermsHtml(trainer);

                const loginBadge = trainer.user_id
                    ? '<span class="badge ok" style="font-size:11px">Račun OK</span>'
                    : '<span class="badge warn" style="font-size:11px">Brez računa</span>';
                const inviteLabel = trainer.user_id ? 'Ponastavi geslo' : 'Pošlji prijavo';

                row.innerHTML = `
                    <td>${trainer.first_name}</td>
                    <td>${trainer.last_name}</td>
                    <td>${trainer.email || '<span class="muted">Brez email</span>'}</td>
                    <td>${loginBadge}</td>
                    <td class="terms-cell">${termsHtml}</td>
                    <td style="white-space:nowrap">
                        <button class="btn pri" onclick="editTrainer('${trainer.id}')" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">
                            Uredi
                        </button>
                        <button class="btn" onclick="inviteTrainer('${trainer.id}')" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">
                            ${inviteLabel}
                        </button>
                        <button class="btn warn" onclick="deleteTrainer('${trainer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
        });

        elTrainersList.appendChild(table);
    }

    // ===== Dodajanje plavalcev =====
    elAddSwimmerBtn.addEventListener('click', async () => {
        const first = elNewFirst.value.trim();
        const last = elNewLast.value.trim();
        const email = elNewEmail.value.trim();
        const phone = elNewPhone.value.trim();
        const address = elNewAddress.value.trim();
        const postalCode = elNewPostalCode.value.trim();
        
        if (!first || !last) {
            alert('Prosim vnesite ime in priimek');
            return;
        }

        // Validacija email naslova (če je vnesen)
        if (email && !isValidEmail(email)) {
            alert('Prosim vnesite veljaven email naslov');
            return;
        }

        // Validacija telefonske številke (če je vnesena)
        if (phone && !isValidPhone(phone)) {
            alert('Prosim vnesite veljavno telefonsko številko');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('swimmers')
                .insert([{
                    first_name: first,
                    last_name: last,
                    email: email || null,
                    phone: phone || null,
                    address: address || null,
                    postal_code: postalCode || null,
                    terms: [],
                    is_deleted: false
                }])
                .select();

            if (error) {
                console.error('Napaka pri dodajanju plavalca:', error);
                alert('Napaka pri dodajanju plavalca. Preverite konzolo.');
                return;
            }

            // Dodaj v lokalno stanje
            if (data && data.length > 0) {
                swimmers.push(data[0]);
            }
            
            elNewFirst.value = '';
            elNewLast.value = '';
            elNewEmail.value = '';
            elNewPhone.value = '';
            elNewAddress.value = '';
            elNewPostalCode.value = '';
            
            updateSwimmerSelects();
            updateSwimmersList();
            elSwimmerInfo.textContent = `Dodan plavalec: ${first} ${last}${email ? ` (${email})` : ''}${phone ? ` (${phone})` : ''}${address ? ` (${address})` : ''}${postalCode ? ` (${postalCode})` : ''}`;
            
            setTimeout(() => {
                elSwimmerInfo.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Napaka pri dodajanju plavalca:', error);
            alert('Napaka pri dodajanju plavalca.');
        }
    });

    // ===== Dodajanje trenerjev =====
    elAddTrainerBtn.addEventListener('click', async () => {
        const first = elNewTrainerFirst.value.trim();
        const last = elNewTrainerLast.value.trim();
        const email = elNewTrainerEmail.value.trim();
        const phone = elNewTrainerPhone.value.trim();
        
        if (!first || !last) {
            alert('Prosim vnesite ime in priimek');
            return;
        }

        // Validacija telefonske številke (če je vnesena)
        if (phone && !isValidPhone(phone)) {
            alert('Prosim vnesite veljavno telefonsko številko');
            return;
        }

        try {
            const insertData = {
                first_name: first,
                last_name: last,
                email: email,
                phone: phone || null
            };
            const { data, error } = await saveTrainerProfileToDb(null, insertData, { isInsert: true });

            if (error) {
                console.error('Napaka pri dodajanju trenerja:', error);
                alert('Napaka pri dodajanju trenerja. Preverite konzolo.');
                return;
            }

            // Dodaj v lokalno stanje
            if (data && data.length > 0) {
                // Dodaj manjkajoče lastnosti za lokalno stanje
                const newTrainer = { ...data[0], terms: [], is_deleted: false };
                trainers.push(newTrainer);
            }
            
            elNewTrainerFirst.value = '';
            elNewTrainerLast.value = '';
            elNewTrainerEmail.value = '';
            elNewTrainerPhone.value = '';
            
            updateTrainerSelects();
            updateTrainersList();
            elTrainerInfo.textContent = `Dodan trener: ${first} ${last}`;
            
            setTimeout(() => {
                elTrainerInfo.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Napaka pri dodajanju trenerja:', error);
            alert('Napaka pri dodajanju trenerja.');
        }
    });

    // ===== Dodeljevanje terminov =====
    async function assignTermToSwimmer(swimmerId, termId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer || swimmer.terms.includes(termId)) return false;

        const { error: swimmerError } = await supabase
            .from('swimmers')
            .update({ terms: [...swimmer.terms, termId] })
            .eq('id', swimmerId);

        if (swimmerError) {
            console.error('Napaka pri dodeljevanju termina:', swimmerError);
            throw swimmerError;
        }

        const today = new Date().toISOString().split('T')[0];
        const { error: assignmentError } = await supabase
            .from('swimmer_term_assignments')
            .upsert({
                swimmer_id: swimmerId,
                term_id: termId,
                assigned_from_date: today,
                assigned_to_date: null
            }, {
                onConflict: 'swimmer_id,term_id,assigned_from_date',
                ignoreDuplicates: false
            });

        if (assignmentError) {
            console.error('Napaka pri shranjevanju datuma dodelitve:', assignmentError);
        }

        swimmer.terms.push(termId);

        const eventData = { swimmerId, termId, timestamp: Date.now() };
        localStorage.setItem('swimmerTermAssigned', JSON.stringify(eventData));
        setTimeout(() => localStorage.removeItem('swimmerTermAssigned'), 100);
        window.postMessage({ type: 'swimmerTermAssigned', data: eventData }, '*');
        return true;
    }

    elAssignTermBtn.addEventListener('click', async () => {
        const swimmerId = elSwimmerSelect.value;
        const termIds = [...document.querySelectorAll('#termAssignCheckboxes .term-assign-cb:checked')]
            .map(cb => cb.value)
            .filter(Boolean);
        
        if (!swimmerId || termIds.length === 0) {
            alert('Prosim izberite plavalca in vsaj en termin');
            return;
        }

        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) return;

        const invalidTerms = termIds.filter(termId => !termMatchesSwimmersSeasonFilter(termId));
        if (invalidTerms.length > 0) {
            alert('Izbrani termini ne spadajo v trenutno sezono.');
            return;
        }

        try {
            let assigned = 0;
            for (const termId of termIds) {
                if (await assignTermToSwimmer(swimmerId, termId)) assigned++;
            }

            if (assigned === 0) {
                elSwimmerInfo.textContent = 'Plavalec že ima vse izbrane termine.';
            } else {
                updateSwimmersList();
                renderTermCheckboxesForSwimmer(swimmerId);
                updateTermList();
                elSwimmerInfo.textContent = `Dodeljenih ${assigned} terminov plavalcu ${swimmer.first_name} ${swimmer.last_name}`;
            }
            
            setTimeout(() => {
                elSwimmerInfo.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Napaka pri dodeljevanju terminov:', error);
            alert('Napaka pri dodeljevanju terminov. Preverite konzolo.');
        }
    });

    // ===== Odstranjevanje terminov iz plavalcev =====
    window.removeTermFromSwimmer = async function(swimmerId, termId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (swimmer) {
            try {
                // Odstrani termin iz plavalca
                const updatedTerms = swimmer.terms.filter(t => t !== termId);
                
                const { error } = await supabase
                    .from('swimmers')
                    .update({ terms: updatedTerms })
                    .eq('id', swimmerId);

                if (error) {
                    console.error('Napaka pri odstranjevanju termina:', error);
                    alert('Napaka pri odstranjevanju termina. Preverite konzolo.');
                    return;
                }

                // Posodobi datum dodelitve - nastavi assigned_to_date na danes
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                const { error: assignmentError } = await supabase
                    .from('swimmer_term_assignments')
                    .update({ assigned_to_date: today })
                    .eq('swimmer_id', swimmerId)
                    .eq('term_id', termId)
                    .is('assigned_to_date', null); // Posodobi samo aktivne dodelitve

                if (assignmentError) {
                    console.error('Napaka pri posodabljanju datuma odstranitve:', assignmentError);
                    // Ne prekini procesa, ker je termin že odstranjen
                }

                // Posodobi lokalno stanje
                swimmer.terms = updatedTerms;
                updateSwimmersList();
                renderTermCheckboxesForSwimmer(swimmerId);
                updateTermList();
                
                // Osveži prikaz koledarja - pošlji event preko localStorage (za druga okna)
                // in window.postMessage (za ista okna)
                const eventData = {
                    swimmerId: swimmerId,
                    termId: termId,
                    timestamp: Date.now(),
                    removed: true
                };
                
                // Za druga okna (localStorage event)
                localStorage.setItem('swimmerTermRemoved', JSON.stringify(eventData));
                setTimeout(() => localStorage.removeItem('swimmerTermRemoved'), 100);
                
                // Za ista okna (window.postMessage)
                window.postMessage({ type: 'swimmerTermRemoved', data: eventData }, '*');
                alert('Termin uspešno odstranjen iz plavalca.');
            } catch (error) {
                console.error('Napaka pri odstranjevanju termina:', error);
                alert('Napaka pri odstranjevanju termina.');
            }
        }
    };

    // ===== Dodeljevanje terminov trenerjem =====
    async function assignTermToTrainer(trainerId, termId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) return false;
        if (!trainer.terms) trainer.terms = [];
        if (trainer.terms.includes(termId)) return false;

        const { error } = await supabase
            .from('trainer_terms')
            .insert([{ trainer_id: trainerId, term_id: termId }]);

        if (error) {
            console.error('Napaka pri dodeljevanju termina trenerju:', error);
            throw error;
        }

        trainer.terms.push(termId);
        return true;
    }

    elAssignTrainerTermBtn.addEventListener('click', async () => {
        const trainerId = elTrainerSelect.value;
        const termIds = [...document.querySelectorAll('#termTrainerAssignCheckboxes .term-trainer-assign-cb:checked')]
            .map(cb => cb.value)
            .filter(Boolean);

        if (!trainerId || termIds.length === 0) {
            alert('Prosim izberite trenerja in vsaj en termin');
            return;
        }

        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) return;

        const invalidTerms = termIds.filter(termId => !termMatchesAdminSeasonFilter(termId));
        if (invalidTerms.length > 0) {
            alert('Izbrani termini ne spadajo v trenutno sezono.');
            return;
        }

        try {
            let assigned = 0;
            for (const termId of termIds) {
                if (await assignTermToTrainer(trainerId, termId)) assigned++;
            }

            if (assigned === 0) {
                elTrainerInfo.textContent = 'Trener že ima vse izbrane termine ali so termini zasedeni.';
            } else {
                updateTrainersList();
                renderTermCheckboxesForTrainer(trainerId);
                elTrainerInfo.textContent = `Dodeljenih ${assigned} terminov trenerju ${trainer.first_name} ${trainer.last_name}`;
            }

            setTimeout(() => {
                elTrainerInfo.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Napaka pri dodeljevanju terminov trenerju:', error);
            alert('Napaka pri dodeljevanju terminov trenerju. Preverite konzolo.');
        }
    });

    // Gumb za dodajanje termina iz sekcije Upravljanje terminov (odstranjen - forma je sedaj pod upravljanjem terminov)

    // ===== Brisanje plavalcev s kaskadnim brisanjem =====
    window.deleteSwimmer = async function(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            alert('Plavalec ne obstaja.');
            return;
        }

        // Preveri povezave pred brisanjem
        try {
            const { data: connections, error: checkError } = await supabase
                .rpc('check_swimmer_connections', { swimmer_uuid: swimmerId });

            if (checkError) {
                console.error('Napaka pri preverjanju povezav:', checkError);
                alert('Napaka pri preverjanju povezav plavalca.');
                return;
            }

            if (!connections.exists) {
                alert('Plavalec ne obstaja ali je že izbrisan.');
                return;
            }

            // Prikaži potrditev z informacijami o povezavah
            const totalConnections = connections.attendance_records + connections.fees_records;
            const confirmMessage = `Ali ste prepričani, da želite izbrisati plavalca "${connections.swimmer_name}"?\n\n` +
                `To bo izbrisalo:\n` +
                `• ${connections.attendance_records} zapisov prisotnosti\n` +
                `• ${connections.fees_records} zapisov mesečnih pristojbin\n` +
                `• Skupaj ${totalConnections} povezanih zapisov\n\n` +
                `To dejanje ni mogoče razveljaviti!`;

            if (!confirm(confirmMessage)) {
                return;
            }

            // Izvedi kaskadno brisanje
            const { data: result, error } = await supabase
                .rpc('delete_swimmer_cascade', { swimmer_uuid: swimmerId });

            if (error) {
                console.error('Napaka pri kaskadnem brisanju:', error);
                alert('Napaka pri brisanju plavalca. Preverite konzolo.');
                return;
            }

            if (!result.success) {
                alert('Napaka: ' + result.message);
                return;
            }

            // Posodobi lokalno stanje
            swimmer.is_deleted = true;
            updateSwimmerSelects();
            updateSwimmersList();

            // Prikaži rezultat
            alert(`Plavalec uspešno izbrisan!\n\n` +
                `Izbrisano:\n` +
                `• ${result.deleted_attendance} zapisov prisotnosti\n` +
                `• ${result.deleted_fees} zapisov mesečnih pristojbin\n` +
                `• Plavalec označen kot izbrisan`);

        } catch (error) {
            console.error('Napaka pri brisanju plavalca:', error);
            alert('Napaka pri brisanju plavalca: ' + error.message);
        }
    };

    // ===== Obnovitev plavalca =====
    window.restoreSwimmer = async function(swimmerId) {
        try {
            const { data: result, error } = await supabase
                .rpc('restore_swimmer', { swimmer_uuid: swimmerId });

            if (error) {
                console.error('Napaka pri obnavljanju plavalca:', error);
                alert('Napaka pri obnavljanju plavalca. Preverite konzolo.');
                return;
            }

            if (!result.success) {
                alert('Napaka: ' + result.message);
                return;
            }

            // Posodobi lokalno stanje
            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer) {
                swimmer.is_deleted = false;
            }
            updateSwimmerSelects();
            updateSwimmersList();

            alert(`Plavalec "${result.swimmer_name}" uspešno obnovljen!`);

        } catch (error) {
            console.error('Napaka pri obnavljanju plavalca:', error);
            alert('Napaka pri obnavljanju plavalca: ' + error.message);
        }
    };

    // ===== Odstranjevanje terminov iz trenerjev =====
    window.removeTermFromTrainer = async function(trainerId, termId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (trainer) {
            try {
                // Odstrani termin iz trenerja
                const updatedTerms = trainer.terms.filter(t => t !== termId);
                
                // Izbriši iz tabele trainer_terms
                const { error } = await supabase
                    .from('trainer_terms')
                    .delete()
                    .eq('trainer_id', trainerId)
                    .eq('term_id', termId);

                if (error) {
                    console.error('Napaka pri odstranjevanju termina:', error);
                    alert('Napaka pri odstranjevanju termina. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                trainer.terms = updatedTerms;
                updateTrainersList();
                updateTrainerSelects(); // Osveži dropdown z nedodeljenimi termini
                alert('Termin uspešno odstranjen iz trenerja.');
            } catch (error) {
                console.error('Napaka pri odstranjevanju termina:', error);
                alert('Napaka pri odstranjevanju termina.');
            }
        }
    };

    // ===== Brisanje trenerjev =====
    window.deleteTrainer = async function(trainerId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (trainer) {
            if (!confirm(`Ali ste prepričani, da želite izbrisati trenerja ${trainer.first_name} ${trainer.last_name}?`)) {
                return;
            }
            
            try {
                // Ker tabela trainers nima is_deleted stolpca, rešimo to drugače
                // Opcija 1: Fizično brisanje (če ni povezav)
                // Opcija 2: Skrivanje v lokalnem stanju
                
                // Preverimo, če ima trener dodeljene termine
                const hasTerms = trainer.terms && trainer.terms.length > 0;
                
                if (hasTerms) {
                    // Če ima termine, samo skrij lokalno (da se ohrani zgodovina)
                    trainer.is_deleted = true;
                    updateTrainerSelects();
                    updateTrainersList();
                    alert('Trener je skrit iz seznama (ohranjena zgodovina terminov).');
                } else {
                    // Če nima terminov, lahko fizično brišemo
                    const { error } = await supabase
                        .from('trainers')
                        .delete()
                        .eq('id', trainerId);

                    if (error) {
                        console.error('Napaka pri brisanju trenerja:', error);
                        alert('Napaka pri brisanju trenerja. Preverite konzolo.');
                        return;
                    }

                    // Odstrani iz lokalnega stanja
                    const index = trainers.findIndex(t => t.id === trainerId);
                    if (index > -1) {
                        trainers.splice(index, 1);
                    }
                    
                    updateTrainerSelects();
                    updateTrainersList();
                    alert('Trener uspešno izbrisan.');
                }
            } catch (error) {
                console.error('Napaka pri brisanju trenerja:', error);
                alert('Napaka pri brisanju trenerja.');
            }
        }
    };

    // ===== Upravljanje terminov =====
    function updateTermList() {
        elTermList.innerHTML = '';
        
        if (TERMS.length === 0) {
            elTermList.innerHTML = '<p class="muted">Ni terminov</p>';
            return;
        }

        const seasonFilt = document.getElementById('termListSeasonFilter')?.value || '';
        let activeTerms = getActiveTerms();
        if (seasonFilt) {
            activeTerms = activeTerms.filter(t => t.season_id === seasonFilt);
        }

        const todayISO = iso(new Date());
        let expiredCount = 0;
        if (seasonFilt) {
            expiredCount = TERMS.filter(t => t.season_id === seasonFilt && t.date_to < todayISO).length;
        } else {
            expiredCount = TERMS.length - getActiveTerms().length;
        }

        if (activeTerms.length === 0) {
            elTermList.innerHTML = seasonFilt
                ? '<p class="muted">Noben aktivni termin ni vezan na izbrano sezono (ali ta sezona nima terminov).</p>'
                : '<p class="muted">Ni aktivnih terminov</p>';
            return;
        }

        if (expiredCount > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'background: #fef3c7; border: 1px solid #fcd34d; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;';
            infoDiv.innerHTML = seasonFilt
                ? `<strong>ℹ️ Informacija:</strong> Za to sezono je še ${expiredCount} poteklih terminov (skritih). Prikazani so samo aktivni.`
                : `<strong>ℹ️ Informacija:</strong> Skritih je ${expiredCount} poteklih terminov. Prikazani so samo aktivni termini.`;
            elTermList.appendChild(infoDiv);
        }

        // Grupiraj aktivne termine po dnevih
        const termsByDay = {};
        activeTerms.forEach(term => {
            if (!termsByDay[term.day]) {
                termsByDay[term.day] = [];
            }
            termsByDay[term.day].push(term);
        });

        // Ustvari HTML za vsak dan
        Object.keys(termsByDay).sort().forEach(day => {
            const dayName = DAYNAME[parseInt(day)];
            const dayTerms = termsByDay[day];
            
            // Ustvari sekcijo za dan
            const daySection = document.createElement('div');
            daySection.className = 'day-section';
            daySection.innerHTML = `<h4>${dayName}</h4>`;
            
            // Sortiraj termine - jutranji (do 12:00) pred večernimi (od 12:00 naprej)
            const sortedDayTerms = dayTerms.sort((a, b) => {
                const aHour = parseInt(a.start_time.split(':')[0]);
                const bHour = parseInt(b.start_time.split(':')[0]);
                const aIsMorning = aHour < 12;
                const bIsMorning = bHour < 12;
                
                // Najprej sortiraj po jutro/večer
                if (aIsMorning !== bIsMorning) {
                    return aIsMorning ? -1 : 1; // Jutranji pred večernimi
                }
                
                // Če sta oba jutranji ali oba večerni, sortiraj po času
                return a.start_time.localeCompare(b.start_time);
            });
            
            sortedDayTerms.forEach(term => {
                const termCard = document.createElement('div');
                termCard.className = 'term-card';
                
                // Poišči plavalce za ta termin in jih sortiraj po priimku (abecedno)
                const assignedSwimmers = swimmers
                    .filter(s => s.terms && s.terms.includes(term.id) && !s.is_deleted)
                    .sort((a, b) => {
                        // Sortiraj najprej po priimku, nato po imenu
                        const lastNameCompare = a.last_name.localeCompare(b.last_name, 'sl');
                        if (lastNameCompare !== 0) {
                            return lastNameCompare;
                        }
                        return a.first_name.localeCompare(b.first_name, 'sl');
                    });
                
                let swimmersList = '';
                if (assignedSwimmers.length > 0) {
                    swimmersList = assignedSwimmers.map(s => `
                        <span class="chip" data-term-id="${term.id}" data-swimmer-id="${s.id}">
                            ${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}
                            <button class="remove-term-btn" onclick="removeTermFromSwimmer('${s.id}', '${term.id}')" title="Odstrani iz termina">✖</button>
                        </span>
                    `).join(' ');
                } else {
                    swimmersList = '<span class="muted">Brez dodeljenih plavalcev</span>';
                }
                
                const seasonLbl = term.season_id
                    ? (seasons.find(se => se.id === term.season_id)?.name || '')
                    : '';
                const seasonChip = seasonLbl
                    ? `<span class="chip" style="background:#e0e7ff;font-size:11px">${escapeHtml(seasonLbl)}</span>`
                    : '';
                // Format čas brez sekund
                termCard.innerHTML = `
                    <div class="term-header">
                        <span class="term-time">${formatTimeWithoutSeconds(term.start_time)} - ${formatTimeWithoutSeconds(term.end_time)}</span>
                        ${seasonChip}
                        <span class="term-period">${formatDate(term.date_from)} - ${formatDate(term.date_to)}</span>
                        <span class="term-swimmer-count" style="background: #2563eb; color: white; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; white-space: nowrap;">
                            ${assignedSwimmers.length} plaval${assignedSwimmers.length === 1 ? 'ec' : assignedSwimmers.length === 2 ? 'ca' : 'cev'}
                        </span>
                        <div class="term-actions">
                            <button class="btn small" onclick="editTerm('${term.id}')" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">
                                Uredi
                            </button>
                            <button class="btn small warn" onclick="deleteTerm('${term.id}')" style="font-size: 12px; padding: 4px 8px;">
                                Zbriši termin
                            </button>
                        </div>
                    </div>
                    <div class="term-swimmers">
                        <div class="term-swimmers-head">
                            <strong>Dodeljeni plavalci:</strong>
                            <div class="term-add-swimmer">
                                <input type="search" class="term-add-swimmer-input" data-term-id="${term.id}"
                                    placeholder="Dodaj plavalca (išči ime)…" autocomplete="off">
                                <div class="term-add-swimmer-results" hidden></div>
                            </div>
                        </div>
                        <div class="swimmers-chips">
                            ${swimmersList}
                        </div>
                    </div>
                `;
                
                daySection.appendChild(termCard);
            });
            
            elTermList.appendChild(daySection);
        });
    }

    function getSwimmersAvailableForTerm(termId, query) {
        const q = (query || '').trim().toLowerCase();
        return swimmers
            .filter(s => !s.is_deleted && !(s.terms || []).includes(termId))
            .filter(s => !q || personMatchesSearch(s, q))
            .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'sl'))
            .slice(0, 12);
    }

    function renderTermAddSwimmerResults(input) {
        const box = input?.closest('.term-add-swimmer')?.querySelector('.term-add-swimmer-results');
        const termId = input?.dataset.termId;
        if (!box || !termId) return;

        const matches = getSwimmersAvailableForTerm(termId, input.value);
        if (matches.length === 0) {
            box.hidden = false;
            box.innerHTML = `<div class="muted" style="padding:8px 12px;font-size:13px">${
                (input.value || '').trim() ? 'Ni zadetkov.' : 'Vsi plavalci so že na tem terminu.'
            }</div>`;
            return;
        }

        box.hidden = false;
        box.innerHTML = matches.map((s, i) => `
            <button type="button" class="term-add-swimmer-item${i === 0 ? ' active' : ''}"
                data-add-swimmer-to-term data-swimmer-id="${s.id}" data-term-id="${termId}">
                ${escapeHtml(s.last_name)} ${escapeHtml(s.first_name)}${s.email ? ` <span class="muted">(${escapeHtml(s.email)})</span>` : ''}
            </button>
        `).join('');
    }

    function closeTermAddSwimmerResults(exceptInput) {
        elTermList?.querySelectorAll('.term-add-swimmer-results').forEach(box => {
            const input = box.parentElement?.querySelector('.term-add-swimmer-input');
            if (input !== exceptInput) box.hidden = true;
        });
    }

    async function addSwimmerToTermQuick(swimmerId, termId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            showMessage('Plavalec ni najden.', 'warning');
            return;
        }
        const scrollY = window.scrollY;
        try {
            const added = await assignTermToSwimmer(swimmerId, termId);
            if (!added) {
                showMessage(`${swimmer.first_name} ${swimmer.last_name} je že na tem terminu.`, 'info');
                return;
            }
            updateSwimmersList();
            renderTermCheckboxesForSwimmer(swimmerId);
            updateTermList();
            window.scrollTo(0, scrollY);
            showMessage(`${swimmer.first_name} ${swimmer.last_name} je dodan na termin.`, 'success');
        } catch (error) {
            console.error('Napaka pri dodajanju plavalca na termin:', error);
            showMessage('Napaka pri dodajanju plavalca na termin.', 'error');
        }
    }

    window.addSwimmerToTerm = addSwimmerToTermQuick;

    elTermList?.addEventListener('input', (e) => {
        const input = e.target.closest('.term-add-swimmer-input');
        if (!input) return;
        renderTermAddSwimmerResults(input);
    });

    elTermList?.addEventListener('focusin', (e) => {
        const input = e.target.closest('.term-add-swimmer-input');
        if (!input) return;
        closeTermAddSwimmerResults(input);
        renderTermAddSwimmerResults(input);
    });

    elTermList?.addEventListener('keydown', (e) => {
        const input = e.target.closest('.term-add-swimmer-input');
        if (!input) return;
        if (e.key === 'Escape') {
            const box = input.closest('.term-add-swimmer')?.querySelector('.term-add-swimmer-results');
            if (box) box.hidden = true;
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = input.closest('.term-add-swimmer')?.querySelector('[data-add-swimmer-to-term]');
        if (first) addSwimmerToTermQuick(first.dataset.swimmerId, first.dataset.termId);
    });

    elTermList?.addEventListener('mousedown', (e) => {
        const item = e.target.closest('[data-add-swimmer-to-term]');
        if (!item) return;
        e.preventDefault();
        addSwimmerToTermQuick(item.dataset.swimmerId, item.dataset.termId);
    });

    document.addEventListener('mousedown', (e) => {
        if (!elTermList || elTermList.contains(e.target)) return;
        closeTermAddSwimmerResults();
    });

    document.getElementById('termListSeasonFilter')?.addEventListener('change', e => {
        applyAdminSeasonFilter(e.target.value, e.target);
    });
    document.getElementById('adminSeasonFilter')?.addEventListener('change', e => {
        applyAdminSeasonFilter(e.target.value, e.target);
    });
    document.getElementById('showSwimmersWithoutTerms')?.addEventListener('change', () => updateSwimmersList());
    document.getElementById('swimmersTableSearchInput')?.addEventListener('input', () => updateSwimmersList());

    if (elDeleteSwimmerBtn) {
        elDeleteSwimmerBtn.addEventListener('click', () => {
            const id = elSwimmerSelect?.value;
            if (!id) {
                showMessage('Izberite plavalca v spustnem seznamu «Dodeli termine plavalcem».', 'warning');
                return;
            }
            deleteSwimmer(id);
        });
    }

    if (elDeleteTrainerBtn) {
        elDeleteTrainerBtn.addEventListener('click', () => {
            const id = elTrainerSelect?.value;
            if (!id) {
                showMessage('Izberite trenerja v spustnem seznamu «Dodeli termine trenerjem».', 'warning');
                return;
            }
            deleteTrainer(id);
        });
    }

    document.getElementById('bulkApplyMembershipBtn')?.addEventListener('click', async () => {
        const seasonId = getAdminSeasonFilterId();
        if (!seasonId) {
            showMessage('Izberite sezono v pasu zgoraj.', 'warning');
            return;
        }
        const monthLabel = new Date(currentFinanceYear, currentFinanceMonth - 1, 1)
            .toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        if (!confirm(`Obračunam članarino (30 €) vsem plavalkam v sezoni za mesec ${monthLabel}?\n\nPosameznike lahko kasneje odznačite v Finance → Poročilo za računovodstvo.`)) return;
        setAdminFinanceMonth(currentFinanceMonth, currentFinanceYear, { refresh: false });
        const { rows } = await buildAccountingReportRows(currentFinanceMonth, currentFinanceYear);
        accountingReportWorkingOrder = rows;
        await applyGlobalMembershipFeeToReport(true);
        showMessage('Skupinska članarina je nastavljena. Posamezne odznačitve naredite v poročilu za računovodstvo.', 'success');
    });

    function updateBulkPaymentPlanSelect() {
        const sel = document.getElementById('bulkPaymentPlanSelect');
        if (!sel) return;
        const seasonId = getAdminSeasonFilterId();
        const season = seasons.find(s => s.id === seasonId);
        const allowed = getAllowedPaymentPlansForSeason(season);
        sel.querySelectorAll('option[value]').forEach(opt => {
            if (!opt.value) return;
            opt.hidden = !allowed.includes(opt.value);
            opt.disabled = !allowed.includes(opt.value);
        });
        if (sel.value && !allowed.includes(sel.value)) sel.value = '';
    }

    document.getElementById('bulkApplyPaymentPlanBtn')?.addEventListener('click', () => {
        const plan = document.getElementById('bulkPaymentPlanSelect')?.value;
        if (!plan) {
            showMessage('Izberite način plačila.', 'warning');
            return;
        }
        if (!confirm(`Nastavim način plačila «${PAYMENT_PLAN_LABELS[plan]}» vsem plavalkam v izbrani sezoni?`)) return;
        applyBulkPaymentPlan(plan);
    });

    function buildTermIdBase(day, start, end) {
        return `${DAY_SHORT_NAME[day].toLowerCase().replace('.', '')}-${start}-${end}`;
    }

    /** Edinstven ID termina; ob sezoni doda leto (npr. čet-20:00-21:00-2026). */
    function buildUniqueTermId(day, start, end, seasonId, excludeTermId) {
        let baseId = buildTermIdBase(day, start, end);
        if (seasonId) {
            const season = seasons.find(s => s.id === seasonId);
            const yearTag = season ? String(season.date_from || '').slice(0, 4) : '';
            if (yearTag) baseId = `${baseId}-${yearTag}`;
        }
        const isTaken = id => TERMS.some(t => t.id === id && t.id !== excludeTermId);
        if (!isTaken(baseId)) return baseId;
        let n = 1;
        while (isTaken(`${baseId}-${n}`)) n++;
        return `${baseId}-${n}`;
    }

    // ===== Dodajanje terminov =====
    elAddTermBtn.addEventListener('click', async () => {
        const day = parseInt(elNewTermDay.value);
        const start = elNewTermStart.value;
        const end = elNewTermEnd.value;
        const dateFrom = parseDate(elNewTermDateFrom.value);
        const dateTo = parseDate(elNewTermDateTo.value);
        
        if (!day || !start || !end || !dateFrom || !dateTo) {
            alert('Prosim izpolnite vsa polja');
            return;
        }

        if (start >= end) {
            alert('Končna ura mora biti kasnejša od začetne');
            return;
        }

        const elSeasonPick = document.getElementById('newTermSeasonId');
        const seasonIdVal = elSeasonPick && elSeasonPick.value ? elSeasonPick.value : null;
        
        const termId = buildUniqueTermId(day, start, end, seasonIdVal);
        
        try {
            const row = {
                id: termId,
                day: day,
                start_time: start,
                end_time: end,
                date_from: dateFrom,
                date_to: dateTo
            };
            if (seasonIdVal) row.season_id = seasonIdVal;
            const { data, error } = await supabase
                .from('terms')
                .insert([row])
                .select();

            if (error) {
                console.error('Napaka pri dodajanju termina:', error);
                alert('Napaka pri dodajanju termina. Preverite konzolo.');
                return;
            }

            // Dodaj v lokalno stanje
            if (data && data.length > 0) {
                const t = data[0];
                TERMS.push({
                    ...t,
                    label: t.label || `${DAYNAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`
                });
            }
            
            // Počisti polja
            elNewTermDay.value = '1';
            elNewTermStart.value = '';
            elNewTermEnd.value = '';
            elNewTermDateFrom.value = '';
            elNewTermDateTo.value = '';
            
            updateTermSelects();
            updateTermList();
            updateSwimmersList();
            renderSeasonsAdminList();
        } catch (error) {
            console.error('Napaka pri dodajanju termina:', error);
            alert('Napaka pri dodajanju termina.');
        }
    });

    const elAddSeasonBtn = document.getElementById('addSeasonBtn');
    if (elAddSeasonBtn) {
        elAddSeasonBtn.addEventListener('click', async () => {
            const name = document.getElementById('newSeasonName')?.value?.trim();
            const df = document.getElementById('newSeasonDateFrom')?.value;
            const dt = document.getElementById('newSeasonDateTo')?.value;
            const active = document.getElementById('newSeasonIsActive')?.checked || false;
            if (!name || !df || !dt) {
                alert('Vnesite naziv in datuma od–do.');
                return;
            }
            if (df > dt) {
                alert('Datum »od« mora biti pred ali enak »do«.');
                return;
            }
            try {
                const { error } = await supabase
                    .from('seasons')
                    .insert([{ name, date_from: df, date_to: dt, is_active: active }]);
                if (error) throw error;
                showMessage('Sezona je shranjena.', 'success');
                document.getElementById('newSeasonName').value = '';
                document.getElementById('newSeasonDateFrom').value = '';
                document.getElementById('newSeasonDateTo').value = '';
                document.getElementById('newSeasonIsActive').checked = false;
                await loadSeasons();
                populateSeasonSelects();
                renderSeasonsAdminList();
                const browseSel = document.getElementById('seasonTermsBrowseSelect');
                if (browseSel) renderSeasonTermsForSeason(browseSel.value || '');
            } catch (e) {
                console.error(e);
                alert('Napaka pri shranjevanju sezone: ' + (e.message || e));
            }
        });
    }

    const elEditSeasonModal = document.getElementById('editSeasonModal');
    function openEditSeasonModal(seasonId) {
        const s = seasons.find(x => x.id === seasonId);
        if (!s || !elEditSeasonModal) return;
        document.getElementById('editSeasonName').value = s.name || '';
        document.getElementById('editSeasonDateFrom').value = s.date_from || '';
        document.getElementById('editSeasonDateTo').value = s.date_to || '';
        document.getElementById('editSeasonIsActive').checked = !!s.is_active;
        elEditSeasonModal.setAttribute('data-season-id', seasonId);
        elEditSeasonModal.style.display = 'flex';
        elEditSeasonModal.setAttribute('aria-hidden', 'false');
    }
    function closeEditSeasonModal() {
        if (!elEditSeasonModal) return;
        elEditSeasonModal.style.display = 'none';
        elEditSeasonModal.setAttribute('aria-hidden', 'true');
        elEditSeasonModal.removeAttribute('data-season-id');
    }
    document.getElementById('closeEditSeasonModalBtn')?.addEventListener('click', closeEditSeasonModal);
    document.getElementById('cancelEditSeasonModalBtn')?.addEventListener('click', closeEditSeasonModal);
    elEditSeasonModal?.addEventListener('click', e => {
        if (e.target === elEditSeasonModal) closeEditSeasonModal();
    });
    document.getElementById('saveEditSeasonBtn')?.addEventListener('click', async () => {
        const id = elEditSeasonModal?.getAttribute('data-season-id');
        if (!id) return;
        const name = document.getElementById('editSeasonName')?.value?.trim();
        const df = document.getElementById('editSeasonDateFrom')?.value;
        const dt = document.getElementById('editSeasonDateTo')?.value;
        const active = document.getElementById('editSeasonIsActive')?.checked || false;
        if (!name || !df || !dt) {
            alert('Vnesite naziv in datuma od–do.');
            return;
        }
        if (df > dt) {
            alert('Datum »od« mora biti pred ali enak »do«.');
            return;
        }
        try {
            const oldSeason = seasons.find(s => s.id === id);
            const { error } = await supabase
                .from('seasons')
                .update({ name, date_from: df, date_to: dt, is_active: active })
                .eq('id', id);
            if (error) throw error;

            let termsUpdated = 0;
            if (oldSeason && (oldSeason.date_from !== df || oldSeason.date_to !== dt)) {
                const seasonTerms = TERMS.filter(t => t.season_id === id);
                const oldFrom = String(oldSeason.date_from || '').slice(0, 10);
                const oldTo = String(oldSeason.date_to || '').slice(0, 10);
                for (const term of seasonTerms) {
                    const termFrom = String(term.date_from || '').slice(0, 10);
                    const termTo = String(term.date_to || '').slice(0, 10);
                    const nextFrom = termFrom === oldFrom ? df : term.date_from;
                    const nextTo = termTo === oldTo ? dt : term.date_to;
                    if (String(nextFrom).slice(0, 10) === termFrom && String(nextTo).slice(0, 10) === termTo) continue;
                    const { error: termError } = await supabase
                        .from('terms')
                        .update({ date_from: nextFrom, date_to: nextTo })
                        .eq('id', term.id);
                    if (termError) {
                        console.error('Posodobitev datuma termina:', term.id, termError);
                        continue;
                    }
                    term.date_from = nextFrom;
                    term.date_to = nextTo;
                    termsUpdated++;
                }
            }

            showMessage(
                termsUpdated > 0
                    ? `Sezona je posodobljena. Usklajenih ${termsUpdated} terminov z novim obdobjem.`
                    : 'Sezona je posodobljena.',
                'success'
            );
            closeEditSeasonModal();
            await loadSeasons();
            populateSeasonSelects();
            renderSeasonsAdminList();
            updateTermList();
            updateTermSelects();
            const browseSel = document.getElementById('seasonTermsBrowseSelect');
            if (browseSel) renderSeasonTermsForSeason(browseSel.value || '');
        } catch (e) {
            console.error(e);
            alert('Napaka pri posodabljanju sezone: ' + (e.message || e));
        }
    });

    document.getElementById('seasonSetupCard')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-goto-section]');
        if (!btn) return;
        const section = btn.getAttribute('data-goto-section');
        const scrollTo = btn.getAttribute('data-scroll-to');
        showAdminSection(section, { updateHash: true });
        if (scrollTo) {
            setTimeout(() => {
                document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        }
    });

    document.getElementById('seasons-section')?.addEventListener('click', async e => {
        const editBtn = e.target.closest('[data-edit-season]');
        if (editBtn) {
            openEditSeasonModal(editBtn.getAttribute('data-edit-season'));
            return;
        }
        const delBtn = e.target.closest('[data-delete-season]');
        if (!delBtn) return;
        const seasonId = delBtn.getAttribute('data-delete-season');
        const s = seasons.find(x => x.id === seasonId);
        const nTerms = TERMS.filter(t => t.season_id === seasonId).length;
        if (!s) return;
        if (!confirm(`Izbrisati sezono «${s.name}»? ${nTerms} terminov bo imelo polje sezona izpraznjeno (termini ostanejo).`)) return;
        try {
            const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
            if (error) throw error;
            TERMS = TERMS.map(t => (t.season_id === seasonId ? { ...t, season_id: null } : t));
            showMessage('Sezona je izbrisana.', 'success');
            await loadSeasons();
            populateSeasonSelects();
            renderSeasonsAdminList();
            const browseSel = document.getElementById('seasonTermsBrowseSelect');
            if (browseSel) {
                if (browseSel.value === seasonId) browseSel.value = '';
                renderSeasonTermsForSeason(browseSel.value || '');
            }
        } catch (err) {
            console.error(err);
            alert('Brisanje sezone ni uspelo: ' + (err.message || err));
        }
    });

    const elGenerateSeasonReportBtn = document.getElementById('generateSeasonReportBtn');
    if (elGenerateSeasonReportBtn) {
        elGenerateSeasonReportBtn.addEventListener('click', () => runSeasonReport());
    }
    const elSeasonTermsBrowseSelect = document.getElementById('seasonTermsBrowseSelect');
    if (elSeasonTermsBrowseSelect) {
        elSeasonTermsBrowseSelect.addEventListener('change', e => {
            renderSeasonTermsForSeason(e.target.value || '');
        });
    }

    const elCopyTermsBetweenSeasonsBtn = document.getElementById('copyTermsBetweenSeasonsBtn');
    if (elCopyTermsBetweenSeasonsBtn) {
        elCopyTermsBetweenSeasonsBtn.addEventListener('click', async () => {
            const srcId = document.getElementById('copyTermsSourceSeason')?.value;
            const tgtId = document.getElementById('copyTermsTargetSeason')?.value;
            if (!srcId || !tgtId || srcId === tgtId) {
                showMessage('Izberite dve različni sezoni.', 'warning');
                return;
            }
            const tgtSeason = seasons.find(s => s.id === tgtId);
            if (!tgtSeason) return;
            const sourceTerms = TERMS.filter(t => t.season_id === srcId);
            if (sourceTerms.length === 0) {
                showMessage('V izvorni sezoni ni terminov.', 'warning');
                return;
            }
            if (!confirm(`Kopiram ${sourceTerms.length} terminov v sezono «${tgtSeason.name}»? Ustvarjeni bodo novi zapisi; dodelitve plavalcev in trenerjev morate urediti ročno.`)) return;

            let ok = 0;
            for (const term of sourceTerms) {
                const newId = buildUniqueTermId(term.day, term.start_time, term.end_time, tgtId);
                const row = {
                    id: newId,
                    day: term.day,
                    start_time: term.start_time,
                    end_time: term.end_time,
                    date_from: tgtSeason.date_from,
                    date_to: tgtSeason.date_to,
                    season_id: tgtId
                };
                const { data, error } = await supabase.from('terms').insert([row]).select();
                if (error) {
                    console.error('Kopiranje termina:', term.id, error);
                    showMessage('Napaka pri terminu: ' + term.id + ' – ' + (error.message || ''), 'error');
                    continue;
                }
                if (data && data[0]) {
                    const t = data[0];
                    TERMS.push({
                        ...t,
                        label: t.label || `${DAYNAME[t.day]} ${String(t.start_time).slice(0, 5)}–${String(t.end_time).slice(0, 5)}`
                    });
                    ok++;
                }
            }
            showMessage(`Kopiranih ${ok} od ${sourceTerms.length} terminov.`, ok === sourceTerms.length ? 'success' : 'warning');
            updateTermSelects();
            updateTermList();
            renderSeasonsAdminList();
            const browseSel = document.getElementById('seasonTermsBrowseSelect');
            if (browseSel) renderSeasonTermsForSeason(browseSel.value || '');
        });
    }

    // ===== Brisanje terminov =====
    window.deleteTerm = async function(termId) {
        try {
            // Najprej odstrani termin iz vseh plavalcev
            for (const swimmer of swimmers) {
                if (swimmer.terms.includes(termId)) {
                    const updatedTerms = swimmer.terms.filter(t => t !== termId);
                    await supabase
                        .from('swimmers')
                        .update({ terms: updatedTerms })
                        .eq('id', swimmer.id);
                    swimmer.terms = updatedTerms;
                }
            }

            // Izbriši status terminov
            const { error: statusError } = await supabase
                .from('term_status')
                .delete()
                .eq('term_id', termId);
            
            if (statusError) {
                console.error('Napaka pri brisanju statusa terminov:', statusError);
            }

            // Izbriši prisotnost
            const { error: attendanceError } = await supabase
                .from('attendance')
                .delete()
                .eq('term_id', termId);
            
            if (attendanceError) {
                console.error('Napaka pri brisanju prisotnosti:', attendanceError);
            }

            // Izbriši termin
            const { error: termError } = await supabase
                .from('terms')
                .delete()
                .eq('id', termId);

            if (termError) {
                console.error('Napaka pri brisanju termina:', termError);
                alert('Napaka pri brisanju termina. Preverite konzolo.');
                return;
            }

            // Posodobi lokalno stanje
            TERMS = TERMS.filter(t => t.id !== termId);
            
            // Posodobi UI
            updateTermSelects();
            updateTermList();
            updateSwimmersList();
            
            alert('Termin uspešno izbrisan iz sistema.');
        } catch (error) {
            console.error('Napaka pri brisanju termina:', error);
            alert('Napaka pri brisanju termina.');
        }
    };

    // ===== Urejanje terminov =====
    window.editTerm = function(termId) {
        const term = TERMS.find(t => t.id === termId);
        if (term) {
            elEditTermDateFrom.value = formatDate(term.date_from);
            elEditTermDateTo.value = formatDate(term.date_to);
            elEditTermStart.value = term.start_time || '';
            elEditTermEnd.value = term.end_time || '';
            populateSeasonSelects();
            const editSeas = document.getElementById('editTermSeasonId');
            if (editSeas) editSeas.value = term.season_id || '';
            elEditTermModal.style.display = 'flex';
            
            // Shrani ID termina za shranjevanje
            elEditTermModal.setAttribute('data-term-id', termId);
        }
    };

    elSaveEditTermBtn.addEventListener('click', async () => {
        const termId = elEditTermModal.getAttribute('data-term-id');
        const dateFrom = parseDate(elEditTermDateFrom.value);
        const dateTo = parseDate(elEditTermDateTo.value);
        const startTime = elEditTermStart.value;
        const endTime = elEditTermEnd.value;
        
        if (!dateFrom || !dateTo) {
            alert('Prosim vnesite veljavna datuma');
            return;
        }

        if (!startTime || !endTime) {
            alert('Prosim vnesite veljavni začetni in končni čas');
            return;
        }

        const term = TERMS.find(t => t.id === termId);
        const elEditSeasonPick = document.getElementById('editTermSeasonId');
        const seasonIdEdit = elEditSeasonPick && elEditSeasonPick.value ? elEditSeasonPick.value : null;
        if (term) {
            try {
                // Generiraj nov ID, če se je spremenil dan ali ura
                const day = term.day; // Dan ostane enak
                const newId = buildUniqueTermId(day, startTime, endTime, seasonIdEdit, termId);
                const idChanged = newId !== termId;
                
                // Posodobi podatke v bazi
                const updateData = { 
                    date_from: dateFrom, 
                    date_to: dateTo,
                    start_time: startTime,
                    end_time: endTime,
                    season_id: seasonIdEdit
                };
                
                // Če se je ID spremenil, dodaj novi ID
                if (idChanged) {
                    updateData.id = newId;
                }
                
                // Najprej posodobi termin (ali ustvari nov, če se je ID spremenil)
                if (idChanged) {
                    // Ustvari nov termin z novim ID-jem
                    const { data: newTerm, error: insertError } = await supabase
                    .from('terms')
                        .insert({
                            id: newId,
                            day: day,
                            start_time: startTime,
                            end_time: endTime,
                        date_from: dateFrom, 
                        date_to: dateTo,
                        season_id: seasonIdEdit
                    })
                        .select()
                        .single();
                    
                    if (insertError) {
                        console.error('Napaka pri ustvarjanju novega termina:', insertError);
                        alert('Napaka pri shranjevanju termina. Preverite konzolo.');
                        return;
                    }
                    
                    // Posodobi vse plavalce, ki so imeli stari termin, da imajo novega
                    const swimmersWithTerm = swimmers.filter(s => s.terms && s.terms.includes(termId));
                    for (const swimmer of swimmersWithTerm) {
                        const updatedTerms = swimmer.terms.map(t => t === termId ? newId : t);
                        await supabase
                            .from('swimmers')
                            .update({ terms: updatedTerms })
                            .eq('id', swimmer.id);
                    }
                    
                    // Posodobi tudi trenerje
                    const trainersWithTerm = trainers.filter(t => t.terms && t.terms.includes(termId));
                    for (const trainer of trainersWithTerm) {
                        const updatedTerms = trainer.terms.map(t => t === termId ? newId : t);
                        await supabase
                            .from('trainers')
                            .update({ terms: updatedTerms })
                            .eq('id', trainer.id);
                    }
                    
                    // POSODOBI VSE ZAPISE PRISOTNOSTI - ohrani prisotnost!
                    // Posodobi attendance zapise, da kažejo na nov termin ID
                    const { error: attendanceUpdateError } = await supabase
                        .from('attendance')
                        .update({ term_id: newId })
                        .eq('term_id', termId);
                    
                    if (attendanceUpdateError) {
                        console.error('Napaka pri posodabljanju zapisov prisotnosti:', attendanceUpdateError);
                        // Ne prekini - nadaljuj z drugimi posodobitvami
                    }
                    
                    // POSODOBI TUDI TRENER PRISOTNOST
                    const { error: trainerAttendanceUpdateError } = await supabase
                        .from('trainer_attendance')
                        .update({ term_id: newId })
                        .eq('term_id', termId);
                    
                    if (trainerAttendanceUpdateError) {
                        console.error('Napaka pri posodabljanju zapisov prisotnosti trenerjev:', trainerAttendanceUpdateError);
                        // Ne prekini - nadaljuj z drugimi posodobitvami
                    }
                    
                    // POSODOBI STATUS TERMINOV (term_status)
                    const { error: termStatusUpdateError } = await supabase
                        .from('term_status')
                        .update({ term_id: newId })
                        .eq('term_id', termId);
                    
                    if (termStatusUpdateError) {
                        console.error('Napaka pri posodabljanju statusa terminov:', termStatusUpdateError);
                        // Ne prekini - nadaljuj z drugimi posodobitvami
                    }
                    
                    // POSODOBI NADOMEŠČANJA (substitute_trainers)
                    const { error: substituteUpdateError } = await supabase
                        .from('substitute_trainers')
                        .update({ term_id: newId })
                        .eq('term_id', termId);
                    
                    if (substituteUpdateError) {
                        console.error('Napaka pri posodabljanju nadomeščanj:', substituteUpdateError);
                        // Ne prekini - nadaljuj z drugimi posodobitvami
                    }
                    
                    // Izbriši stari termin (PO posodobitvi vseh povezav)
                    await supabase
                        .from('terms')
                        .delete()
                        .eq('id', termId);
                    
                    // Posodobi lokalno stanje
                    TERMS = TERMS.filter(t => t.id !== termId);
                    const nt = { ...newTerm, label: newTerm.label || `${DAYNAME[newTerm.day]} ${String(newTerm.start_time).slice(0, 5)}–${String(newTerm.end_time).slice(0, 5)}` };
                    TERMS.push(nt);
                    
                    // Posodobi lokalno stanje plavalcev in trenerjev
                    swimmersWithTerm.forEach(swimmer => {
                        swimmer.terms = swimmer.terms.map(t => t === termId ? newId : t);
                    });
                    trainersWithTerm.forEach(trainer => {
                        trainer.terms = trainer.terms.map(t => t === termId ? newId : t);
                    });
                    
                    // POSODOBI LOKALNO STANJE PRISOTNOSTI - preslikaj term_id v attendance objektu
                    // Posodobi attendance objekt: premakni vse zapise iz starega term_id v novega
                    const attendanceDates = Object.keys(attendance);
                    attendanceDates.forEach(date => {
                        if (attendance[date][termId]) {
                            // Premakni zapise iz starega term_id v novega
                            attendance[date][newId] = attendance[date][newId] || {};
                            Object.assign(attendance[date][newId], attendance[date][termId]);
                            // Izbriši stare zapise
                            delete attendance[date][termId];
                        }
                    });
                    
                    // Posodobi tudi trainerAttendance
                    const trainerAttendanceDates = Object.keys(trainerAttendance);
                    trainerAttendanceDates.forEach(date => {
                        if (trainerAttendance[date][termId]) {
                            trainerAttendance[date][newId] = trainerAttendance[date][newId] || {};
                            Object.assign(trainerAttendance[date][newId], trainerAttendance[date][termId]);
                            delete trainerAttendance[date][termId];
                        }
                    });
                    
                    // Posodobi termStatus
                    const termStatusDates = Object.keys(termStatus);
                    termStatusDates.forEach(date => {
                        if (termStatus[date][termId]) {
                            termStatus[date][newId] = termStatus[date][termId];
                            delete termStatus[date][termId];
                        }
                    });
                } else {
                    // Samo posodobi obstoječi termin
                    const { error } = await supabase
                        .from('terms')
                        .update(updateData)
                    .eq('id', termId);

                if (error) {
                    console.error('Napaka pri shranjevanju termina:', error);
                    alert('Napaka pri shranjevanju termina. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                term.date_from = dateFrom;
                term.date_to = dateTo;
                    term.start_time = startTime;
                    term.end_time = endTime;
                    term.season_id = seasonIdEdit;
                }

                // Osveži UI
                updateTermList();
                updateSwimmersList();
                updateTermSelects();
                updateTrainerSelects();

                elEditTermModal.style.display = 'none';
            } catch (error) {
                console.error('Napaka pri shranjevanju termina:', error);
                alert('Napaka pri shranjevanju termina: ' + error.message);
            }
        }
    });

    elCloseEditTermModalBtn.addEventListener('click', () => {
        elEditTermModal.style.display = 'none';
    });

    // ===== Funkcionalnost urejanja plavalcev =====
    window.editSwimmer = async function(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            showMessage('Plavalec ne obstaja.', 'warning');
            return;
        }

        elEditSwimmerModal.setAttribute('data-swimmer-id', swimmerId);
        elEditSwimmerModal.style.display = 'flex';
        await populateEditSwimmerModal(swimmerId);
    };

    elSaveEditSwimmerBtn.addEventListener('click', async () => {
        const swimmerId = elEditSwimmerModal.getAttribute('data-swimmer-id');
        if (!swimmerId) {
            showMessage('Napaka: ID plavalca ni najden.', 'error');
            return;
        }

        const first = elEditSwimmerFirst.value.trim();
        const last = elEditSwimmerLast.value.trim();
        const email = elEditSwimmerEmail.value.trim() || null;
        const phone = elEditSwimmerPhone.value.trim() || null;
        const address = elEditSwimmerAddress.value.trim() || null;
        const postalCode = elEditSwimmerPostalCode.value.trim() || null;
        const notes = elEditSwimmerNotes?.value.trim() || null;
        const seasonId = getAdminSeasonFilterId();

        if (!first || !last) {
            elEditSwimmerInfo.textContent = 'Ime in priimek sta obvezna polja.';
            elEditSwimmerInfo.style.color = '#dc3545';
            return;
        }

        if (email && !isValidEmail(email)) {
            elEditSwimmerInfo.textContent = 'Vnesite veljaven email naslov.';
            elEditSwimmerInfo.style.color = '#dc3545';
            return;
        }

        elEditSwimmerInfo.textContent = 'Shranjevanje...';
        elEditSwimmerInfo.style.color = '#666';
        elSaveEditSwimmerBtn.disabled = true;

        try {
            const updateData = {
                first_name: first,
                last_name: last,
                email,
                phone,
                address,
                postal_code: postalCode,
                notes
            };

            let { error } = await supabase
                .from('swimmers')
                .update(updateData)
                .eq('id', swimmerId);

            if (error && (error.message?.includes('notes') || error.code === '42703')) {
                const fallbackData = { ...updateData };
                delete fallbackData.notes;
                ({ error } = await supabase.from('swimmers').update(fallbackData).eq('id', swimmerId));
                if (!error) {
                    showMessage('Opombe niso shranjene — poženite SQL/add_swimmer_notes.sql v Supabase.', 'warning');
                }
            }

            if (error) {
                elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + error.message;
                elEditSwimmerInfo.style.color = '#dc3545';
                return;
            }

            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer) {
                swimmer.first_name = first;
                swimmer.last_name = last;
                swimmer.email = email;
                swimmer.phone = phone;
                swimmer.address = address;
                swimmer.postal_code = postalCode;
                if (notes !== null && updateData.notes !== undefined) swimmer.notes = notes;
            }

            if (seasonId && elEditSwimmerTermsBox) {
                const desiredTerms = [...elEditSwimmerTermsBox.querySelectorAll('.edit-swimmer-term-cb:checked')]
                    .map(cb => cb.value);
                await syncSwimmerTermsForSeason(swimmerId, seasonId, desiredTerms);
            }

            if (seasonId && elEditSwimmerPaymentPlan?.value) {
                await setSwimmerPaymentPlan(swimmerId, seasonId, elEditSwimmerPaymentPlan.value);
            }

            if (elEditSwimmerOly && !elEditSwimmerOly.disabled) {
                await updateSwimmerOly(swimmerId, elEditSwimmerOly.checked === true, currentFinanceMonth, currentFinanceYear);
            }

            updateSwimmersList();
            renderTermCheckboxesForSwimmer(swimmerId);
            if (typeof refreshSwimmerFees === 'function') refreshSwimmerFees();
            if (typeof refreshAccountingReportEditor === 'function') refreshAccountingReportEditor();
            if (typeof calculateFinanceData === 'function') calculateFinanceData();

            elEditSwimmerModal.style.display = 'none';
            elEditSwimmerInfo.textContent = '';
            showMessage('Plavalec je posodobljen.', 'success');
        } catch (err) {
            console.error('Napaka pri shranjevanju plavalca:', err);
            elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + (err.message || err);
            elEditSwimmerInfo.style.color = '#dc3545';
        } finally {
            elSaveEditSwimmerBtn.disabled = false;
        }
    });

    elCloseEditSwimmerModalBtn.addEventListener('click', () => {
        elEditSwimmerModal.style.display = 'none';
        elEditSwimmerInfo.textContent = '';
    });

    // ===== Funkcionalnost urejanja trenerjev =====
    window.editTrainer = async function(trainerId) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) {
            showMessage('Trener ne obstaja.', 'warning');
            return;
        }
        if (trainer.is_deleted) {
            showMessage('Izbrisanega trenerja ni mogoče urediti.', 'warning');
            return;
        }

        elEditTrainerModal.setAttribute('data-trainer-id', trainerId);
        elEditTrainerModal.style.display = 'flex';
        await populateEditTrainerModal(trainerId);
    };

    elSaveEditTrainerBtn?.addEventListener('click', async () => {
        const trainerId = elEditTrainerModal.getAttribute('data-trainer-id');
        if (!trainerId) {
            showMessage('Napaka: ID trenerja ni najden.', 'error');
            return;
        }

        const first = elEditTrainerFirst.value.trim();
        const last = elEditTrainerLast.value.trim();
        const email = elEditTrainerEmail.value.trim() || null;
        const phone = elEditTrainerPhone.value.trim() || null;
        const role = elEditTrainerRole?.value === 'super_admin' ? 'super_admin' : 'trainer';
        const seasonId = getAdminSeasonFilterId();

        if (!first || !last) {
            elEditTrainerInfo.textContent = 'Ime in priimek sta obvezna polja.';
            elEditTrainerInfo.style.color = '#dc3545';
            return;
        }

        if (email && !isValidEmail(email)) {
            elEditTrainerInfo.textContent = 'Vnesite veljaven email naslov.';
            elEditTrainerInfo.style.color = '#dc3545';
            return;
        }

        if (phone && !isValidPhone(phone)) {
            elEditTrainerInfo.textContent = 'Vnesite veljavno telefonsko številko.';
            elEditTrainerInfo.style.color = '#dc3545';
            return;
        }

        const rateVal = elEditTrainerRate?.value;
        if (rateVal !== '' && rateVal != null && (isNaN(parseFloat(rateVal)) || parseFloat(rateVal) < 0)) {
            elEditTrainerInfo.textContent = 'Urna postavka mora biti nenegativno število.';
            elEditTrainerInfo.style.color = '#dc3545';
            return;
        }

        elEditTrainerInfo.textContent = 'Shranjevanje...';
        elEditTrainerInfo.style.color = '#666';
        elSaveEditTrainerBtn.disabled = true;

        try {
            const updateData = {
                first_name: first,
                last_name: last,
                email,
                phone,
                role
            };

            const { error } = await saveTrainerProfileToDb(trainerId, updateData);

            if (error) {
                elEditTrainerInfo.textContent = 'Napaka pri shranjevanju podatkov: ' + error.message;
                elEditTrainerInfo.style.color = '#dc3545';
                return;
            }

            const trainer = trainers.find(t => t.id === trainerId);
            if (trainer) {
                trainer.first_name = first;
                trainer.last_name = last;
                trainer.email = email;
                trainer.phone = phone;
                trainer.role = role;
            }

            if (seasonId && elEditTrainerTermsBox) {
                const desiredTerms = [...elEditTrainerTermsBox.querySelectorAll('.edit-trainer-term-cb:checked')]
                    .map(cb => cb.value);
                await syncTrainerTermsForSeason(trainerId, seasonId, desiredTerms);
            }

            if (rateVal !== '' && rateVal != null) {
                const trainerRates = await getTrainerRatesFromDB(currentFinanceMonth, currentFinanceYear);
                trainerRates[trainerId] = parseFloat(rateVal);
                const rateSaved = await saveTrainerRatesToDB(trainerRates, currentFinanceMonth, currentFinanceYear);
                if (!rateSaved) {
                    elEditTrainerInfo.textContent = 'Podatki trenerja shranjeni, urna postavka pa ne — preverite Finance / pravice.';
                    elEditTrainerInfo.style.color = '#dc3545';
                    updateTrainersList();
                    updateTrainerSelects();
                    return;
                }
            }

            updateTrainersList();
            updateTrainerSelects();
            renderTermCheckboxesForTrainer(trainerId);
            if (typeof renderTrainerRatesSettings === 'function') await renderTrainerRatesSettings();
            if (typeof calculateTrainerHoursCostsData === 'function') calculateTrainerHoursCostsData();
            if (typeof calculateFinanceData === 'function') calculateFinanceData();

            elEditTrainerModal.style.display = 'none';
            elEditTrainerInfo.textContent = '';
            showMessage('Trener je posodobljen.', 'success');
        } catch (err) {
            console.error('Napaka pri shranjevanju trenerja:', err);
            elEditTrainerInfo.textContent = 'Napaka pri shranjevanju: ' + (err.message || err);
            elEditTrainerInfo.style.color = '#dc3545';
        } finally {
            elSaveEditTrainerBtn.disabled = false;
        }
    });

    elCloseEditTrainerModalBtn?.addEventListener('click', () => {
        elEditTrainerModal.style.display = 'none';
        if (elEditTrainerInfo) elEditTrainerInfo.textContent = '';
    });

    elEditTrainerModal?.addEventListener('click', (e) => {
        if (e.target === elEditTrainerModal) {
            elEditTrainerModal.style.display = 'none';
            if (elEditTrainerInfo) elEditTrainerInfo.textContent = '';
        }
    });

    async function inviteTrainerById(trainerId, { quiet = false } = {}) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer || trainer.is_deleted) {
            showMessage('Trener ni najden.', 'warning');
            return false;
        }
        const email = (trainer.email || '').trim();
        if (!email || !email.includes('@')) {
            showMessage('Najprej vnesite veljaven email in shranite trenerja.', 'warning');
            return false;
        }

        const redirectTo = `${window.location.origin.replace(/\/$/, '')}/reset-password.html`;
        const { data, error } = await supabase.functions.invoke('invite-trainer', {
            body: { trainerId, redirectTo }
        });

        const errMsg = data?.error || error?.message;
        if (error || !data?.ok) {
            throw new Error(errMsg || 'Pošiljanje prijave ni uspelo.');
        }

        const { data: fresh } = await supabase
            .from('trainers')
            .select('user_id, email')
            .eq('id', trainerId)
            .maybeSingle();
        if (fresh) {
            trainer.user_id = fresh.user_id;
            trainer.email = fresh.email || trainer.email;
        }

        updateTrainersList();
        if (elEditTrainerModal?.getAttribute('data-trainer-id') === trainerId) {
            await populateEditTrainerModal(trainerId);
        }
        if (!quiet) {
            showMessage(data.message || `Prijavo smo poslali na ${email}.`, 'success');
        }
        return true;
    }

    window.inviteTrainer = async function(trainerId) {
        try {
            await inviteTrainerById(trainerId);
        } catch (err) {
            console.error('Povabilo trenerja:', err);
            showMessage(err.message || 'Pošiljanje prijave ni uspelo.', 'error');
        }
    };

    elInviteTrainerFromModalBtn?.addEventListener('click', async () => {
        const trainerId = elEditTrainerModal?.getAttribute('data-trainer-id');
        if (!trainerId) return;
        const typedEmail = elEditTrainerEmail?.value.trim();
        const trainer = trainers.find(t => t.id === trainerId);
        if (typedEmail && trainer && typedEmail.toLowerCase() !== String(trainer.email || '').toLowerCase()) {
            const { error } = await saveTrainerProfileToDb(trainerId, {
                first_name: (elEditTrainerFirst.value || trainer.first_name || '').trim(),
                last_name: (elEditTrainerLast.value || trainer.last_name || '').trim(),
                email: typedEmail
            });
            if (error) {
                showMessage('Email ni shranjen: ' + error.message, 'error');
                return;
            }
            trainer.email = typedEmail;
        }
        elInviteTrainerFromModalBtn.disabled = true;
        try {
            await inviteTrainerById(trainerId);
        } catch (err) {
            showMessage(err.message || 'Pošiljanje prijave ni uspelo.', 'error');
        } finally {
            elInviteTrainerFromModalBtn.disabled = false;
        }
    });

    elInviteAllTrainersBtn?.addEventListener('click', async () => {
        const pending = trainers.filter(t =>
            !t.is_deleted && !t.user_id && (t.email || '').includes('@')
        );
        if (pending.length === 0) {
            showMessage('Vsi trenerji z emailom že imajo račun (ali nimate koga povabiti).', 'info');
            return;
        }
        if (!confirm(`Poslati prijavo ${pending.length} trenerjem brez računa?`)) return;
        elInviteAllTrainersBtn.disabled = true;
        let ok = 0;
        const failures = [];
        try {
            for (const t of pending) {
                try {
                    await inviteTrainerById(t.id, { quiet: true });
                    ok++;
                } catch (err) {
                    failures.push(`${t.first_name} ${t.last_name}: ${err.message || 'napaka'}`);
                }
            }
            if (failures.length) {
                showMessage(`Poslano: ${ok}. Napake: ${failures.join(' | ')}`, 'warning');
            } else {
                showMessage(`Prijavo smo poslali ${ok} trenerjem. Naj preverijo e-pošto (tudi vsiljeno pošto).`, 'success');
            }
        } finally {
            elInviteAllTrainersBtn.disabled = false;
        }
    });

    // Event listenerji za modal z detajli ur
    const elHoursDetailsModal = document.getElementById('hoursDetailsModal');
    const elCloseHoursDetailsModalBtn = document.getElementById('closeHoursDetailsModalBtn');
    
    if (elCloseHoursDetailsModalBtn && elHoursDetailsModal) {
        elCloseHoursDetailsModalBtn.addEventListener('click', () => {
            elHoursDetailsModal.style.display = 'none';
            elHoursDetailsModal.setAttribute('aria-hidden', 'true');
        });
        
        // Zapri modal ob kliku zunaj
        elHoursDetailsModal.addEventListener('click', (e) => {
            if (e.target === elHoursDetailsModal) {
                elHoursDetailsModal.style.display = 'none';
                elHoursDetailsModal.setAttribute('aria-hidden', 'true');
            }
        });
    }
    
    // Event listenerji za modal odsotnosti trenerjev
    const elTrainerAbsenceModal = document.getElementById('trainerAbsenceModal');
    const elCloseTrainerAbsenceModalBtn = document.getElementById('closeTrainerAbsenceModalBtn');
    
    if (elCloseTrainerAbsenceModalBtn && elTrainerAbsenceModal) {
        elCloseTrainerAbsenceModalBtn.addEventListener('click', () => {
            elTrainerAbsenceModal.style.display = 'none';
            elTrainerAbsenceModal.setAttribute('aria-hidden', 'true');
        });
        
        // Zapri modal ob kliku zunaj
        elTrainerAbsenceModal.addEventListener('click', (e) => {
            if (e.target === elTrainerAbsenceModal) {
                elTrainerAbsenceModal.style.display = 'none';
                elTrainerAbsenceModal.setAttribute('aria-hidden', 'true');
            }
        });
    }
    
    // UI elementi za modal prisotnosti plavalca
    const elSwimmerAttendanceModal = document.getElementById('swimmerAttendanceModal');
    const elCloseSwimmerAttendanceModalBtn = document.getElementById('closeSwimmerAttendanceModalBtn');
    const elSwimmerAttendanceContent = document.getElementById('swimmerAttendanceContent');
    const elSwimmerAttendanceModalTitle = document.getElementById('swimmerAttendanceModalTitle');
    
    if (elCloseSwimmerAttendanceModalBtn && elSwimmerAttendanceModal) {
        elCloseSwimmerAttendanceModalBtn.addEventListener('click', () => {
            elSwimmerAttendanceModal.style.display = 'none';
            elSwimmerAttendanceModal.setAttribute('aria-hidden', 'true');
        });
        
        // Zapri modal ob kliku zunaj
        elSwimmerAttendanceModal.addEventListener('click', (e) => {
            if (e.target === elSwimmerAttendanceModal) {
                elSwimmerAttendanceModal.style.display = 'none';
                elSwimmerAttendanceModal.setAttribute('aria-hidden', 'true');
            }
        });
    }
    
    // Funkcija za prikaz modala z programom prisotnosti plavalca
    function showSwimmerAttendanceModal(swimmerId, swimmerName) {
        if (!window.currentSwimmerStats || !window.currentSwimmerStats[swimmerId]) {
            alert('Podatki o prisotnosti niso na voljo');
            return;
        }
        
        const swimmerStat = window.currentSwimmerStats[swimmerId];
        const attendanceDates = swimmerStat.attendanceDates || [];
        const absentDates = swimmerStat.absentDates || [];
        const missedDates = swimmerStat.missedDates || [];
        
        // Funkcija za sortiranje datumov
        const sortDates = (dates) => {
            return dates.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                // Če sta datuma enaka, sortiraj po terminu
                return a.termId.localeCompare(b.termId);
            });
        };
        
        // Sortiraj vse datume
        const sortedAttendance = sortDates([...attendanceDates]);
        const sortedAbsent = sortDates([...absentDates]);
        const sortedMissed = sortDates([...missedDates]);
        
        // Formatiraj datume
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const dayNames = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
            const dayName = dayNames[date.getDay()];
            return `${day}. ${month}. ${year} (${dayName})`;
        };
        
        // Formatiraj termin (z sezono)
        const formatTerm = (termId) => formatTermLabelById(termId);
        
        // Funkcija za prikaz tabele
        const renderTable = (dates, title, colorClass) => {
            if (dates.length === 0) {
                return `<p class="muted">Ni ${title.toLowerCase()}</p>`;
            }
            let html = `<h5 style="margin-top: 20px; margin-bottom: 10px; color: ${colorClass === 'ok' ? '#28a745' : colorClass === 'warn' ? '#dc3545' : '#6c757d'};">${title} (${dates.length})</h5>`;
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr><th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Datum</th><th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">Sezona / Termin</th></tr></thead><tbody>';
            dates.forEach(item => {
                html += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(item.date)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${formatTerm(item.termId)}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            return html;
        };
        
        // Ustvari vsebino modala
        let content = `<h4>Program prisotnosti: ${swimmerName}</h4>`;
        content += `<p><strong>Obiskani treningi:</strong> ${swimmerStat.att} / <strong>Možni treningi:</strong> ${swimmerStat.pos}</p>`;
        
        // Prikaži prisotne treninge
        content += renderTable(sortedAttendance, 'Prisotni treningi', 'ok');
        
        // Prikaži izpuščene treninge (odsotnosti)
        content += renderTable(sortedAbsent, 'Izpuščeni treningi (odsotnosti)', 'warn');
        
        // Prikaži neobiskane treninge
        content += renderTable(sortedMissed, 'Neobiskani treningi', 'muted');
        
        if (elSwimmerAttendanceContent) {
            elSwimmerAttendanceContent.innerHTML = content;
        }
        if (elSwimmerAttendanceModalTitle) {
            elSwimmerAttendanceModalTitle.textContent = `Program prisotnosti - ${swimmerName}`;
        }
        
        if (elSwimmerAttendanceModal) {
            elSwimmerAttendanceModal.style.display = 'flex';
            elSwimmerAttendanceModal.setAttribute('aria-hidden', 'false');
        }
    }
    
    // Funkcija za prikaz modala z datumi odsotnosti
    function showTrainerAbsenceModal(trainerId, trainerName) {
        if (!window.currentTrainerStats || !window.currentTrainerStats[trainerId]) {
            alert('Podatki o odsotnostih niso na voljo');
            return;
        }
        
        const trainerStat = window.currentTrainerStats[trainerId];
        const absentDates = trainerStat.absentDates || [];
        
        // Sortiraj datume
        absentDates.sort((a, b) => new Date(a) - new Date(b));
        
        // Formatiraj datume
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const dayNames = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
            const dayName = dayNames[date.getDay()];
            return `${day}. ${month}. ${year} (${dayName})`;
        };
        
        // Ustvari vsebino modala
        let content = `<h4>Odsotnosti: ${trainerName}</h4>`;
        
        if (absentDates.length === 0) {
            content += '<p class="muted">Ni odsotnosti</p>';
        } else {
            content += '<ul style="list-style-type: none; padding: 0;">';
            absentDates.forEach(date => {
                content += `<li style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(date)}</li>`;
            });
            content += '</ul>';
        }
        
        // Prikaži modal
        const elTrainerAbsenceContent = document.getElementById('trainerAbsenceContent');
        const elTrainerAbsenceModalTitle = document.getElementById('trainerAbsenceModalTitle');
        
        if (elTrainerAbsenceContent) {
            elTrainerAbsenceContent.innerHTML = content;
        }
        if (elTrainerAbsenceModalTitle) {
            elTrainerAbsenceModalTitle.textContent = `Datumi odsotnosti - ${trainerName}`;
        }
        
        if (elTrainerAbsenceModal) {
            elTrainerAbsenceModal.style.display = 'flex';
            elTrainerAbsenceModal.setAttribute('aria-hidden', 'false');
        }
    }

    // Zapri modal ob kliku zunaj
    window.addEventListener('click', (e) => {
        if (e.target === elEditSwimmerModal) {
            elEditSwimmerModal.style.display = 'none';
            elEditSwimmerInfo.textContent = '';
        }
        if (e.target === elEditTermModal) {
            elEditTermModal.style.display = 'none';
        }
    });

    // ===== CSV uvoz/izvoz =====
    function updateExportSelects() {
        // Mesec - uporabi 1-based vrednosti za boljšo berljivost
        elExportMonthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i - 1; // Še vedno 0-based za JavaScript Date
            option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
            elExportMonthSelect.appendChild(option);
        }
        elExportMonthSelect.value = new Date().getMonth();

        // Leto
        elExportYearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elExportYearSelect.appendChild(option);
        }
        elExportYearSelect.value = currentYear;
    }
    
    // Funkcija za inicializacijo dropdownov za uvoz vadnin
    function updateCsvFeesSelects() {
        if (!elCsvFeesYearSelect) return;
        
        // Populiraj leta (trenutno leto - 1 do trenutno leto + 2)
        elCsvFeesYearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elCsvFeesYearSelect.appendChild(option);
        }
        elCsvFeesYearSelect.value = currentYear;
        
        // Nastavi privzeti mesec na trenutni mesec
        if (elCsvFeesMonthSelect) {
            const currentMonth = new Date().getMonth() + 1; // 1-based za dropdown
            elCsvFeesMonthSelect.value = currentMonth;
        }
    }

    // Funkcija za prepoznavanje separatorja (vejica ali podpičje)
    function detectSeparator(csvLine) {
        // Preštej pojavitve vejic in podpičij (izven narekovajev)
        let commaCount = 0;
        let semicolonCount = 0;
        let inQuotes = false;
        
        for (let i = 0; i < csvLine.length; i++) {
            const char = csvLine[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (char === ',') commaCount++;
                if (char === ';') semicolonCount++;
            }
        }
        
        // Uporabi separator, ki se pojavi večkrat
        return semicolonCount > commaCount ? ';' : ',';
    }

    // CSV uvoz plavalcev
    elCsvInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csv = e.target.result;
                
                // Funkcija za pravilno razčlenjevanje CSV vrstic z upoštevanjem narekovajev
                function parseCSVLine(line, separator) {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === separator && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    
                    result.push(current.trim());
                    return result.map(field => field.replace(/^"|"$/g, ''));
                }
                
                const lines = csv.split('\n');
                // Prepoznaj separator iz prve vrstice
                const separator = detectSeparator(lines[0]);
                const headers = parseCSVLine(lines[0], separator);
                
                if (!headers.includes('first_name') || !headers.includes('last_name') || !headers.includes('terms')) {
                    alert('CSV mora vsebovati stolpce: first_name, last_name, terms (email, phone, address, postal_code so opcijski)');
                    return;
                }

                const newSwimmers = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = parseCSVLine(lines[i], separator);
                        const first = values[headers.indexOf('first_name')];
                        const last = values[headers.indexOf('last_name')];
                        const termsStr = values[headers.indexOf('terms')];
                        const email = headers.includes('email') ? values[headers.indexOf('email')] : '';
                        const phone = headers.includes('phone') ? values[headers.indexOf('phone')] : '';
                        const address = headers.includes('address') ? values[headers.indexOf('address')] : '';
                        const postalCode = headers.includes('postal_code') ? (values[headers.indexOf('postal_code')] || '').trim() : '';
                        
                        // Debug: preveri, ali se postal_code pravilno prebere
                        if (postalCode) {
                            console.log(`📮 Postal code za ${first} ${last}: "${postalCode}"`);
                        }
                        
                        if (first && last) {
                            // Funkcija za pretvorbo CSV formata termina v ID format baze
                            // CSV format: "Pon.-20:00:00-21:00:00" -> ID format: "pon-20:00-21:00"
                            function convertCSVTermToID(csvTerm) {
                                if (!csvTerm || csvTerm.trim() === '' || csvTerm === '""') return null;
                                
                                // Odstrani narekovaje, če so prisotni
                                let term = csvTerm.trim().replace(/^"|"$/g, '');
                                if (!term) return null;
                                
                                // Preslikava slovenskih dni (z vejico ali brez, velike/male črke)
                                const dayMap = {
                                    'pon': 'pon', 'pon.': 'pon', 'Pon': 'pon', 'Pon.': 'pon', 'PON': 'pon', 'PON.': 'pon',
                                    'tor': 'tor', 'tor.': 'tor', 'Tor': 'tor', 'Tor.': 'tor', 'TOR': 'tor', 'TOR.': 'tor',
                                    'sre': 'sre', 'sre.': 'sre', 'Sre': 'sre', 'Sre.': 'sre', 'SRE': 'sre', 'SRE.': 'sre',
                                    'čet': 'čet', 'čet.': 'čet', 'Čet': 'čet', 'Čet.': 'čet', 'ČET': 'čet', 'ČET.': 'čet',
                                    'pet': 'pet', 'pet.': 'pet', 'Pet': 'pet', 'Pet.': 'pet', 'PET': 'pet', 'PET.': 'pet',
                                    'sob': 'sob', 'sob.': 'sob', 'Sob': 'sob', 'Sob.': 'sob', 'SOB': 'sob', 'SOB.': 'sob',
                                    'ned': 'ned', 'ned.': 'ned', 'Ned': 'ned', 'Ned.': 'ned', 'NED': 'ned', 'NED.': 'ned'
                                };
                                
                                // Razčleni format: "Dan-Cas-Cas" ali "Dan.Cas-Cas"
                                const parts = term.split('-');
                                if (parts.length !== 3) return null;
                                
                                let day = parts[0].trim();
                                const start = parts[1].trim();
                                const end = parts[2].trim();
                                
                                // Preslikaj dan - podpira velike/male črke in z/brez piko
                                // Najprej poskusi direktno preslikavo
                                if (dayMap[day]) {
                                    day = dayMap[day];
                                } else {
                                    // Če ni v mapi, odstrani piko in pretvori v lowercase
                                    let cleanDay = day.replace(/\./g, '').toLowerCase();
                                    // Preveri, ali je sedaj v mapi
                                    if (dayMap[cleanDay]) {
                                        day = dayMap[cleanDay];
                                    } else {
                                        // Če še vedno ni, uporabi cleanDay direktno
                                        day = cleanDay;
                                    }
                                }
                                
                                // Odstrani sekunde iz časa (20:00:00 -> 20:00)
                                const formatTime = (time) => {
                                    if (time.includes(':')) {
                                        const timeParts = time.split(':');
                                        return `${timeParts[0]}:${timeParts[1]}`;
                                    }
                                    return time;
                                };
                                
                                const startFormatted = formatTime(start);
                                const endFormatted = formatTime(end);
                                
                                // Vrne format: "pon-20:00-21:00"
                                return `${day}-${startFormatted}-${endFormatted}`;
                            }
                            
                            // Razčleni termine, ločene z vejico, podpičjem ali " in "
                            // Najprej odstrani narekovaje okoli celotnega seznama terminov, če obstajajo
                            let cleanTermsStr = termsStr ? termsStr.trim().replace(/^"|"$/g, '') : '';
                            
                            // Debug: izpiši originalni terms string
                            if (cleanTermsStr) {
                                console.log(`📋 Terms string za ${first} ${last}: "${cleanTermsStr}"`);
                            }
                            
                            // Podpira več separatorjev: vejica, podpičje, " in " (različne oblike)
                            // Najprej zamenjaj " in " z vejico, nato split z vejico ali podpičjem
                            // Regex za " in " z različnimi presledki (case insensitive)
                            // Podpira: " in ", " in", "in ", "IN"
                            cleanTermsStr = cleanTermsStr.replace(/\s+in\s+/gi, ','); // " in " -> vejica (case insensitive)
                            cleanTermsStr = cleanTermsStr.replace(/\s+in\s+/gi, ','); // Ponovno za večkratne pojavitve (npr. "A in B in C")
                            cleanTermsStr = cleanTermsStr.replace(/,\s*,/g, ','); // Čisti večkratne vejice
                            
                            // Split z vejico ali podpičjem
                            const termsRaw = cleanTermsStr 
                                ? cleanTermsStr.split(/[,;]/).map(t => t.trim()).filter(t => t && t !== '' && t !== '""') 
                                : [];
                            
                            // Debug: izpiši razčlenjene termine
                            if (termsRaw.length > 0) {
                                console.log(`🔍 Razčlenjeni termini za ${first} ${last}:`, termsRaw);
                            }
                            
                            // Preveri, ali vsi termini obstajajo v bazi
                            const validTerms = [];
                            const invalidTerms = [];
                            
                            for (const termRaw of termsRaw) {
                                // Poskusi najprej direktno iskanje
                                let termId = termRaw;
                                let foundTerm = TERMS.find(t => t.id === termId);
                                
                                // Če ne najde, poskusi pretvorbo iz CSV formata
                                if (!foundTerm) {
                                    termId = convertCSVTermToID(termRaw);
                                    if (termId) {
                                        foundTerm = TERMS.find(t => t.id === termId);
                                    }
                                }
                                
                                if (foundTerm) {
                                    validTerms.push(foundTerm.id);
                                } else {
                                    invalidTerms.push(termRaw);
                                }
                            }
                            
                            if (invalidTerms.length > 0) {
                                console.warn(`⚠️ Neveljavni termini za ${first} ${last}: [${invalidTerms.join(', ')}]`);
                                console.log(`   Poskusitev pretvorbe za:`, invalidTerms.map(t => convertCSVTermToID(t)));
                            }
                            
                            // Debug izpis
                            if (validTerms.length > 0) {
                                console.log(`✅ ${first} ${last}: ${validTerms.length} veljavnih terminov: [${validTerms.join(', ')}]`);
                            } else if (termsRaw.length > 0) {
                                console.warn(`⚠️ ${first} ${last}: Ni veljavnih terminov. CSV termini: [${termsRaw.join(', ')}]`);
                            }
                            
                            // Validacija email naslova (če je vnesen)
                            if (email && !isValidEmail(email)) {
                                console.warn(`Invalid email for ${first} ${last}: ${email}`);
                            }
                            
                            // Validacija telefonske številke (če je vnesena)
                            if (phone && !isValidPhone(phone)) {
                                console.warn(`Invalid phone for ${first} ${last}: ${phone}`);
                            }
                            
// console.log(`Parsed swimmer: ${first} ${last}, email: ${email || 'none'}, phone: ${phone || 'none'}, valid terms: [${validTerms.join(', ')}]`);
                            
                            // Debug: preveri, kaj se shranjuje
                            console.log(`💾 Shranjevanje za ${first} ${last}:`, {
                                postal_code: postalCode || '(prazno)',
                                terms_count: validTerms.length,
                                terms: validTerms
                            });
                            
                            newSwimmers.push({
                                first_name: first,
                                last_name: last,
                                email: email && isValidEmail(email) ? email : null,
                                phone: phone && isValidPhone(phone) ? phone : null,
                                address: address || null,
                                postal_code: postalCode && postalCode.trim() ? postalCode.trim() : null,
                                terms: validTerms,
                                is_deleted: false
                            });
                        }
                    }
                }

                if (newSwimmers.length > 0) {
                    // Ločimo nove plavalce od obstoječih
                    const newSwimmersToInsert = [];
                    const existingSwimmersToUpdate = [];
                    
                    for (const swimmer of newSwimmers) {
                        // Poišči obstoječega plavalca po imenu in priimku
                        const existingSwimmer = swimmers.find(s => 
                            s.first_name.toLowerCase() === swimmer.first_name.toLowerCase() && 
                            s.last_name.toLowerCase() === swimmer.last_name.toLowerCase()
                        );
                        
                        if (existingSwimmer) {
                            // Pri posodabljanju obstoječega plavalca:
                            // - Če CSV vsebuje termine, jih uporabi
                            // - Če CSV ne vsebuje terminov ali so prazni, ohrani obstoječe termine
                            // - Email in telefon se vedno posodobijo, če so navedeni v CSV
                            const newTerms = swimmer.terms && swimmer.terms.length > 0 
                                ? swimmer.terms 
                                : (existingSwimmer.terms || []);
                            
                            existingSwimmersToUpdate.push({
                                id: existingSwimmer.id,
                                terms: newTerms,
                                email: swimmer.email !== null && swimmer.email !== '' ? swimmer.email : existingSwimmer.email,
                                phone: swimmer.phone !== null && swimmer.phone !== '' ? swimmer.phone : existingSwimmer.phone,
                                address: swimmer.address !== null && swimmer.address !== '' ? swimmer.address : existingSwimmer.address,
                                postal_code: swimmer.postal_code !== null && swimmer.postal_code !== '' ? swimmer.postal_code : existingSwimmer.postal_code
                            });
                        } else {
                            // Dodaj novega plavalca
                            newSwimmersToInsert.push(swimmer);
                        }
                    }
                    
                    let insertedCount = 0;
                    let updatedCount = 0;
                    
                    // Vstavi nove plavalce
                    if (newSwimmersToInsert.length > 0) {
                        const { data: insertData, error: insertError } = await supabase
                            .from('swimmers')
                            .insert(newSwimmersToInsert)
                            .select();

                        if (insertError) {
                            console.error('Napaka pri uvažanju novih plavalcev:', insertError);
                            alert('Napaka pri uvažanju novih plavalcev. Preverite konzolo.');
                            return;
                        }

                        if (insertData) {
                            swimmers.push(...insertData);
                            insertedCount = insertData.length;
                            
                            // Shrani datume dodelitve za nove plavalce
                            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                            const assignmentsToInsert = [];
                            
                            insertData.forEach(swimmer => {
                                if (swimmer.terms && swimmer.terms.length > 0) {
                                    swimmer.terms.forEach(termId => {
                                        assignmentsToInsert.push({
                                            swimmer_id: swimmer.id,
                                            term_id: termId,
                                            assigned_from_date: today,
                                            assigned_to_date: null
                                        });
                                    });
                                }
                            });
                            
                            if (assignmentsToInsert.length > 0) {
                                const { error: assignmentError } = await supabase
                                    .from('swimmer_term_assignments')
                                    .upsert(assignmentsToInsert, { 
                                        onConflict: 'swimmer_id,term_id,assigned_from_date',
                                        ignoreDuplicates: false
                                    });
                                
                                if (assignmentError) {
                                    console.error('Napaka pri shranjevanju datumov dodelitve za nove plavalce:', assignmentError);
                                }
                            }
                        }
                    }
                    
                                        // Posodobi obstoječe plavalce
                    if (existingSwimmersToUpdate.length > 0) {
                        for (const updateData of existingSwimmersToUpdate) {
// console.log(`Updating swimmer ${updateData.id} with terms: [${updateData.terms.join(', ')}]`);
// console.log('Terms array type:', typeof updateData.terms, 'Length:', updateData.terms.length);
// console.log('Terms array content:', JSON.stringify(updateData.terms));
// console.log('Terms array isArray:', Array.isArray(updateData.terms));
// console.log('Terms array constructor:', updateData.terms.constructor.name);
                            
                            const { data: updateResult, error: updateError } = await supabase
                                .from('swimmers')
                                .update({ 
                                    terms: updateData.terms,
                                    email: updateData.email,
                                    phone: updateData.phone,
                                    address: updateData.address,
                                    postal_code: updateData.postal_code
                                })
                                .eq('id', updateData.id)
                                .select();

                            if (updateError) {
                                console.error('Napaka pri posodobitvi plavalca:', updateError);
                                continue;
                            }
                            
                            if (updateResult && updateResult.length > 0) {
// console.log(`Database update successful for swimmer ${updateData.id}:`, updateResult[0]);
// console.log(`Database returned terms:`, updateResult[0].terms);
// console.log(`Database terms type:`, typeof updateResult[0].terms);
// console.log(`Database terms isArray:`, Array.isArray(updateResult[0].terms));
                            }
                            
                            // Posodobi lokalno stanje
                            const localSwimmer = swimmers.find(s => s.id === updateData.id);
                            if (localSwimmer) {
                                const oldTerms = localSwimmer.terms || [];
                                const newTerms = updateData.terms || [];
                                
                                // Poišči nove termine (ki jih prej ni bilo)
                                const addedTerms = newTerms.filter(t => !oldTerms.includes(t));
                                
                                localSwimmer.terms = updateData.terms;
                                localSwimmer.email = updateData.email;
                                localSwimmer.phone = updateData.phone;
                                localSwimmer.address = updateData.address;
                                localSwimmer.postal_code = updateData.postal_code;
                                
                                // Shrani datume dodelitve za nove termine
                                if (addedTerms.length > 0) {
                                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                                    const assignmentsToInsert = addedTerms.map(termId => ({
                                        swimmer_id: updateData.id,
                                        term_id: termId,
                                        assigned_from_date: today,
                                        assigned_to_date: null
                                    }));
                                    
                                    const { error: assignmentError } = await supabase
                                        .from('swimmer_term_assignments')
                                        .upsert(assignmentsToInsert, { 
                                            onConflict: 'swimmer_id,term_id,assigned_from_date',
                                            ignoreDuplicates: false
                                        });
                                    
                                    if (assignmentError) {
                                        console.error('Napaka pri shranjevanju datumov dodelitve:', assignmentError);
                                    }
                                }
                                
                                // Poišči odstranjene termine in nastavi assigned_to_date
                                const removedTerms = oldTerms.filter(t => !newTerms.includes(t));
                                if (removedTerms.length > 0) {
                                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                                    for (const termId of removedTerms) {
                                        const { error: assignmentError } = await supabase
                                            .from('swimmer_term_assignments')
                                            .update({ assigned_to_date: today })
                                            .eq('swimmer_id', updateData.id)
                                            .eq('term_id', termId)
                                            .is('assigned_to_date', null); // Posodobi samo aktivne dodelitve
                                        
                                        if (assignmentError) {
                                            console.error('Napaka pri posodabljanju datuma odstranitve:', assignmentError);
                                        }
                                    }
                                }
                                
// console.log(`Updated local swimmer ${localSwimmer.first_name} ${localSwimmer.last_name} with terms: [${localSwimmer.terms.join(', ')}], email: ${localSwimmer.email || 'none'}, phone: ${localSwimmer.phone || 'none'}`);
                            }

                            updatedCount++;
                        }
                    }
                    
                    // Osveži podatke iz baze za posodobljene plavalce
                    if (existingSwimmersToUpdate.length > 0) {
// console.log('Refreshing swimmers data from database...');
                        const { data: refreshedSwimmers, error: refreshError } = await supabase
                            .from('swimmers')
                            .select('*')
                            .in('id', existingSwimmersToUpdate.map(s => s.id));
                        
                        if (refreshError) {
                            console.error('Error refreshing swimmers:', refreshError);
                        } else if (refreshedSwimmers) {
                            // Posodobi lokalno stanje z osveženimi podatki
                            refreshedSwimmers.forEach(refreshedSwimmer => {
                                const localIndex = swimmers.findIndex(s => s.id === refreshedSwimmer.id);
                                if (localIndex !== -1) {
                                    swimmers[localIndex] = refreshedSwimmer;
// console.log(`Refreshed swimmer ${refreshedSwimmer.first_name} ${refreshedSwimmer.last_name} with terms: [${refreshedSwimmer.terms.join(', ')}]`);
// console.log(`Refreshed terms type:`, typeof refreshedSwimmer.terms);
// console.log(`Refreshed terms isArray:`, Array.isArray(refreshedSwimmer.terms));
// console.log(`Refreshed terms content:`, JSON.stringify(refreshedSwimmer.terms));
                                }
                            });
                        }
                    }
                    
                    updateSwimmerSelects();
                    updateSwimmersList();
                    
                    // Dodaj dodatno debugiranje
// console.log('After update - checking local swimmers:');
                    for (const updateData of existingSwimmersToUpdate) {
                        const localSwimmer = swimmers.find(s => s.id === updateData.id);
                        if (localSwimmer) {
// console.log(`Local swimmer ${localSwimmer.first_name} ${localSwimmer.last_name} has terms: [${localSwimmer.terms.join(', ')}]`);
                        }
                    }
                    
                    let message = '';
                    if (insertedCount > 0) message += `Uvoženih ${insertedCount} novih plavalcev. `;
                    if (updatedCount > 0) message += `Posodobljenih ${updatedCount} obstoječih plavalcev.`;
                    
                    // Dodaj informacijo o validaciji terminov
                    const totalSwimmers = newSwimmers.length;
                    const totalTerms = newSwimmers.reduce((sum, swimmer) => sum + swimmer.terms.length, 0);
                    const totalInvalidTerms = newSwimmers.reduce((sum, swimmer) => {
                        // Preštej neveljavne termine
                        const termsRaw = (swimmer.terms || []);
                        const invalidCount = termsRaw.length - (swimmer.terms || []).length;
                        return sum + invalidCount;
                    }, 0);
                    
                    message += `\n\nSkupaj uvoženih ${totalTerms} terminov za ${totalSwimmers} plavalcev.`;
                    
                    if (totalSwimmers === 0) {
                        message = 'Ni bilo plavalcev za uvoz. Preverite:\n' +
                                 '1. Ali CSV vsebuje stolpce first_name, last_name, terms\n' +
                                 '2. Ali so podatki pravilno oblikovani\n' +
                                 '3. Preverite konzolo za več podrobnosti';
                        console.error('Ni plavalcev za uvoz. Preveri CSV format.');
                    }
                    
                    alert(message || 'Ni bilo nič za uvoz.');
                }
                
            } catch (error) {
                console.error('Napaka pri branju CSV datoteke:', error);
                alert('Napaka pri branju CSV datoteke: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // CSV uvoz terminov
    elCsvTermsInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                // Prepoznaj separator iz prve vrstice
                const separator = detectSeparator(lines[0]);
                
                // Funkcija za razčlenjevanje z upoštevanjem narekovajev
                function parseCSVLine(line, sep) {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === sep && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result.map(field => field.replace(/^"|"$/g, ''));
                }
                
                const headers = parseCSVLine(lines[0], separator);
                
                const requiredHeaders = ['id', 'day', 'start_time', 'end_time', 'date_from', 'date_to'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    alert('CSV mora vsebovati vse zahtevane stolpce');
                    return;
                }

                const newTerms = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = parseCSVLine(lines[i], separator);
                        const id = values[headers.indexOf('id')];
                        const day = parseInt(values[headers.indexOf('day')]);
                        const start = values[headers.indexOf('start_time')];
                        const end = values[headers.indexOf('end_time')];
                        const dateFrom = parseDate(values[headers.indexOf('date_from')]);
                        const dateTo = parseDate(values[headers.indexOf('date_to')]);
                        
                        if (id && day && start && end && dateFrom && dateTo) {
                            newTerms.push({
                                id: id,
                                day: day,
                                start_time: start,
                                end_time: end,
                                date_from: dateFrom,
                                date_to: dateTo
                            });
                        }
                    }
                }

                if (newTerms.length > 0) {
                    // Uporabi upsert za zamenjavo obstoječih terminov
                    const { data, error } = await supabase
                        .from('terms')
                        .upsert(newTerms, { onConflict: 'id' })
                        .select();

                    if (error) {
                        console.error('Napaka pri uvažanju terminov:', error);
                        alert('Napaka pri uvažanju terminov. Preverite konzolo.');
                        return;
                    }

                    // Posodobi lokalno stanje
                    if (data) {
                        // Zamenjaj obstoječe termine z istim ID-jem
                        newTerms.forEach(newTerm => {
                            const existingIndex = TERMS.findIndex(t => t.id === newTerm.id);
                            if (existingIndex >= 0) {
                                TERMS[existingIndex] = newTerm;
                            } else {
                                TERMS.push(newTerm);
                            }
                        });
                    }
                    
                    updateTermSelects();
                    updateTermList();
                    updateSwimmersList();
                    alert(`Uvoženih ${newTerms.length} terminov`);
                }
                
            } catch (error) {
                console.error('Napaka pri branju CSV datoteke:', error);
                alert('Napaka pri branju CSV datoteke: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // CSV uvoz prisotnosti
    if (elCsvAttendanceInput) {
        elCsvAttendanceInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim() !== '');
                    
                    if (lines.length < 2) {
                        alert('CSV datoteka mora vsebovati vsaj glavo in eno vrstico podatkov.');
                        return;
                    }
                    
                    const separator = detectSeparator(lines[0]);
                    
                    // Funkcija za razčlenjevanje CSV vrstic z upoštevanjem narekovajev
                    function parseCSVLine(line, sep) {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === sep && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim());
                        return result.map(field => field.replace(/^"|"$/g, ''));
                    }
                    
                    const headers = parseCSVLine(lines[0], separator);
                    
                    const requiredHeaders = ['date', 'term_id', 'swimmer_id', 'status'];
                    if (!requiredHeaders.every(h => headers.includes(h))) {
                        alert('CSV mora vsebovati stolpce: date, term_id, swimmer_id, status');
                        return;
                    }
                    
                    let imported = 0;
                    let updated = 0;
                    let errors = 0;
                    
                    for (let i = 1; i < lines.length; i++) {
                        const values = parseCSVLine(lines[i], separator);
                        if (values.length < 4) continue;
                        
                        const date = values[headers.indexOf('date')].trim();
                        const termId = values[headers.indexOf('term_id')].trim();
                        const swimmerId = values[headers.indexOf('swimmer_id')].trim();
                        const status = values[headers.indexOf('status')].trim();
                        
                        if (!date || !termId || !swimmerId || !status) continue;
                        
                        // Validiraj status
                        if (!['present', 'absent', 'excused'].includes(status)) {
                            console.warn(`Neveljaven status '${status}' za datum ${date}, preskočeno.`);
                            errors++;
                            continue;
                        }
                        
                        // Preveri, ali zapis že obstaja
                        const { data: existing } = await supabase
                            .from('attendance')
                            .select('id')
                            .eq('date', date)
                            .eq('term_id', termId)
                            .eq('swimmer_id', swimmerId)
                            .single();
                        
                        if (existing) {
                            // Posodobi obstoječi zapis
                            const { error } = await supabase
                                .from('attendance')
                                .update({ 
                                    status: status,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existing.id);
                            
                            if (error) {
                                console.error(`Napaka pri posodabljanju prisotnosti za ${date}:`, error);
                                errors++;
                            } else {
                                updated++;
                            }
                        } else {
                            // Dodaj nov zapis
                            const { error } = await supabase
                                .from('attendance')
                                .insert({
                                    date: date,
                                    term_id: termId,
                                    swimmer_id: swimmerId,
                                    status: status,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                });
                            
                            if (error) {
                                console.error(`Napaka pri dodajanju prisotnosti za ${date}:`, error);
                                errors++;
                            } else {
                                imported++;
                            }
                        }
                    }
                    
                    // Osveži lokalno stanje
                    await loadData();
                    
                    alert(`Uvoz prisotnosti končan:\n- Dodanih zapisov: ${imported}\n- Posodobljenih zapisov: ${updated}\n- Napak: ${errors}`);
                    
                    // Ponastavi input
                    elCsvAttendanceInput.value = '';
                } catch (error) {
                    console.error('Napaka pri uvozu prisotnosti:', error);
                    alert('Napaka pri uvozu prisotnosti: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
    }

    // Funkcija za obnovitev prisotnosti iz prejšnjega meseca
    async function restoreAttendanceFromPreviousMonth() {
        if (!elRestoreAttendanceInfo) return;
        
        elRestoreAttendanceInfo.textContent = 'Obnavljanje prisotnosti...';
        
        try {
            // Določi prejšnji mesec
            const now = new Date();
            const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            const monthStart = previousMonth.toISOString().split('T')[0];
            const monthEnd = previousMonthEnd.toISOString().split('T')[0];
            
            // Poišči termin "tor-06:15-07:30"
            const termId = 'tor-06:15-07:30';
            const term = TERMS.find(t => t.id === termId);
            
            if (!term) {
                elRestoreAttendanceInfo.textContent = `Napaka: Termin ${termId} ne obstaja v bazi.`;
                return;
            }
            
            // Poišči vse zapise prisotnosti za ta termin in mesec
            const { data: attendanceRecords, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('term_id', termId)
                .gte('date', monthStart)
                .lte('date', monthEnd);
            
            if (error) {
                throw error;
            }
            
            if (!attendanceRecords || attendanceRecords.length === 0) {
                elRestoreAttendanceInfo.innerHTML = `
                    <strong>Ni najdenih zapisov prisotnosti</strong> za termin ${termId} v mesecu ${previousMonth.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })}.
                    <br><br>
                    <strong>Možnosti za obnovitev:</strong>
                    <br>1. Uporabite Supabase Point-in-Time Recovery v Supabase Dashboardu
                    <br>2. Uvozite prisotnost iz CSV datoteke (če imate backup)
                    <br>3. Preverite SQL skripto: <code>SQL/restore_attendance_tor_06_15.sql</code>
                `;
                return;
            }
            
            // Zapisi že obstajajo - osveži lokalno stanje
            await loadData();
            
            elRestoreAttendanceInfo.innerHTML = `
                <strong>✅ Najdenih zapisov: ${attendanceRecords.length}</strong>
                <br>Prisotnost za termin ${termId} v mesecu ${previousMonth.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })} je že v bazi.
                <br>Podatki so bili osveženi.
            `;
            
        } catch (error) {
            console.error('Napaka pri obnavljanju prisotnosti:', error);
            elRestoreAttendanceInfo.textContent = 'Napaka pri obnavljanju prisotnosti: ' + error.message;
        }
    }

    if (elRestoreAttendanceBtn) {
        elRestoreAttendanceBtn.addEventListener('click', restoreAttendanceFromPreviousMonth);
    }

    // CSV uvoz vadnin
    if (elCsvFeesInput) {
        elCsvFeesInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    // Prepoznaj separator iz prve vrstice
                    const separator = detectSeparator(lines[0]);
                    
                    // Funkcija za razčlenjevanje z upoštevanjem narekovajev
                    function parseCSVLine(line, sep) {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === sep && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim());
                        return result.map(field => field.replace(/^"|"$/g, ''));
                    }
                    
                    const headers = parseCSVLine(lines[0], separator);
                    
                    const requiredHeaders = ['first_name', 'last_name', 'monthly_fee'];
                    if (!requiredHeaders.every(h => headers.includes(h))) {
                        alert('CSV mora vsebovati stolpce: first_name, last_name, monthly_fee (email in phone sta opcijska)');
                        return;
                    }
                    
                    // Preveri, ali CSV vsebuje opcijski stolpec za popust
                    const hasDiscountColumn = headers.includes('discount');

                    // Preberi izbrani mesec in leto iz dropdownov
                    const selectedMonth = elCsvFeesMonthSelect ? parseInt(elCsvFeesMonthSelect.value) : null;
                    const selectedYear = elCsvFeesYearSelect ? parseInt(elCsvFeesYearSelect.value) : null;
                    
                    if (!selectedMonth || !selectedYear || isNaN(selectedMonth) || isNaN(selectedYear)) {
                        alert('Prosim izberite mesec in leto za uvoz vadnin');
                        return;
                    }
                    
                    // Mesec v bazi je 1-based (1=Januar, 12=December), vendar v JavaScriptu je 0-based
                    // Zato uporabimo selectedMonth direktno (ker je že 1-based)
                    const month = selectedMonth;
                    const year = selectedYear;
                    
// console.log('🔍 Debugging month parsing:');
// console.log('- selectedMonth:', selectedMonth);
// console.log('- selectedYear:', selectedYear);
// console.log('- month (za bazo):', month);
// console.log('- year:', year);

                    const importedFees = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) {
                            const values = parseCSVLine(lines[i], separator);
                            const firstName = values[headers.indexOf('first_name')];
                            const lastName = values[headers.indexOf('last_name')];
                            const amount = parseFloat(values[headers.indexOf('monthly_fee')]);
                            
                            // Preberi popust, če obstaja stolpec
                            let discount = 0;
                            if (hasDiscountColumn) {
                                const discountValue = values[headers.indexOf('discount')];
                                discount = discountValue ? parseFloat(discountValue) || 0 : 0;
                            }
                            
                            // Preberi vse opcijske podatke
                            const email = headers.includes('email') ? (values[headers.indexOf('email')] || '').trim() : '';
                            const phone = headers.includes('phone') ? (values[headers.indexOf('phone')] || '').trim() : '';
                            const address = headers.includes('address') ? (values[headers.indexOf('address')] || '').trim() : '';
                            const postalCode = headers.includes('postal_code') ? (values[headers.indexOf('postal_code')] || '').trim() : '';
                            
                            if (firstName && lastName && !isNaN(amount)) {
                                // Poišči plavalca po imenu in priimku
                                const swimmer = swimmers.find(s => 
                                    !s.is_deleted && 
                                    s.first_name.toLowerCase() === firstName.toLowerCase() && 
                                    s.last_name.toLowerCase() === lastName.toLowerCase()
                                );
                                
                                if (swimmer) {
                                    const newFee = {
                                        swimmer_id: swimmer.id,
                                        month: month,
                                        year: year,
                                        monthly_fee: amount,
                                        discount: discount
                                    };
                                    
// console.log(`📝 Ustvarjam vadnino za ${firstName} ${lastName}:`, newFee);
                                    
                                    // Posodobi plavalca z novimi podatki, če so podani
                                    if (email || phone || address || postalCode) {
                                        const updateData = {};
                                        if (email && isValidEmail(email)) {
                                            updateData.email = email;
                                        }
                                        if (phone && isValidPhone(phone)) {
                                            updateData.phone = phone;
                                        }
                                        if (address) {
                                            updateData.address = address;
                                        }
                                        if (postalCode) {
                                            updateData.postal_code = postalCode;
                                        }
                                        
                                        if (Object.keys(updateData).length > 0) {
                                            try {
                                                await supabase
                                                    .from('swimmers')
                                                    .update(updateData)
                                                    .eq('id', swimmer.id);
                                                
                                                // Posodobi lokalno stanje
                                                Object.assign(swimmer, updateData);
// console.log(`📝 Posodobljen plavalec ${firstName} ${lastName} z novimi podatki:`, updateData);
                                            } catch (error) {
                                                console.error(`Napaka pri posodabljanju plavalca ${firstName} ${lastName}:`, error);
                                            }
                                        }
                                    }
                                    
                                    importedFees.push(newFee);
                                } else {
                                    console.warn(`Plavalec ni bil najden: ${firstName} ${lastName}`);
                                }
                            }
                        }
                    }

                    if (importedFees.length > 0) {
                        // Ustvari vadnine za vse prihodnje mesece v letu
                        // To zagotavlja, da enkrat uvožene vadnine veljajo za vse prihodnje mesece
                        const futureFees = [];
                        const currentDate = new Date();
                        let currentMonth = currentDate.getMonth();
                        const currentYear = currentDate.getFullYear();
                        
                        // Varnostno preverjanje currentMonth
                        if (currentMonth < 0 || currentMonth > 11) {
                            console.error(`❌ Neveljaven currentMonth iz Date(): ${currentMonth}`);
                            currentMonth = new Date().getMonth(); // Poskusi znova
                            if (currentMonth < 0 || currentMonth > 11) {
                                alert('Napaka: Sistemski datum ni veljaven. Kontaktirajte administratorja.');
                                return;
                            }
                        }
                        
                        // Določi, od katerega meseca naprej naj veljajo nove vadnine
                        // month je 1-based (1=Januar, 12=December), currentMonth je 0-based (0=Januar, 11=December)
                        let startMonth0Based, startYear;
                        const month0Based = month - 1; // Pretvori v 0-based za primerjavo
                        
                        // Vedno uporabi izbrani mesec in leto iz dropdown-a (ne glede na to, ali je v preteklosti)
                        startMonth0Based = month0Based; // 0-based za zanko
                        startYear = year;
                        
                        // Ustvari vadnine za vse mesece od startMonth do konca leta
// console.log(`Creating fees for months ${startMonth0Based} to ${11} (${startMonth0Based + 1} to ${12} in human-readable) in year ${startYear}`);
                        
                        // Validacija startMonth
                        if (startMonth0Based < 0 || startMonth0Based > 11) {
                            console.error(`❌ Neveljaven startMonth: ${startMonth0Based}`);
                            alert(`Napaka: Neveljaven začetni mesec: ${startMonth0Based}`);
                            return;
                        }
                        
                        for (let m = startMonth0Based; m < 12; m++) {
                            // Dodatna validacija v zanki
                            if (m < 0 || m > 11) {
                                console.error(`❌ Neveljaven mesec v zanki: ${m}`);
                                alert(`Napaka: Neveljaven mesec v zanki: ${m}`);
                                return;
                            }
                            
                            for (const fee of importedFees) {
                                // m je 0-based (0=Januar, 11=December)
                                // Baza pričakuje 1-based (1=Januar, 12=December)
                                const dbMonth = m + 1; // Pretvori iz 0-based v 1-based
                                const newFee = {
                                    swimmer_id: fee.swimmer_id,
                                    month: dbMonth, // 1-based za bazo
                                    year: startYear,
                                    monthly_fee: fee.monthly_fee,
                                    discount: m === startMonth0Based ? fee.discount : 0 // Popust samo za začetni mesec
                                };
                                
// console.log(`🔍 Loop validation - m: ${m}, newFee.month: ${newFee.month}, type: ${typeof newFee.month}`);
                                
                                // Dvojna validacija pred dodajanjem (mesec je sedaj 1-based: 1-12)
                                if (newFee.month < 1 || newFee.month > 12) {
                                    console.error(`❌ KRITIČNA NAPAKA: Poskus dodajanja vadnine z neveljavnim mesecem ${newFee.month}`);
                                } else {
                                    futureFees.push(newFee);
                                }
                            }
                        }
                        
                        // Če je startYear trenutno leto, dodaj tudi za naslednje leto
                        if (startYear === currentYear) {
// console.log(`Creating fees for months 0 to 11 (1 to 12 in human-readable) in year ${startYear + 1}`);
                            for (let m = 0; m < 12; m++) {
                                // Validacija meseca v zanki za naslednje leto
                                if (m < 0 || m > 11) {
                                    console.error(`❌ Neveljaven mesec za naslednje leto: ${m}`);
                                    alert(`Napaka: Neveljaven mesec za naslednje leto: ${m}`);
                                    return;
                                }
                                
// console.log(`📅 Ustvarjam vadnine za mesec ${m} (${m + 1} v človeškem formatu) v letu ${startYear + 1}`);
                                
                                for (const fee of importedFees) {
                                    // m je 0-based (0=Januar, 11=December)
                                    // Baza pričakuje 1-based (1=Januar, 12=December) - preveri constraint v bazi!
                                    const dbMonth = m + 1; // Pretvori iz 0-based v 1-based
                                    const newFee = {
                                        swimmer_id: fee.swimmer_id,
                                        month: dbMonth, // 1-based za bazo
                                        year: startYear + 1,
                                        monthly_fee: fee.monthly_fee,
                                        discount: 0 // Brez popusta za prihodnje mesece
                                    };
                                    
// console.log(`🔍 Loop validation (next year) - m: ${m}, newFee.month: ${newFee.month}, type: ${typeof newFee.month}`);
                                    
                                    // Dvojna validacija pred dodajanjem (mesec je sedaj 1-based: 1-12)
                                    if (newFee.month < 1 || newFee.month > 12) {
                                        console.error(`❌ KRITIČNA NAPAKA: Poskus dodajanja vadnine z neveljavnim mesecom ${newFee.month} za naslednje leto`);
                                    } else {
                                        futureFees.push(newFee);
                                    }
                                }
                            }
                        }
                        
                        // Validacija vseh vadnin pred uvozom
                        const validFees = futureFees.filter(fee => {
                            // Mesec je sedaj 1-based (1-12), zato preverjamo to
                            if (fee.month < 1 || fee.month > 12) {
                                console.error(`❌ Odstranjujem neveljavno vadnino z mesecem ${fee.month} za plavalca ${fee.swimmer_id}`);
                                return false;
                            }
                            return true;
                        });
                        
                        if (validFees.length !== futureFees.length) {
                            const invalidCount = futureFees.length - validFees.length;
                            console.warn(`⚠️ Odstranjenih ${invalidCount} neveljavnih vadnin z neveljavnimi meseci`);
                        }
                        
                        // Uvozi vadnine v bazo za vse prihodnje mesece
                        
                        // Dodatna validacija pred upsert - preveri vsako vadnino posebej
                        let hasInvalidFees = false;
                        validFees.forEach((fee, index) => {
                            // Mesec je 1-based (1-12), ne 0-based (0-11)
                            if (fee.month < 1 || fee.month > 12) {
                                console.error(`❌ KRITIČNA NAPAKA: Vadnina ${index} ima neveljaven mesec ${fee.month}:`, fee);
                                hasInvalidFees = true;
                            } else {
// console.log(`✅ Vadnina ${index}: mesec ${fee.month} za plavalca ${fee.swimmer_id}`);
                            }
                        });
                        
                        if (hasInvalidFees) {
                            console.error('❌ KRITIČNA NAPAKA: Najdenih neveljavnih vadnin pred upsert!');
                            alert('Napaka: Najdenih neveljavnih vadnin pred uvozom. Preverite konzolo.');
                            return;
                        }
                        
                        if (validFees.length === 0) {
                            console.error('❌ NAPAKA: Ni vadnin za uvoz!');
                            alert('Napaka: Ni vadnin za uvoz!');
                            return;
                        }
                        
                        // Pošlji vadnine v bazo
                        const feesWithExplicitTypes = validFees.map(fee => ({
                            ...fee,
                            month: parseInt(fee.month, 10),
                            year: parseInt(fee.year, 10)
                        }));
                        
                        // Poskusi z raw SQL insert
                        let data, error;
                        try {
                            const rawInsertResult = await supabase.rpc('insert_monthly_fees', {
                                fees_data: feesWithExplicitTypes
                            });
                            
                            if (rawInsertResult.error) {
                                // Če SQL ne gre, poskusi z običajnim insert
                                console.error('❌ SQL napaka:', rawInsertResult.error);
                                // Ne nastavi data in error tukaj, pusti, da se izvede običajni insert
                            } else {
                                data = rawInsertResult.data;
                                error = null;
                                
                                // Preveri, ali je bilo vstavljenih vseh vadnin
                                if (data && data.success !== undefined) {
                                    if (data.errors > 0) {
                                        console.warn(`⚠️ Raw SQL: ${data.errors} napak pri vstavljanju`);
                                        
                                        // Če so VSE vadnine neuspešne, poskusi z običajnim insert
                                        if (data.errors === data.total || data.success === 0) {
                                            data = null; // Resetiraj data, da se izvede običajni insert
                                        } else {
                                            // Nekatere vadnine so bile vstavljene - prikaži rezultat
                                            if (currentSection === 'finance' && month === currentFinanceMonth && year === currentFinanceYear) {
                                                calculateFinanceData();
                                            }
                                            alert(`Uvoženih ${data.success} vadnin za prihodnje mesece (${data.errors} napak)`);
                                            return;
                                        }
                                    } else {
                                        // Vse vadnine so bile uspešno vstavljene
                                        if (currentSection === 'finance' && month === currentFinanceMonth && year === currentFinanceYear) {
                                            calculateFinanceData();
                                        }
                                        alert(`Uvoženih ${data.success} vadnin za prihodnje mesece`);
                                        return;
                                    }
                                } else {
                                    // Data je vrnil podatke, vendar brez success/errors - morda je uspešno
                                    if (data && Array.isArray(data) && data.length > 0) {
                                        console.log(`✅ Raw SQL: Vstavljenih ${data.length} vadnin`);
                                        if (currentSection === 'finance' && month === currentFinanceMonth && year === currentFinanceYear) {
                                            calculateFinanceData();
                                        }
                                        alert(`Uvoženih ${data.length} vadnin za prihodnje mesece`);
                                        return;
                                    } else {
                                        // Ni podatkov - poskusi z običajnim insert
                                        data = null;
                                    }
                                }
                            }
                        } catch (rawError) {
                            console.error('❌ Raw SQL izjema:', rawError);
                        }
                        
                        // Poskusi z batch processing, če je preveč vadnin
                        if (feesWithExplicitTypes.length > 100) {
// console.log('📦 Preveč vadnin za enkrat, poskušam z batch processing...');
                            
                            const batchSize = 50;
                            const batches = [];
                            for (let i = 0; i < feesWithExplicitTypes.length; i += batchSize) {
                                batches.push(feesWithExplicitTypes.slice(i, i + batchSize));
                            }
                            
// console.log(`📦 Delim v ${batches.length} batch-ev po ${batchSize} vadnin`);
                            
                            let allData = [];
                            let hasErrors = false;
                            
                            for (let i = 0; i < batches.length; i++) {
// console.log(`📦 Batch ${i + 1}/${batches.length} (${batches[i].length} vadnin)...`);
                                
                                try {
                                    const batchResult = await supabase
                                        .from('swimmer_monthly_fees')
                                        .insert(batches[i])
                                        .select();
                                    
                                    if (batchResult.error) {
                                        console.error(`❌ Batch ${i + 1} ni uspel:`, batchResult.error);
                                        hasErrors = true;
                                        break;
                                    } else {
// console.log(`✅ Batch ${i + 1} uspešen: ${batchResult.data.length} vadnin`);
                                        allData = allData.concat(batchResult.data);
                                    }
                                } catch (batchError) {
                                    console.error(`❌ Batch ${i + 1} izjema:`, batchError);
                                    hasErrors = true;
                                    break;
                                }
                            }
                            
                            if (!hasErrors) {
                                data = allData;
                                error = null;
// console.log(`✅ Vsi batch-i uspešni: ${data.length} vadnin`);
                            } else {
// console.log('🔄 Batch processing ni uspel, poskušam z običajnim insert...');
                                const insertResult = await supabase
                                    .from('swimmer_monthly_fees')
                                    .insert(feesWithExplicitTypes)
                                    .select();
                                
                                data = insertResult.data;
                                error = insertResult.error;
                            }
                        } else {
                            const insertResult = await supabase
                                .from('swimmer_monthly_fees')
                                .insert(feesWithExplicitTypes)
                                .select();
                            
                            data = insertResult.data;
                            error = insertResult.error;
                        }
                        
                        if (error && error.code === '23505') { // Unique constraint violation
// console.log('🔄 Insert ni uspel zaradi duplikatov, poskušam z upsert...');
                            const upsertResult = await supabase
                                .from('swimmer_monthly_fees')
                                .upsert(feesWithExplicitTypes, { 
                                    onConflict: 'swimmer_id,month,year' 
                                })
                                .select();
                            
                            data = upsertResult.data;
                            error = upsertResult.error;
                            
                        }

                        if (error) {
                            console.error('❌ Napaka pri uvažanju vadnin:', error);
                            
                            // Preveri, ali gre za constraint violation
                            if (error.code === '23514' && error.message.includes('swimmer_monthly_fees_month_check')) {
                                console.error('❌ Napaka: Neveljaven mesec v podatkih');
                                
                                // Preveri integriteto baze
                                const integrityCheck = await checkDatabaseIntegrity();
                                if (integrityCheck.status === 'corrupted') {
                                    const shouldClean = confirm(`Najdenih ${integrityCheck.invalid} neveljavnih vadnin v bazi.\n\nTo lahko povzroča napake pri uvozu.\n\nAli želite, da počistim neveljavne vadnine?`);
                                    if (shouldClean) {
                                        await clearInvalidFees();
                                        alert('Neveljavne vadnine so bile počiščene. Poskusite ponovno uvožiti CSV datoteko.');
                                    }
                                } else {
                                    alert('Napaka pri uvažanju vadnin: Neveljaven mesec v podatkih.\n\nPreverite, ali so meseci v CSV datoteki pravilni (1-12).\n\nPreverite konzolo za več podrobnosti.');
                                }
                            } else {
                                alert('Napaka pri uvažanju vadnin. Preverite konzolo.');
                            }
                            return;
                        }

// console.log('✅ Uspešno uvoženih vadnin:', data);
                        
                        // Izračunaj število mesecev na podlagi podatkov
                        let totalMonths = 0;
                        if (data && data.length > 0) {
                            // Poišči različne mesece/leta
                            const uniqueMonths = new Set();
                            data.forEach(fee => {
                                const key = `${fee.month}/${fee.year}`;
                                uniqueMonths.add(key);
                            });
                            totalMonths = uniqueMonths.size;
                        }
                        
                        const startMonthDisplay = startMonth0Based + 1;
                        alert(`Uvoženih ${data ? data.length : 0} vadnin za ${totalMonths} prihodnjih mesecev (od ${startMonthDisplay}/${startYear} naprej)`);
                        
                        // Osveži finance sekcijo, če je prikazana in če se vadnine uvozi za isti mesec/leto kot prikazan finance summary
                        if (currentSection === 'finance' && month === currentFinanceMonth && year === currentFinanceYear) {
                            calculateFinanceData();
                        }
                    } else {
                        alert('Ni bilo mogoče uvožiti nobene vadnine. Preverite, ali so imena plavalcev pravilna.');
                    }
                    
                } catch (error) {
                    console.error('Napaka pri branju CSV datoteke:', error);
                    alert('Napaka pri branju CSV datoteke: ' + error.message);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // CSV izvoz - Povzetek udeležbe plavalcev
    elExportCsvBtn.addEventListener('click', async () => {
        // Popravi problem z meseci - exportMonthSelect vsebuje 0-based vrednosti
        const month = parseInt(elExportMonthSelect.value) + 1; // Pretvori iz 0-based v 1-based
        const year = parseInt(elExportYearSelect.value);
        
        if (month === undefined || year === undefined) {
            alert('Prosim izberite mesec in leto');
            return;
        }

        try {
// console.log(`🔍 Izvoz povzetka udeležbe za mesec ${month}/${year}...`);
            
            // Pridobi podatke o vadninah iz baze
            const swimmerFees = await getSwimmerFeesFromDB(month, year);
// console.log('✅ Pridobljene vadnine:', swimmerFees);
            
            // Osveži podatke o prisotnosti za izbrani mesec
            await loadAttendanceForMonth(year, month);
            
            // Izračunaj povzetek udeležbe (uporabi isto logiko kot na admin strani)
            const summaryData = calculateSwimmerSummaryData(year, month);
            
            // Ustvari CSV vsebino v obliki povzetka udeležbe plavalcev
            let csv = 'Plavalec,Email,Naslov,Pošta,Obiskani treningi,Možni treningi,Delež (%),Znesek vadnine (€)\n';
            
            // Filtriraj plavalce - izključi izbrisane, vključi tiste z prisotnostjo
            const rows = Object.entries(summaryData)
                .filter(([swimmerId, r]) => {
                    const swimmer = swimmers.find(s => s.id === swimmerId);
                    // Izključi izbrisane plavalce
                    if (swimmer && swimmer.is_deleted) return false;
                    // DODANO: Prikaži tudi plavalce brez dodeljenih terminov, če imajo prisotnost (r.att > 0)
                    // Izključi le plavalce brez možnih obiskov IN brez prisotnosti
                    return r.pos > 0 || r.att > 0;
                })
                .map(([swimmerId, r]) => r)
                .sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
            
            if (rows.length === 0) {
                csv += 'Ni plavalcev za izbrani mesec\n';
            } else {
                rows.forEach(r => {
                    const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
                    
                    // Poišči znesek vadnine za plavalca
                    const swimmer = swimmers.find(s => s.first_name === r.first && s.last_name === r.last);
                    let feeAmount = '0.00';
                    let email = '';
                    let address = '';
                    let postalCode = '';
                    if (swimmer) {
                        const termCount = getSwimmerSeasonTermLabels(swimmer).length;
                        const plan = getSwimmerPaymentPlan(swimmer.id, getAdminSeasonFilterId());
                        const feeData = swimmerFees[swimmer.id] || {
                            fee: getDefaultSwimmerFeeByTermCount(termCount, plan),
                            discount: 0
                        };
                        const finalFee = Math.max(0, feeData.fee - feeData.discount);
                        feeAmount = finalFee.toFixed(2);
                        email = swimmer.email || '';
                        address = swimmer.address || '';
                        postalCode = swimmer.postal_code || '';
                    }
                    
                    csv += `${r.first} ${r.last},${email},${address},${postalCode},${r.att},${r.pos},${pct},${feeAmount}\n`;
            });
        }
        
        // Prenesi CSV datoteko z BOM za pravilno podporo šumnikov
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
            link.setAttribute('download', `povzetek_udelezbe_${year}_${month}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
            
// console.log('✅ CSV izvoz povzetka udeležbe uspešno končan');
            
        } catch (error) {
            console.error('❌ Napaka pri izvozu CSV:', error);
            alert('Napaka pri izvozu povzetka: ' + error.message);
        }
    });



    // ===== Odjava =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Ali se res želite odjaviti?')) {
                await trainerAuth.logout();
                window.location.href = 'login.html';
            }
        });
    }

    // ===== Event listener za osvežitev povzetka trenerjev =====
    // Opomba: elRefreshTrainerSummaryBtn je bil zamenjan z navigacijskimi gumbi
    // Funkcionalnost je sedaj vključena v navigateTrainerSummaryMonth() funkciji

    // ===== Event listener za osvežitev opomb trenerjev =====
    // Opomba: elRefreshTrainerNotesBtn je bil zamenjan z navigacijskimi gumbi
    // Funkcionalnost je sedaj vključena v navigateTrainerNotesMonth() funkciji

    // ===== Event listener za osvežitev povzetka udeležbe plavalcev =====
    // Opomba: elRefreshSwimmerSummaryBtn je bil zamenjan z navigacijskimi gumbi
    // Funkcionalnost je sedaj vključena v navigateSwimmerSummaryMonth() funkciji

    // ===== Event listener za Finance sekcijo =====
    // Opomba: elRefreshFinanceBtn je bil zamenjan z navigacijskimi gumbi
    // Funkcionalnost je sedaj vključena v navigateFinanceMonth() funkciji

    if (elSaveCostsBtn) {
        elSaveCostsBtn.addEventListener('click', () => {
            saveCostSettings();
        });
    }

    document.getElementById('saveDefaultFeeSettingsBtn')?.addEventListener('click', () => {
        saveDefaultFeeSettingsFromForm();
        if (typeof refreshSwimmerFees === 'function') refreshSwimmerFees();
    });

    if (elSaveTermCostsBtn) {
        elSaveTermCostsBtn.addEventListener('click', () => {
            saveTermCosts();
        });
    }

    if (elSaveTrainerRatesBtn) {
        elSaveTrainerRatesBtn.addEventListener('click', () => {
            saveTrainerRates();
        });
    }
    
    // Event listenerji za navigacijo meseca pri postavkah trenerjev
    const elPrevTrainerRatesMonthBtn = document.getElementById("prevTrainerRatesMonthBtn");
    const elNextTrainerRatesMonthBtn = document.getElementById("nextTrainerRatesMonthBtn");
    const elCurrentTrainerRatesMonthBtn = document.getElementById("currentTrainerRatesMonthBtn");
    const elTrainerRatesMonthYearContainer = document.getElementById("trainerRatesMonthYearContainer");
    
    if (elPrevTrainerRatesMonthBtn) {
        elPrevTrainerRatesMonthBtn.addEventListener('click', () => {
            navigateTrainerRatesMonth('prev');
        });
    }
    
    if (elNextTrainerRatesMonthBtn) {
        elNextTrainerRatesMonthBtn.addEventListener('click', () => {
            navigateTrainerRatesMonth('next');
        });
    }
    
    if (elCurrentTrainerRatesMonthBtn) {
        elCurrentTrainerRatesMonthBtn.addEventListener('click', () => {
            goToCurrentTrainerRatesMonth();
        });
    }
    
    // Event listener za klik na container (odpre izbiro datuma)
    if (elTrainerRatesMonthYearContainer) {
        elTrainerRatesMonthYearContainer.addEventListener('click', () => {
            if (elTrainerRatesMonthYearInput) {
                elTrainerRatesMonthYearInput.showPicker();
            }
        });
    }
    
    // Event listener za spremembo meseca in leta pri postavkah trenerjev
    if (elTrainerRatesMonthYearInput) {
        elTrainerRatesMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            setAdminFinanceMonth(parseInt(month, 10), parseInt(year, 10), { updateHash: true });
        });
    }
    

    // Opomba: elRefreshSwimmerFeesBtn je bil zamenjan z navigacijskimi gumbi
    // Funkcionalnost je sedaj vključena v navigateSwimmerFeesMonth() funkciji
    
    // Event listenerji za navigacijo mesecev
    if (elPrevMonthBtn) {
        elPrevMonthBtn.addEventListener('click', () => navigateFinanceMonth('prev'));
    }
    if (elNextMonthBtn) {
        elNextMonthBtn.addEventListener('click', () => navigateFinanceMonth('next'));
    }
    if (elCurrentMonthBtn) {
        elCurrentMonthBtn.addEventListener('click', goToCurrentFinanceMonth);
    }
    // Event listener za klik na mesec/leto (finance)
    const monthYearContainer = document.getElementById('monthYearContainer');
// console.log('🔍 Event listenerji - monthYearContainer:', monthYearContainer);
// console.log('🔍 Event listenerji - elMonthYearInput:', elMonthYearInput);
    
    if (monthYearContainer) {
// console.log('✅ Dodajam event listener za monthYearContainer');
        monthYearContainer.addEventListener('click', (event) => {
// console.log('🖱️ Klik na monthYearContainer', event);
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentFinanceMonth, currentFinanceYear, (month, year) => {
                setAdminFinanceMonth(month, year, { updateHash: true });
            });
        });
    } else {
        console.error('❌ monthYearContainer ni najden');
    }
    if (elMonthYearInput) {
        elMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            setAdminFinanceMonth(parseInt(month, 10), parseInt(year, 10), { updateHash: true });
        });
    }
    
    // Event listenerji za navigacijo mesecev plavalcev
    if (elPrevSwimmerFeesMonthBtn) {
        elPrevSwimmerFeesMonthBtn.addEventListener('click', () => navigateSwimmerFeesMonth('prev'));
    }
    if (elNextSwimmerFeesMonthBtn) {
        elNextSwimmerFeesMonthBtn.addEventListener('click', () => navigateSwimmerFeesMonth('next'));
    }
    if (elCurrentSwimmerFeesMonthBtn) {
        elCurrentSwimmerFeesMonthBtn.addEventListener('click', goToCurrentSwimmerFeesMonth);
    }
    // Event listener za klik na mesec/leto (swimmer fees)
    const swimmerFeesMonthYearContainer = document.getElementById('swimmerFeesMonthYearContainer');
    if (swimmerFeesMonthYearContainer) {
        swimmerFeesMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentSwimmerFeesMonth, currentSwimmerFeesYear, (month, year) => {
                setAdminFinanceMonth(month, year, { updateHash: true });
            });
        });
    }
    if (elSwimmerFeesMonthYearInput) {
        elSwimmerFeesMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            setAdminFinanceMonth(parseInt(month, 10), parseInt(year, 10), { updateHash: true });
        });
    }
    
    // Event listener za izvoz vadnin
    const elExportFeesBtn = document.getElementById('exportFeesBtn');
    if (elExportFeesBtn) {
        elExportFeesBtn.addEventListener('click', () => {
            window.exportSwimmerFees();
        });
    }

    function updateAccountingReportMonthDisplay() {
        const el = document.getElementById('accountingReportMonthYearLabel');
        const visible = document.getElementById('accountingReportMonthVisibleLabel');
        const monthNames = ['Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
            'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'];
        const label = `${monthNames[currentAccountingReportMonth - 1]} ${currentAccountingReportYear}`;
        if (el) el.textContent = label;
        if (visible) visible.textContent = label;
    }

    function navigateAccountingReportMonth(dir) {
        navigateFinanceMonth(dir === 'prev' ? 'prev' : 'next');
    }

    function goToCurrentAccountingReportMonth() {
        goToCurrentFinanceMonth();
    }

    document.getElementById('prevAccountingReportMonthBtn')?.addEventListener('click', () => navigateAccountingReportMonth('prev'));
    document.getElementById('nextAccountingReportMonthBtn')?.addEventListener('click', () => navigateAccountingReportMonth('next'));
    document.getElementById('currentAccountingReportMonthBtn')?.addEventListener('click', goToCurrentAccountingReportMonth);
    document.getElementById('saveAccountingReportOrderBtn')?.addEventListener('click', () => saveAccountingReportOrder());
    document.getElementById('sortAccountingReportAlphaBtn')?.addEventListener('click', () => sortAccountingReportAlphabetically());
    document.getElementById('printAccountingReportBtn')?.addEventListener('click', () => downloadAccountingReportPdf());
    document.getElementById('accountingIncludeMembershipFee')?.addEventListener('change', async (e) => {
        await applyGlobalMembershipFeeToReport(e.target.checked === true);
    });

    document.getElementById('accountingReportEditorBox')?.addEventListener('click', e => {
        const up = e.target.closest('[data-acc-order-up]');
        const down = e.target.closest('[data-acc-order-down]');
        if (up) {
            moveAccountingReportRow(parseInt(up.getAttribute('data-acc-order-up'), 10), -1);
        } else if (down) {
            moveAccountingReportRow(parseInt(down.getAttribute('data-acc-order-down'), 10), 1);
        }
    });

    updateAccountingReportMonthDisplay();



    // Event listenerji za navigacijo mesecev - trainer summary
    const elPrevTrainerSummaryMonthBtn = document.getElementById('prevTrainerSummaryMonthBtn');
    const elNextTrainerSummaryMonthBtn = document.getElementById('nextTrainerSummaryMonthBtn');
    const elCurrentTrainerSummaryMonthBtn = document.getElementById('currentTrainerSummaryMonthBtn');
    const elTrainerSummaryMonthYearInput = document.getElementById('trainerSummaryMonthYearInput');
    const trainerSummaryMonthYearContainer = document.getElementById('trainerSummaryMonthYearContainer');
    
    if (elPrevTrainerSummaryMonthBtn) {
        elPrevTrainerSummaryMonthBtn.addEventListener('click', () => navigateTrainerSummaryMonth('prev'));
    }
    if (elNextTrainerSummaryMonthBtn) {
        elNextTrainerSummaryMonthBtn.addEventListener('click', () => navigateTrainerSummaryMonth('next'));
    }
    if (elCurrentTrainerSummaryMonthBtn) {
        elCurrentTrainerSummaryMonthBtn.addEventListener('click', goToCurrentTrainerSummaryMonth);
    }
    if (trainerSummaryMonthYearContainer) {
        trainerSummaryMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentTrainerSummaryMonth, currentTrainerSummaryYear, (month, year) => {
                currentTrainerSummaryMonth = month;
                currentTrainerSummaryYear = year;
                updateTrainerSummaryMonthDisplay();
                calculateTrainerSummaryData();
            });
        });
    }
    if (elTrainerSummaryMonthYearInput) {
        elTrainerSummaryMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentTrainerSummaryYear = parseInt(year);
            currentTrainerSummaryMonth = parseInt(month);
            updateTrainerSummaryMonthDisplay();
            calculateTrainerSummaryData();
        });
    }
    
    // Event listenerji za navigacijo mesecev - trainer hours
    const elPrevTrainerHoursMonthBtn = document.getElementById('prevTrainerHoursMonthBtn');
    const elNextTrainerHoursMonthBtn = document.getElementById('nextTrainerHoursMonthBtn');
    const elCurrentTrainerHoursMonthBtn = document.getElementById('currentTrainerHoursMonthBtn');
    const elTrainerHoursMonthYearInput = document.getElementById('trainerHoursMonthYearInput');
    const trainerHoursMonthYearContainer = document.getElementById('trainerHoursMonthYearContainer');
    
    if (elPrevTrainerHoursMonthBtn) {
        elPrevTrainerHoursMonthBtn.addEventListener('click', () => navigateTrainerHoursMonth('prev'));
    }
    if (elNextTrainerHoursMonthBtn) {
        elNextTrainerHoursMonthBtn.addEventListener('click', () => navigateTrainerHoursMonth('next'));
    }
    if (elCurrentTrainerHoursMonthBtn) {
        elCurrentTrainerHoursMonthBtn.addEventListener('click', goToCurrentTrainerHoursMonth);
    }
    if (trainerHoursMonthYearContainer) {
        trainerHoursMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentTrainerHoursMonth, currentTrainerHoursYear, (month, year) => {
                currentTrainerHoursMonth = month;
                currentTrainerHoursYear = year;
                updateTrainerHoursMonthDisplay();
                calculateTrainerHoursCostsData();
            });
        });
    }
    if (elTrainerHoursMonthYearInput) {
        elTrainerHoursMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentTrainerHoursYear = parseInt(year);
            currentTrainerHoursMonth = parseInt(month);
            updateTrainerHoursMonthDisplay();
            calculateTrainerHoursCostsData();
        });
    }
    
    // Event listenerji za navigacijo mesecev - trainer notes
    const elPrevTrainerNotesMonthBtn = document.getElementById('prevTrainerNotesMonthBtn');
    const elNextTrainerNotesMonthBtn = document.getElementById('nextTrainerNotesMonthBtn');
    const elCurrentTrainerNotesMonthBtn = document.getElementById('currentTrainerNotesMonthBtn');
    const elTrainerNotesMonthYearInput = document.getElementById('trainerNotesMonthYearInput');
    const trainerNotesMonthYearContainer = document.getElementById('trainerNotesMonthYearContainer');
    
    if (elPrevTrainerNotesMonthBtn) {
        elPrevTrainerNotesMonthBtn.addEventListener('click', () => navigateTrainerNotesMonth('prev'));
    }
    if (elNextTrainerNotesMonthBtn) {
        elNextTrainerNotesMonthBtn.addEventListener('click', () => navigateTrainerNotesMonth('next'));
    }
    if (elCurrentTrainerNotesMonthBtn) {
        elCurrentTrainerNotesMonthBtn.addEventListener('click', goToCurrentTrainerNotesMonth);
    }
    if (trainerNotesMonthYearContainer) {
        trainerNotesMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentTrainerNotesMonth, currentTrainerNotesYear, (month, year) => {
                currentTrainerNotesMonth = month;
                currentTrainerNotesYear = year;
                updateTrainerNotesMonthDisplay();
                calculateTrainerNotesData();
            });
        });
    }
    if (elTrainerNotesMonthYearInput) {
        elTrainerNotesMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentTrainerNotesYear = parseInt(year);
            currentTrainerNotesMonth = parseInt(month);
            updateTrainerNotesMonthDisplay();
            calculateTrainerNotesData();
        });
    }
    
    // Event listenerji za navigacijo mesecev - swimmer summary
    const elPrevSwimmerSummaryMonthBtn = document.getElementById('prevSwimmerSummaryMonthBtn');
    const elNextSwimmerSummaryMonthBtn = document.getElementById('nextSwimmerSummaryMonthBtn');
    const elCurrentSwimmerSummaryMonthBtn = document.getElementById('currentSwimmerSummaryMonthBtn');
    const elSwimmerSummaryMonthYearInput = document.getElementById('swimmerSummaryMonthYearInput');
    const swimmerSummaryMonthYearContainer = document.getElementById('swimmerSummaryMonthYearContainer');
    
    if (elPrevSwimmerSummaryMonthBtn) {
        elPrevSwimmerSummaryMonthBtn.addEventListener('click', () => navigateSwimmerSummaryMonth('prev'));
    }
    if (elNextSwimmerSummaryMonthBtn) {
        elNextSwimmerSummaryMonthBtn.addEventListener('click', () => navigateSwimmerSummaryMonth('next'));
    }
    if (elCurrentSwimmerSummaryMonthBtn) {
        elCurrentSwimmerSummaryMonthBtn.addEventListener('click', goToCurrentSwimmerSummaryMonth);
    }
    if (swimmerSummaryMonthYearContainer) {
        swimmerSummaryMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentSwimmerSummaryMonth, currentSwimmerSummaryYear, (month, year) => {
                currentSwimmerSummaryMonth = month;
                currentSwimmerSummaryYear = year;
                updateSwimmerSummaryMonthDisplay();
                refreshSwimmerSummary();
            });
        });
    }
    if (elSwimmerSummaryMonthYearInput) {
        elSwimmerSummaryMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentSwimmerSummaryYear = parseInt(year);
            currentSwimmerSummaryMonth = parseInt(month);
            updateSwimmerSummaryMonthDisplay();
            refreshSwimmerSummary();
        });
    }
    
    // Event listenerji za navigacijo mesecev - OLY swimmer summary
    const elPrevOlySwimmerSummaryMonthBtn = document.getElementById('prevOlySwimmerSummaryMonthBtn');
    const elNextOlySwimmerSummaryMonthBtn = document.getElementById('nextOlySwimmerSummaryMonthBtn');
    const elCurrentOlySwimmerSummaryMonthBtn = document.getElementById('currentOlySwimmerSummaryMonthBtn');
    const elOlySwimmerSummaryMonthYearInput = document.getElementById('olySwimmerSummaryMonthYearInput');
    const olySwimmerSummaryMonthYearContainer = document.getElementById('olySwimmerSummaryMonthYearContainer');
    
    if (elPrevOlySwimmerSummaryMonthBtn) {
        elPrevOlySwimmerSummaryMonthBtn.addEventListener('click', () => navigateOlySwimmerSummaryMonth('prev'));
    }
    if (elNextOlySwimmerSummaryMonthBtn) {
        elNextOlySwimmerSummaryMonthBtn.addEventListener('click', () => navigateOlySwimmerSummaryMonth('next'));
    }
    if (elCurrentOlySwimmerSummaryMonthBtn) {
        elCurrentOlySwimmerSummaryMonthBtn.addEventListener('click', goToCurrentOlySwimmerSummaryMonth);
    }
    if (olySwimmerSummaryMonthYearContainer) {
        olySwimmerSummaryMonthYearContainer.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            createCustomDatePicker(currentOlySwimmerSummaryMonth, currentOlySwimmerSummaryYear, (month, year) => {
                currentOlySwimmerSummaryMonth = month;
                currentOlySwimmerSummaryYear = year;
                updateOlySwimmerSummaryMonthDisplay();
                refreshOlySwimmerSummary();
            });
        });
    }
    if (elOlySwimmerSummaryMonthYearInput) {
        elOlySwimmerSummaryMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentOlySwimmerSummaryYear = parseInt(year);
            currentOlySwimmerSummaryMonth = parseInt(month);
            updateOlySwimmerSummaryMonthDisplay();
            refreshOlySwimmerSummary();
        });
    }

    // ===== Event listener za izbiro plavalca pri dodeljevanju terminov =====
    document.getElementById('swimmerSearchInput')?.addEventListener('input', () => {
        refreshSwimmerAssignSelect();
    });
    if (elSwimmerSelect) {
        elSwimmerSelect.addEventListener('change', () => {
            const selected = swimmers.find(s => s.id === elSwimmerSelect.value);
            const searchInput = document.getElementById('swimmerSearchInput');
            if (searchInput && selected) {
                searchInput.value = personDisplayName(selected);
            }
            updateTermSelectForSwimmer(elSwimmerSelect.value);
        });
    }

    document.getElementById('trainerSearchInput')?.addEventListener('input', () => {
        refreshTrainerAssignSelect();
    });
    // ===== Event listener za izbiro trenerja pri dodeljevanju terminov =====
    if (elTrainerSelect) {
        elTrainerSelect.addEventListener('change', () => {
            const selected = trainers.find(t => t.id === elTrainerSelect.value);
            const searchInput = document.getElementById('trainerSearchInput');
            if (searchInput && selected) {
                searchInput.value = personDisplayName(selected);
            }
            updateTermSelectForTrainer(elTrainerSelect.value);
        });
    }

    // ===== Funkcije za povzetek trenerjev =====
    function calculateTrainerSummaryData() {
        const month = currentTrainerSummaryMonth;
        const year = currentTrainerSummaryYear;
// console.log('🔍 calculateTrainerSummaryData - mesec:', month, 'leto:', year);
        
        if (month === undefined || year === undefined) {
            elTrainerSummaryBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        // month je 1-based, zato ga pretvorimo v 0-based za JavaScript Date
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        

        
        let summary = '<table><thead><tr><th>Trener</th><th>Skupaj</th><th>Prisoten</th><th>Odsoten</th></tr></thead><tbody>';
        
        const trainerStats = {};
        const processedTrainers = new Set(); // Set za sledenje trenerjem, ki so že bili obravnavani
        const seasonTermIds = getAdminSeasonTermIds();
        
        // Pridobi samo aktivne termine (ne potekle)
        const activeTerms = getActiveTerms();
        const activeTermIds = new Set(activeTerms.map(t => t.id));
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
                if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                // Preveri, ali je termin aktiven (ne potekel)
                if (!activeTermIds.has(term.id)) {
                    return; // Preskoči deaktivirane termine
                }
                
                if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                    // Preveri, ali je termin deaktiviran za ta datum
                    const termStatusForDate = getTermStatus(d, term.id);
                    if (termStatusForDate.status === "inactive") {
                        return; // Preskoči deaktivirane termine za ta datum
                    }
                    
                    // Poišči trenerje za ta termin (redno dodeljeni)
                    const trainersForTerm = trainers.filter(t => 
                        t.terms && t.terms.includes(term.id) && !t.is_deleted
                    );
                    
                    // Dodaj redno dodeljene trenerje (samo aktivni)
                    trainersForTerm.forEach(trainer => {
                        // Preveri, ali je trener deaktivirán
                        if (trainer.is_deleted) {
                            return; // Preskoči deaktivirane trenerje
                        }
                        
                        const key = `${trainer.id}`;
                        if (!trainerStats[key]) {
                            trainerStats[key] = {
                                trainer: trainer,
                                total: 0,
                                present: 0,
                                absent: 0,
                                absentDates: [] // Shrani datume odsotnosti
                            };
                        }
                        
                        trainerStats[key].total++;
                        processedTrainers.add(trainer.id); // Dodaj trenerja v processedTrainers
                        
                        const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                        if (trainerAtt) {
                            if (trainerAtt.present === true) {
                                trainerStats[key].present++;
                            } else if (trainerAtt.present === false) {
                                trainerStats[key].absent++;
                                // Shrani datum odsotnosti
                                if (!trainerStats[key].absentDates.includes(isoDate)) {
                                    trainerStats[key].absentDates.push(isoDate);
                                }
                                
                                // Preveri, če je v opombi omenjen nadomestni trener
                                if (trainerAtt.note && trainerAtt.note.trim()) {
                                    // Preveri format z ID-jem v oklepajih ali brez (format: "Nadomešča: Ime Priimek")
                                    const substituteNoteMatch = trainerAtt.note.match(/Nadomešča:\s*(.+)/i);
                                    if (substituteNoteMatch) {
                                        const substituteName = substituteNoteMatch[1].trim();
                                        
                                        // Poskusi najti trenerja po ID-ju (če je v opombi)
                                        const substituteIdMatch = substituteName.match(/\(([a-f0-9-]{36})\)/);
                                        let substituteTrainer = null;
                                        
                                        if (substituteIdMatch) {
                                            // Format z ID-jem
                                            const substituteTrainerId = substituteIdMatch[1];
                                            substituteTrainer = trainers.find(t => t.id === substituteTrainerId && !t.is_deleted);
                                        } else {
                                            // Format brez ID-ja - poišči po imenu in priimku
                                            substituteTrainer = trainers.find(t => {
                                                const fullName = `${t.first_name} ${t.last_name}`;
                                                return fullName === substituteName && !t.is_deleted;
                                            });
                                        }
                                        
                                        if (substituteTrainer) {
                                            const substituteKey = `${substituteTrainer.id}`;
                                            
                                            if (!trainerStats[substituteKey]) {
                                                trainerStats[substituteKey] = {
                                                    trainer: substituteTrainer,
                                                    total: 0,
                                                    present: 0,
                                                    absent: 0,
                                                    absentDates: [] // Shrani datume odsotnosti
                                                };
                                            }
                                            
                                            trainerStats[substituteKey].total++;
                                            trainerStats[substituteKey].present++; // Šteje kot prisoten
                                            
                                            // Dodaj nadomestnega trenerja v processedTrainers, da se ne šteje dvakrat
                                            processedTrainers.add(substituteTrainer.id);
                                        }
                                    }
                                }
                            }
                        }
                    });
                    
                    // Dodaj nadomestne trenerje iz trainer_attendance (ki niso redno dodeljeni)
                    // SAMO če je termin aktiven (termStatusForDate je že preverjen zgoraj)
                    // IN SAMO če so še vedno navedeni v opombi originalnega trenerja
                    // IN SAMO če še niso bili obravnavani v prvi zanki (iz opombe originalnega trenerja)
                    if (activeTermIds.has(term.id) && trainerAttendance[isoDate]?.[term.id]) {
                        Object.keys(trainerAttendance[isoDate][term.id]).forEach(trainerId => {
                            // Preveri, če trener ni že vključen kot redno dodeljen
                            const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                            // Preveri, če trener ni že bil obravnavan v prvi zanki (iz opombe originalnega trenerja)
                            const alreadyProcessed = processedTrainers.has(trainerId);
                            
                            if (!isRegularlyAssigned && !alreadyProcessed) {
                                const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                                if (trainer && !trainer.is_deleted) {
                                    // Preveri, ali je trener še vedno naveden v opombi katerega koli originalnega trenerja
                                    const isStillSubstitute = trainersForTerm.some(originalTrainer => {
                                        const originalTrainerAtt = trainerAttendance[isoDate]?.[term.id]?.[originalTrainer.id];
                                        if (originalTrainerAtt && originalTrainerAtt.present === false && originalTrainerAtt.note) {
                                            const substituteNoteMatch = originalTrainerAtt.note.match(/Nadomešča:\s*(.+)/i);
                                            if (substituteNoteMatch) {
                                                const substituteName = substituteNoteMatch[1].trim();
                                                // Preveri, ali se ime ujema (z ali brez ID-ja)
                                                const fullName = `${trainer.first_name} ${trainer.last_name}`;
                                                if (substituteName === fullName) {
                                                    return true;
                                                }
                                                // Preveri tudi format z ID-jem
                                                const substituteIdMatch = substituteName.match(/\(([a-f0-9-]{36})\)/);
                                                if (substituteIdMatch && substituteIdMatch[1] === trainer.id) {
                                                    return true;
                                                }
                                            }
                                        }
                                        return false;
                                    });
                                    
                                    if (isStillSubstitute) {
                                        const key = `${trainer.id}`;
                                        if (!trainerStats[key]) {
                                            trainerStats[key] = {
                                                trainer: trainer,
                                                total: 0,
                                                present: 0,
                                                absent: 0,
                                                absentDates: [] // Shrani datume odsotnosti
                                            };
                                        }
                                        
                                        trainerStats[key].total++;
                                        processedTrainers.add(trainer.id); // Dodaj nadomestnega trenerja v processedTrainers
                                        
                                        const trainerAtt = trainerAttendance[isoDate][term.id][trainerId];
                                        if (trainerAtt) {
                                            if (trainerAtt.present === true) {
                                                trainerStats[key].present++;
                                            } else if (trainerAtt.present === false) {
                                                trainerStats[key].absent++;
                                                // Shrani datum odsotnosti
                                                if (!trainerStats[key].absentDates.includes(isoDate)) {
                                                    trainerStats[key].absentDates.push(isoDate);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
        
        // Dodaj debug informacije
// console.log('🔍 DEBUG: trainerStats:', trainerStats);
// console.log('🔍 DEBUG: trainerAttendance za september 2025:', trainerAttendance);
        
        // Dodatno: preveri vse trenerje iz trainer_attendance za ta mesec
        // in dodaj tiste, ki morda niso bili vključeni v zgornji logiki
        // SAMO za aktivne termine
        
        Object.keys(trainerAttendance).forEach(date => {
            const currentDate = new Date(date);
            if (currentDate >= startDate && currentDate <= endDate) {
                Object.keys(trainerAttendance[date]).forEach(termId => {
                    // Preveri, ali je termin aktiven (ne potekel)
                    if (!activeTermIds.has(termId)) {
                        return; // Preskoči deaktivirane termine
                    }
                    
                    Object.keys(trainerAttendance[date][termId]).forEach(trainerId => {
                        // Preveri, ali trener ni že bil obravnavan v prvi zanki
                        if (!processedTrainers.has(trainerId)) {
                            const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                            if (trainer && !trainer.is_deleted) {
                                // Preveri, ali je ta termin veljaven in aktiven
                                const term = TERMS.find(t => t.id === termId);
                                if (term && activeTermIds.has(term.id)) {
                                    const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
                                    if (term.day === dayOfWeek && date >= term.date_from && date <= term.date_to) {
                                        // Preveri, ali je termin deaktiviran za ta datum
                                        const termStatusForDate = getTermStatus(currentDate, term.id);
                                        if (termStatusForDate.status === "inactive") {
                                            return; // Preskoči deaktivirane termine za ta datum
                                        }
                                        
                                        // Preveri, ali je trener redno dodeljen temu terminu
                                        const trainersForTerm = trainers.filter(t => 
                                            t.terms && t.terms.includes(term.id) && !t.is_deleted
                                        );
                                        const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                                        
                                        // Če trener ni redno dodeljen, preveri, ali je še vedno naveden v opombi originalnega trenerja
                                        if (!isRegularlyAssigned) {
                                            const isStillSubstitute = trainersForTerm.some(originalTrainer => {
                                                const originalTrainerAtt = trainerAttendance[date]?.[termId]?.[originalTrainer.id];
                                                if (originalTrainerAtt && originalTrainerAtt.present === false && originalTrainerAtt.note) {
                                                    const substituteNoteMatch = originalTrainerAtt.note.match(/Nadomešča:\s*(.+)/i);
                                                    if (substituteNoteMatch) {
                                                        const substituteName = substituteNoteMatch[1].trim();
                                                        // Preveri, ali se ime ujema (z ali brez ID-ja)
                                                        const fullName = `${trainer.first_name} ${trainer.last_name}`;
                                                        if (substituteName === fullName) {
                                                            return true;
                                                        }
                                                        // Preveri tudi format z ID-jem
                                                        const substituteIdMatch = substituteName.match(/\(([a-f0-9-]{36})\)/);
                                                        if (substituteIdMatch && substituteIdMatch[1] === trainer.id) {
                                                            return true;
                                                        }
                                                    }
                                                }
                                                return false;
                                            });
                                            
                                            if (!isStillSubstitute) {
                                                return; // Preskoči trenerje, ki niso več navedeni v opombi
                                            }
                                        }
                                        
                                        // Termin je veljaven in aktiven, dodaj prisotnost
                                        const key = `${trainer.id}`;
                                        if (!trainerStats[key]) {
                                            trainerStats[key] = {
                                                trainer: trainer,
                                                total: 0,
                                                present: 0,
                                                absent: 0,
                                                absentDates: [] // Shrani datume odsotnosti
                                            };
                                        }
                                        
                                        trainerStats[key].total++;
                                        
                                        const trainerAtt = trainerAttendance[date][termId][trainerId];
                                        if (trainerAtt) {
                                            if (trainerAtt.present === true) {
                                                trainerStats[key].present++;
                                            } else if (trainerAtt.present === false) {
                                                trainerStats[key].absent++;
                                                // Shrani datum odsotnosti
                                                if (!trainerStats[key].absentDates.includes(date)) {
                                                    trainerStats[key].absentDates.push(date);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                });
            }
        });
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainerStats = Object.values(trainerStats)
            .filter(stat => !stat.trainer.is_deleted)
            .sort((a, b) => {
                // Najprej sortiraj po priimku
                const lastNameCompare = (a.trainer.last_name || '').localeCompare(b.trainer.last_name || '', 'sl');
                if (lastNameCompare !== 0) {
                    return lastNameCompare;
                }
                // Če so priimki enaki, sortiraj po imenu
                return (a.trainer.first_name || '').localeCompare(b.trainer.first_name || '', 'sl');
            });
        
        // Shrani trainerStats v globalno spremenljivko za dostop iz event listenerjev
        window.currentTrainerStats = trainerStats;
        
        // Prikaži rezultate (samo aktivni trenerji)
        sortedTrainerStats.forEach(stat => {
            const absentClickable = stat.absent > 0 
                ? `<td class="warn"><a href="#" class="absent-link" data-trainer-id="${stat.trainer.id}" data-trainer-name="${stat.trainer.first_name} ${stat.trainer.last_name}" style="color: inherit; text-decoration: underline; cursor: pointer;">${stat.absent}</a></td>`
                : `<td class="warn">${stat.absent}</td>`;
            summary += `
                <tr>
                    <td>${stat.trainer.first_name} ${stat.trainer.last_name}</td>
                    <td>${stat.total}</td>
                    <td class="ok">${stat.present}</td>
                    ${absentClickable}
                </tr>
            `;
        });
        
        summary += '</tbody></table>';
        
        // Preveri, ali so vsi trenerji deaktivirani
        if (sortedTrainerStats.length === 0) {
            summary = '<p class="muted">Ni podatkov o prisotnosti trenerjev za izbrani mesec</p>';
        }
        
        elTrainerSummaryBox.innerHTML = summary;
        
        // Dodaj event listenerje za klik na število odsotnosti
        elTrainerSummaryBox.querySelectorAll('.absent-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const trainerId = link.getAttribute('data-trainer-id');
                const trainerName = link.getAttribute('data-trainer-name');
                showTrainerAbsenceModal(trainerId, trainerName);
            });
        });
    }

    // ===== Funkcije za izračun ur in stroškov trenerjev =====
    async function calculateTrainerHoursCostsData() {
        const month = currentTrainerHoursMonth;
        const year = currentTrainerHoursYear;
// console.log('🔍 calculateTrainerHoursCostsData - mesec:', month, 'leto:', year);
        
        if (month === undefined || year === undefined) {
            elTrainerHoursCostsBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        // Ustvari datume za mesec
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        // Pridobi postavke trenerjev iz baze za trenutni mesec in leto
        const trainerRates = await getTrainerRatesFromDB(month, year);
        
        let summary = '<table class="trainer-hours-table"><thead><tr><th>Trener</th><th>Število terminov</th><th>Skupaj ur</th><th>Urna postavka</th><th>Skupni strošek</th></tr></thead><tbody>';
        
        const trainerStats = {};
        const processedTrainers = new Set();
        const hoursDetails = []; // Zbiraj detajle ur za modal
        const seasonTermIds = getAdminSeasonTermIds();
        
        // Pridobi samo aktivne termine (ne potekle)
        const activeTerms = getActiveTerms();
        const activeTermIds = new Set(activeTerms.map(t => t.id));
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
                if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                // Preveri, ali je termin aktiven (ne potekel)
                if (!activeTermIds.has(term.id)) {
                    return; // Preskoči deaktivirane termine
                }
                
                if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                    // Preveri, ali je termin deaktiviran za ta datum
                    const termStatusForDate = getTermStatus(d, term.id);
                    if (termStatusForDate.status === "inactive") {
                        return; // Preskoči deaktivirane termine za ta datum
                    }
                    
                    // Poišči trenerje za ta termin (redno dodeljeni)
                    const trainersForTerm = trainers.filter(t => 
                        t.terms && t.terms.includes(term.id) && !t.is_deleted
                    );
                    
                    // Izračunaj trajanje termina v urah
                    const startTime = new Date(`2000-01-01T${term.start_time}`);
                    const endTime = new Date(`2000-01-01T${term.end_time}`);
                    const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                    
                    // Dodaj redno dodeljene trenerje
                    trainersForTerm.forEach(trainer => {
                        const key = `${trainer.id}`;
                        if (!trainerStats[key]) {
                            trainerStats[key] = {
                                trainer: trainer,
                                sessions: 0,
                                totalHours: 0,
                                cost: 0
                            };
                        }
                        
                        // Preveri, ali je trener prisoten na ta dan
                        const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                        if (!trainerAtt || trainerAtt.present !== false) {
                            // Trener je prisoten (ali ni označen kot odsoten)
                            trainerStats[key].sessions += 1;
                            trainerStats[key].totalHours += durationHours;
                            processedTrainers.add(trainer.id);
                            
                            // Dodaj detajl SAMO če je termin aktiven
                            if (activeTermIds.has(term.id)) {
                                hoursDetails.push({
                                    date: isoDate,
                                    trainer: trainer,
                                    term: term,
                                    durationHours: durationHours,
                                    isSubstitute: false
                                });
                            }
                        } else if (trainerAtt.present === false) {
                            // Trener je odsoten, preveri nadomestnega trenerja
                            if (trainerAtt.note && trainerAtt.note.trim()) {
                                // Preveri format z ID-jem v oklepajih ali brez (format: "Nadomešča: Ime Priimek")
                                const substituteNoteMatch = trainerAtt.note.match(/Nadomešča:\s*(.+)/i);
                                if (substituteNoteMatch) {
                                    const substituteName = substituteNoteMatch[1].trim();
                                    
                                    // Poskusi najti trenerja po ID-ju (če je v opombi)
                                    const substituteIdMatch = substituteName.match(/\(([a-f0-9-]{36})\)/);
                                    let substituteTrainer = null;
                                    
                                    if (substituteIdMatch) {
                                        // Format z ID-jem
                                        const substituteTrainerId = substituteIdMatch[1];
                                        substituteTrainer = trainers.find(t => t.id === substituteTrainerId && !t.is_deleted);
                                    } else {
                                        // Format brez ID-ja - poišči po imenu in priimku
                                        substituteTrainer = trainers.find(t => {
                                            const fullName = `${t.first_name} ${t.last_name}`;
                                            return fullName === substituteName && !t.is_deleted;
                                        });
                                    }
                                    
                                    if (substituteTrainer) {
                                        const substituteKey = `${substituteTrainer.id}`;
                                        
                                        if (!trainerStats[substituteKey]) {
                                            trainerStats[substituteKey] = {
                                                trainer: substituteTrainer,
                                                sessions: 0,
                                                totalHours: 0,
                                                cost: 0
                                            };
                                        }
                                        
                                        trainerStats[substituteKey].sessions += 1;
                                        trainerStats[substituteKey].totalHours += durationHours;
                                        processedTrainers.add(substituteTrainer.id);
                                        
                                        // Dodaj detajl za nadomestnega trenerja SAMO če je termin aktiven
                                        if (activeTermIds.has(term.id)) {
                                            hoursDetails.push({
                                                date: isoDate,
                                                trainer: substituteTrainer,
                                                term: term,
                                                durationHours: durationHours,
                                                isSubstitute: true,
                                                originalTrainer: trainer
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    });
                    
                    // Dodaj nadomestne trenerje iz trainer_attendance (ki niso redno dodeljeni)
                    // SAMO če je termin aktiven (termStatusForDate je že preverjen zgoraj)
                    // IN SAMO če so še vedno navedeni v opombi originalnega trenerja
                    // IN SAMO če še niso bili dodani v hoursDetails
                    if (activeTermIds.has(term.id) && trainerAttendance[isoDate]?.[term.id]) {
                        Object.keys(trainerAttendance[isoDate][term.id]).forEach(trainerId => {
                            // Preveri, če trener ni že vključen kot redno dodeljen
                            const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                            if (!isRegularlyAssigned) {
                                // Preveri, ali je trener že dodan v hoursDetails za ta datum in termin
                                const alreadyAdded = hoursDetails.some(detail => 
                                    detail.date === isoDate && 
                                    detail.term.id === term.id && 
                                    detail.trainer.id === trainerId
                                );
                                
                                if (!alreadyAdded) {
                                    const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                                    if (trainer) {
                                        // Preveri, ali je trener še vedno naveden v opombi katerega koli originalnega trenerja
                                        const isStillSubstitute = trainersForTerm.some(originalTrainer => {
                                            const originalTrainerAtt = trainerAttendance[isoDate]?.[term.id]?.[originalTrainer.id];
                                            if (originalTrainerAtt && originalTrainerAtt.present === false && originalTrainerAtt.note) {
                                                const substituteNoteMatch = originalTrainerAtt.note.match(/Nadomešča:\s*(.+)/i);
                                                if (substituteNoteMatch) {
                                                    const substituteName = substituteNoteMatch[1].trim();
                                                    // Preveri, ali se ime ujema (z ali brez ID-ja)
                                                    const fullName = `${trainer.first_name} ${trainer.last_name}`;
                                                    if (substituteName === fullName) {
                                                        return true;
                                                    }
                                                    // Preveri tudi format z ID-jem
                                                    const substituteIdMatch = substituteName.match(/\(([a-f0-9-]{36})\)/);
                                                    if (substituteIdMatch && substituteIdMatch[1] === trainer.id) {
                                                        return true;
                                                    }
                                                }
                                            }
                                            return false;
                                        });
                                        
                                        if (isStillSubstitute) {
                                            const key = `${trainer.id}`;
                                            if (!trainerStats[key]) {
                                                trainerStats[key] = {
                                                    trainer: trainer,
                                                    sessions: 0,
                                                    totalHours: 0,
                                                    cost: 0
                                                };
                                            }
                                            
                                            const trainerAtt = trainerAttendance[isoDate][term.id][trainerId];
                                            if (trainerAtt && trainerAtt.present === true) {
                                                trainerStats[key].sessions += 1;
                                                trainerStats[key].totalHours += durationHours;
                                                processedTrainers.add(trainer.id);
                                                
                                                // Dodaj detajl SAMO če je termin aktiven
                                                if (activeTermIds.has(term.id)) {
                                                    hoursDetails.push({
                                                        date: isoDate,
                                                        trainer: trainer,
                                                        term: term,
                                                        durationHours: durationHours,
                                                        isSubstitute: true
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
        
        // Izračunaj stroške za vsakega trenerja
        let totalCost = 0;
        let totalSessions = 0;
        let totalHours = 0;
        
        Object.values(trainerStats).forEach(stat => {
            const ratePerSession = trainerRates[stat.trainer.id] || 25;
            stat.cost = calcTrainerCostFromSessions(stat.sessions, ratePerSession);
            totalCost += stat.cost;
            totalSessions += stat.sessions;
            totalHours += stat.totalHours;
        });
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainerStats = Object.values(trainerStats)
            .filter(stat => !stat.trainer.is_deleted)
            .sort((a, b) => {
                // Najprej sortiraj po priimku
                const lastNameCompare = (a.trainer.last_name || '').localeCompare(b.trainer.last_name || '', 'sl');
                if (lastNameCompare !== 0) {
                    return lastNameCompare;
                }
                // Če so priimki enaki, sortiraj po imenu
                return (a.trainer.first_name || '').localeCompare(b.trainer.first_name || '', 'sl');
        });
        
        // Prikaži rezultate
        sortedTrainerStats.forEach(stat => {
            const ratePerSession = trainerRates[stat.trainer.id] || 25;
            summary += `
                <tr>
                    <td>${stat.trainer.first_name} ${stat.trainer.last_name}</td>
                    <td class="trainer-hours-hours">${stat.sessions}</td>
                    <td class="trainer-hours-hours"><span class="trainer-hours-clickable" data-trainer-id="${stat.trainer.id}" style="cursor: pointer; text-decoration: underline; color: #007bff;" title="Klikni za prikaz detajlov">${stat.totalHours.toFixed(2)}h</span></td>
                    <td>${ratePerSession.toFixed(2)}€/termin</td>
                    <td class="trainer-hours-cost">${stat.cost.toFixed(2)}€</td>
                </tr>
            `;
        });
        
        // Dodaj skupno vrstico
        summary += `
            <tr class="trainer-hours-total">
                <td><strong>SKUPAJ</strong></td>
                <td class="trainer-hours-hours"><strong>${totalSessions}</strong></td>
                <td class="trainer-hours-hours"><strong id="totalHoursClickable" style="cursor: pointer; text-decoration: underline; color: #007bff;" title="Klikni za prikaz detajlov">${totalHours.toFixed(2)}h</strong></td>
                <td><strong>-</strong></td>
                <td class="trainer-hours-cost"><strong>${totalCost.toFixed(2)}€</strong></td>
            </tr>
        `;
        
        summary += '</tbody></table>';
        
        if (Object.keys(trainerStats).length === 0) {
            summary = '<p class="muted">Ni podatkov o prisotnosti trenerjev za izbrani mesec</p>';
        }
        
        elTrainerHoursCostsBox.innerHTML = summary;
        
        // Shrani detajle ur za modal
        window.currentHoursDetails = hoursDetails;
        window.currentHoursDetailsMonth = month;
        window.currentHoursDetailsYear = year;
        
        // Dodaj event listenerje za klik na skupno število ur za vsakega trenerja
        const trainerHoursClickableElements = document.querySelectorAll('.trainer-hours-clickable');
        trainerHoursClickableElements.forEach(element => {
            element.addEventListener('click', () => {
                const trainerId = element.getAttribute('data-trainer-id');
                showHoursDetailsModal(trainerId);
            });
        });
        
        // Dodaj event listener za klik na skupno število ur (za vse trenerje)
        const totalHoursElement = document.getElementById('totalHoursClickable');
        if (totalHoursElement) {
            totalHoursElement.addEventListener('click', () => {
                showHoursDetailsModal(null); // null pomeni vse trenerje
            });
        }
    }

    // ===== Funkcija za prikaz modala z detajli ur =====
    function showHoursDetailsModal(trainerId = null) {
        const hoursDetails = window.currentHoursDetails || [];
        const month = window.currentHoursDetailsMonth || 1;
        const year = window.currentHoursDetailsYear || new Date().getFullYear();
        
        const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", 
                          "Julij", "Avgust", "September", "Oktober", "November", "December"];
        const monthIndex = month - 1;
        
        const elModal = document.getElementById('hoursDetailsModal');
        const elTitle = document.getElementById('hoursDetailsModalTitle');
        const elContent = document.getElementById('hoursDetailsContent');
        
        if (!elModal || !elTitle || !elContent) {
            console.error('Modal elementi niso najdeni');
            return;
        }
        
        // Filtriraj po trenerju, če je določen
        let filteredDetails = hoursDetails;
        let trainerName = '';
        if (trainerId) {
            filteredDetails = hoursDetails.filter(d => d.trainer.id === trainerId);
            if (filteredDetails.length > 0) {
                trainerName = `${filteredDetails[0].trainer.first_name} ${filteredDetails[0].trainer.last_name} - `;
            }
        }
        
        elTitle.textContent = `${trainerName}Detajli ur - ${monthNames[monthIndex]} ${year}`;
        
        if (filteredDetails.length === 0) {
            elContent.innerHTML = '<p class="muted">Ni podatkov o urah za izbrani mesec' + (trainerId ? ' in trenerja' : '') + '</p>';
        } else {
            // Sortiraj po datumu in trenerju
            const sortedDetails = [...filteredDetails].sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                const trainerCompare = (a.trainer.last_name || '').localeCompare(b.trainer.last_name || '', 'sl');
                if (trainerCompare !== 0) return trainerCompare;
                return (a.trainer.first_name || '').localeCompare(b.trainer.first_name || '', 'sl');
            });
            
            let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr>';
            html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Datum</th>';
            if (!trainerId) {
                html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Trener</th>';
            }
            html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Čas</th>';
            html += '<th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Trajanje</th>';
            html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Opomba</th>';
            html += '</tr></thead><tbody>';
            
            sortedDetails.forEach(detail => {
                const dateObj = new Date(detail.date);
                const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
                const dayName = dayNames[dateObj.getDay()];
                const dateStr = `${dayName}, ${dateObj.getDate()}. ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                
                const trainerName = `${detail.trainer.first_name} ${detail.trainer.last_name}`;
                const formattedStartTime = formatTimeWithoutSeconds(detail.term.start_time);
                const formattedEndTime = formatTimeWithoutSeconds(detail.term.end_time);
                const timeStr = `${formattedStartTime} - ${formattedEndTime}`;
                const durationStr = `${detail.durationHours.toFixed(2)}h`;
                
                let noteStr = '';
                if (detail.isSubstitute) {
                    if (detail.originalTrainer) {
                        noteStr = `<span style="color: #ff9800;">Nadomešča: ${detail.originalTrainer.first_name} ${detail.originalTrainer.last_name}</span>`;
                    } else {
                        noteStr = '<span style="color: #ff9800;">Nadomestni trener</span>';
                    }
                }
                
                html += '<tr style="border-bottom: 1px solid #eee;">';
                html += `<td style="padding: 8px;">${dateStr}</td>`;
                if (!trainerId) {
                    html += `<td style="padding: 8px;">${trainerName}</td>`;
                }
                html += `<td style="padding: 8px;">${timeStr}</td>`;
                html += `<td style="padding: 8px; text-align: right;">${durationStr}</td>`;
                html += `<td style="padding: 8px;">${noteStr}</td>`;
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            
            // Dodaj skupno vrstico
            const totalHours = filteredDetails.reduce((sum, d) => sum + d.durationHours, 0);
            html += `<div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd; text-align: right;">`;
            html += `<strong>Skupaj: ${filteredDetails.length} terminov, ${totalHours.toFixed(2)} ur</strong>`;
            html += `</div>`;
            
            elContent.innerHTML = html;
        }
        
        // Prikaži modal
        elModal.style.display = 'flex';
        elModal.setAttribute('aria-hidden', 'false');
    }
    

    // ===== Funkcije za opombe trenerjev =====
    function calculateTrainerNotesData() {
        const month = currentTrainerNotesMonth;
        const year = currentTrainerNotesYear;
// console.log('🔍 calculateTrainerNotesData - mesec:', month, 'leto:', year);
        
        if (month === undefined || year === undefined) {
            document.getElementById('trainerNotesBox').innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        // month je 1-based, zato ga pretvorimo v 0-based za JavaScript Date
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        

        
        let notes = '<table><thead><tr><th>Datum</th><th>Termin</th><th>Trener</th><th>Nadomestni trener</th></tr></thead><tbody>';
        
        const trainerNotes = [];
        const seasonTermIds = getAdminSeasonTermIds();
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
                if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                    // Poišči trenerje za ta termin
                    const trainersForTerm = trainers.filter(t => 
                        t.terms && t.terms.includes(term.id) && !t.is_deleted
                    );
                    
                    trainersForTerm.forEach(trainer => {
                        const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                        if (trainerAtt && trainerAtt.present === false && trainerAtt.note) {
                            // Preveri, ali je opomba ID trenerja ali besedilo
                            let substituteTrainerName = trainerAtt.note;
                            
                            // Če je opomba ID trenerja, poišči ime in priimek
                            if (trainerAtt.note && !isNaN(trainerAtt.note) && trainerAtt.note !== '') {
                                const substituteTrainer = trainers.find(t => t.id === trainerAtt.note);
                                if (substituteTrainer) {
                                    substituteTrainerName = `${substituteTrainer.first_name} ${substituteTrainer.last_name}`;
                                }
                            }
                            
                            trainerNotes.push({
                                date: isoDate,
                                term: term,
                                trainer: trainer,
                                note: substituteTrainerName
                            });
                        }
                    });
                }
            });
        }
        
        // Sortiraj po datumu (najnovejši prvi)
        trainerNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Prikaži rezultate
        if (trainerNotes.length === 0) {
            notes = '<p class="muted">Ni opomb o odsotnosti trenerjev za izbrani mesec</p>';
        } else {
            trainerNotes.forEach(note => {
                const dateStr = formatDate(note.date);
                const timeStr = `${DAY_SHORT_NAME[note.term.day]} ${formatTimeWithoutSeconds(note.term.start_time)}-${formatTimeWithoutSeconds(note.term.end_time)}`;
                
                // Odstrani ID trenerja in "Nadomešča:" iz opombe (format: "Nadomešča: Ime Priimek (uuid)")
                let displayNote = note.note || '';
                if (displayNote) {
                    // Odstrani UUID v oklepajih (format: (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx))
                    displayNote = displayNote.replace(/\s*\([a-f0-9-]{36}\)\s*$/i, '');
                    // Odstrani "Nadomešča:" predpono
                    displayNote = displayNote.replace(/^Nadomešča:\s*/i, '');
                }
                
                notes += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${timeStr}</td>
                        <td>${note.trainer.first_name} ${note.trainer.last_name}</td>
                        <td>${displayNote}</td>
                    </tr>
                `;
            });
            notes += '</tbody></table>';
        }
        
        document.getElementById('trainerNotesBox').innerHTML = notes;
    }

    function updateTrainerSummaryControls() {
        // Opomba: elTrainerSummaryMonthSelect in elTrainerSummaryYearSelect so bili zamenjani z navigacijskimi gumbi
        // Vrednosti se sedaj upravljajo preko currentTrainerSummaryMonth in currentTrainerSummaryYear

        // Opomba: elTrainerNotesMonthSelect in elTrainerNotesYearSelect so bili zamenjani z navigacijskimi gumbi
        // Vrednosti se sedaj upravljajo preko currentTrainerNotesMonth in currentTrainerNotesYear

        // Opomba: elSwimmerSummaryMonthSelect in elSwimmerSummaryYearSelect so bili zamenjani z navigacijskimi gumbi
        // Vrednosti se sedaj upravljajo preko currentSwimmerSummaryMonth in currentSwimmerSummaryYear

        // Opomba: elFinanceMonthSelect in elFinanceYearSelect so bili zamenjani z navigacijskimi gumbi
        // Vrednosti se sedaj upravljajo preko currentFinanceMonth in currentFinanceYear

        // Opomba: elSwimmerFeesMonthSelect in elSwimmerFeesYearSelect so bili zamenjani z navigacijskimi gumbi
        // Vrednosti se sedaj upravljajo preko currentSwimmerFeesMonth in currentSwimmerFeesYear
    }

    // ===== FUNKCIJE ZA CUSTOM DATE PICKER =====
    
    // Funkcija za ustvarjanje custom date picker-ja
    function createCustomDatePicker(currentMonth, currentYear, onConfirm) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const picker = document.createElement('div');
        picker.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            gap: 20px;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            padding: 10px 0;
            border-bottom: 2px solid #eee;
        `;
        header.textContent = 'Izberi mesec in leto';
        picker.appendChild(header);
        
        // Container za sidebara
        const sidebarContainer = document.createElement('div');
        sidebarContainer.style.cssText = `
            display: flex;
            gap: 20px;
            min-height: 300px;
        `;
        
        // Sidebar za mesece
        const monthSidebar = document.createElement('div');
        monthSidebar.style.cssText = `
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow-y: auto;
            max-height: 300px;
        `;
        
        const monthHeader = document.createElement('div');
        monthHeader.style.cssText = `
            background: #f8f9fa;
            padding: 10px;
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
        `;
        monthHeader.textContent = 'Meseci';
        monthSidebar.appendChild(monthHeader);
        
        const monthNames = ['Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij', 
                          'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'];
        
        let selectedMonth = currentMonth;
        let selectedYear = currentYear;
        
        monthNames.forEach((monthName, index) => {
            const monthItem = document.createElement('div');
            monthItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
            `;
            monthItem.textContent = monthName;
            
            if (index + 1 === selectedMonth) {
                monthItem.style.backgroundColor = '#007bff';
                monthItem.style.color = 'white';
            }
            
            monthItem.addEventListener('mouseenter', () => {
                if (index + 1 !== selectedMonth) {
                    monthItem.style.backgroundColor = '#f8f9fa';
                }
            });
            
            monthItem.addEventListener('mouseleave', () => {
                if (index + 1 !== selectedMonth) {
                    monthItem.style.backgroundColor = 'white';
                }
            });
            
            monthItem.addEventListener('click', () => {
                // Odstrani prejšnjo selekcijo
                monthSidebar.querySelectorAll('div').forEach(item => {
                    if (item !== monthHeader) {
                        item.style.backgroundColor = 'white';
                        item.style.color = 'black';
                    }
                });
                
                // Označi trenutni
                monthItem.style.backgroundColor = '#007bff';
                monthItem.style.color = 'white';
                
                selectedMonth = index + 1;
                updatePreview();
            });
            
            monthSidebar.appendChild(monthItem);
        });
        
        // Sidebar za leta
        const yearSidebar = document.createElement('div');
        yearSidebar.style.cssText = `
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow-y: auto;
            max-height: 300px;
        `;
        
        const yearHeader = document.createElement('div');
        yearHeader.style.cssText = `
            background: #f8f9fa;
            padding: 10px;
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
        `;
        yearHeader.textContent = 'Leto';
        yearSidebar.appendChild(yearHeader);
        
        // Generiraj leta (5 let nazaj do 5 let naprej)
        const currentYearForPicker = new Date().getFullYear();
        for (let year = currentYearForPicker - 5; year <= currentYearForPicker + 5; year++) {
            const yearItem = document.createElement('div');
            yearItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
            `;
            yearItem.textContent = year;
            
            if (year === selectedYear) {
                yearItem.style.backgroundColor = '#007bff';
                yearItem.style.color = 'white';
            }
            
            yearItem.addEventListener('mouseenter', () => {
                if (year !== selectedYear) {
                    yearItem.style.backgroundColor = '#f8f9fa';
                }
            });
            
            yearItem.addEventListener('mouseleave', () => {
                if (year !== selectedYear) {
                    yearItem.style.backgroundColor = 'white';
                }
            });
            
            yearItem.addEventListener('click', () => {
                // Odstrani prejšnjo selekcijo
                yearSidebar.querySelectorAll('div').forEach(item => {
                    if (item !== yearHeader) {
                        item.style.backgroundColor = 'white';
                        item.style.color = 'black';
                    }
                });
                
                // Označi trenutno
                yearItem.style.backgroundColor = '#007bff';
                yearItem.style.color = 'white';
                
                selectedYear = year;
                updatePreview();
            });
            
            yearSidebar.appendChild(yearItem);
        }
        
        // Preview trenutnega datuma
        const preview = document.createElement('div');
        preview.style.cssText = `
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            color: #333;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        `;
        
        function updatePreview() {
            preview.textContent = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
        }
        updatePreview();
        
        // Gumbi
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Prekliči';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        `;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Potrdi';
        confirmBtn.style.cssText = `
            padding: 10px 20px;
            border: none;
            background: #007bff;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        `;
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        
        // Sestavi picker
        sidebarContainer.appendChild(monthSidebar);
        sidebarContainer.appendChild(yearSidebar);
        picker.appendChild(sidebarContainer);
        picker.appendChild(preview);
        picker.appendChild(buttons);
        overlay.appendChild(picker);
        document.body.appendChild(overlay);
        
        // Event listenerji
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        confirmBtn.addEventListener('click', () => {
            onConfirm(selectedMonth, selectedYear);
            document.body.removeChild(overlay);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    // ===== FUNKCIJE ZA POVZETEK UDELEŽBE PLAVALCEV =====
    
    // Funkcija za izračun povzetka udeležbe plavalcev
    function calculateSwimmerSummaryData(year, month) {
// console.log('🔍 calculateSwimmerSummaryData - prej: year:', year, 'month:', month, '(1-based)');
        const res = {};
        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        // month je 1-based, zato ga pretvorimo v 0-based za JavaScript Date
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
// console.log('🔍 calculateSwimmerSummaryData - po: monthStart:', monthStart, 'monthEnd:', monthEnd);
        

        
        const today = new Date();
        today.setHours(0,0,0,0);
        const seasonTermIds = getSwimmersSeasonTermIds();

        // Inicializacija podatkov za aktivne plavalce z dodeljenimi termini v izbrani sezoni
        // PLUS plavalci z prisotnostjo, tudi če niso več dodeljeni terminu
        swimmers.forEach(s => {
            // Izključi izbrisane plavalce (is_deleted)
            if (s.is_deleted) return;
            
            const termsInSeason = (s.terms || []).filter(tid => !seasonTermIds || seasonTermIds.has(tid));
            if (termsInSeason.length > 0) {
                res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0, attendanceDates: [], absentDates: [], missedDates: [] };
            }
        });

        // Zanka za izračun prisotnosti (att) in odsotnosti
        const allAttendance = Object.entries(attendance);
        for (const [date, termData] of allAttendance) {
            const d = new Date(date);
            d.setHours(0,0,0,0);
            if (d >= monthStart && d <= monthEnd) {
                for (const termId in termData) {
                    if (seasonTermIds && !seasonTermIds.has(termId)) continue;
                    for (const swimmerId in termData[termId]) {
                        const status = termData[termId][swimmerId];
                        const swimmer = swimmers.find(s => s.id === swimmerId);
                        // DODANO: Vključi plavalce z prisotnostjo, tudi če niso več dodeljeni terminu
                        // Izključi le izbrisane plavalce
                        if (swimmer && !swimmer.is_deleted) {
                            // Če plavalec še ni v rezultatih (nima več dodeljenih terminov), ga dodaj
                            if (!res[swimmerId]) {
                                res[swimmerId] = { first: swimmer.first_name, last: swimmer.last_name, att: 0, pos: 0, attendanceDates: [], absentDates: [], missedDates: [] };
                            }
                            
                            // Preverimo status prisotnosti
                            if (status === true || status === 'true' || status === 1) {
                                // Prisoten
                                res[swimmerId].att += 1;
                                if (!res[swimmerId].attendanceDates) {
                                    res[swimmerId].attendanceDates = [];
                                }
                                res[swimmerId].attendanceDates.push({ date: date, termId: termId });
                            } else if (status === false || status === 'false' || status === 0) {
                                // Odsoten
                                if (!res[swimmerId].absentDates) {
                                    res[swimmerId].absentDates = [];
                                }
                                res[swimmerId].absentDates.push({ date: date, termId: termId });
                            }
                        }
                    }
                }
            }
        }

        // Zanka za izračun možnih obiskov (pos)
        // DODANO: Preverimo tudi prisotnost za plavalce, ki niso več dodeljeni terminu
        const currentDate = new Date(monthStart);
        while (currentDate <= monthEnd) {
            const ymd = iso(currentDate);
            const todaysTerms = getTermsForDate(currentDate);

            todaysTerms.forEach(term => {
                if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                const termIsActive = getTermStatus(currentDate, term.id).status === "active";
                
                if (termIsActive) {
                    swimmers.forEach(s => {
                        // Izključi izbrisane plavalce
                        if (s.is_deleted) return;
                            
                        // Preveri, ali plavalec ima ta termin dodeljen in ali je v rezultatih
                        // Štejemo samo možne obiske pri redno dodeljenih terminih (ne pri nadomestnih)
                        if (res[s.id] && s.terms && s.terms.includes(term.id)) {
                            res[s.id].pos += 1;
                            
                            // Preveri, ali je prisotnost vnesena za ta termin
                            const termAtt = attendance[ymd]?.[term.id] || {};
                            const status = termAtt[s.id];
                            
                            // Če ni vnesene prisotnosti (ni true ali false), je to neobiskan trening
                            if (status === undefined || status === null) {
                                if (!res[s.id].missedDates) {
                                    res[s.id].missedDates = [];
                                }
                                res[s.id].missedDates.push({ date: ymd, termId: term.id });
                            }
                        }
                        // Nadomestni obiski se NE prištevajo v "možne" (pos), da delež ne preseže 100 %
                    });
                }
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Za plavalce samo z nadomestnimi obiski (brez redno dodeljenih terminov) nastavimo pos = att, da delež = 100 %
        Object.keys(res).forEach(swimmerId => {
            if (res[swimmerId].pos === 0 && res[swimmerId].att > 0) {
                res[swimmerId].pos = res[swimmerId].att;
            }
        });
        
        return res;
    }





    // Funkcija za prikaz povzetka udeležbe plavalcev
    function renderSwimmerSummary(summaryData) {
        // Shrani podatke globalno za uporabo v modalu
        window.currentSwimmerStats = {};
        Object.entries(summaryData).forEach(([swimmerId, r]) => {
            window.currentSwimmerStats[swimmerId] = r;
        });
        
        let html = `<table><thead><tr><th>Plavalec</th><th>Sezone / Termini</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
        // Filtriramo plavalce, ki nimajo nobenega možnega obiska in dodajamo dodatno filtriranje
        const rows = Object.entries(summaryData)
            .filter(([swimmerId, r]) => {
                const swimmer = swimmers.find(s => s.id === swimmerId);
                // Izključi izbrisane plavalce
                if (swimmer && swimmer.is_deleted) return false;
                // DODANO: Prikaži tudi plavalce brez dodeljenih terminov, če imajo prisotnost (r.att > 0)
                // Izključi le plavalce brez možnih obiskov IN brez prisotnosti
                return r.pos > 0 || r.att > 0;
            })
            .map(([swimmerId, r]) => ({ ...r, swimmerId }))
            .sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
        if(rows.length===0) html += `<tr><td colspan="5" class="muted">Ni plavalcev.</td></tr>`;
        rows.forEach(r=>{
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            const swimmerName = `${r.first} ${r.last}`;
            const swimmer = swimmers.find(s => s.id === r.swimmerId);
            const termsSummary = swimmer ? formatSwimmerTermsSummary(swimmer) : '<span class="muted">—</span>';
            // Naredi delež klikljiv
            const pctClickable = r.att > 0 
                ? `<td><a href="#" class="attendance-link" data-swimmer-id="${r.swimmerId}" data-swimmer-name="${swimmerName}" style="color: inherit; text-decoration: underline; cursor: pointer;">${pct}</a></td>`
                : `<td>${pct}</td>`;
            html += `<tr><td>${swimmerName}</td><td class="terms-cell">${termsSummary}</td><td>${r.att}</td><td>${r.pos}</td>${pctClickable}</tr>`;
        });
        html += `</tbody></table>`;
        elSwimmerSummaryBox.innerHTML = html;
        
        // Dodaj event listenerje za klik na delež
        elSwimmerSummaryBox.querySelectorAll('.attendance-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const swimmerId = link.getAttribute('data-swimmer-id');
                const swimmerName = link.getAttribute('data-swimmer-name');
                showSwimmerAttendanceModal(swimmerId, swimmerName);
            });
        });
    }

    // Funkcija za osvežitev povzetka udeležbe plavalcev
    async function refreshSwimmerSummary() {
        const month = currentSwimmerSummaryMonth;
        const year = currentSwimmerSummaryYear;
// console.log('🔍 refreshSwimmerSummary - mesec:', month, 'leto:', year);
        
        // Osveži podatke o prisotnosti za izbrani mesec
        await loadAttendanceForMonth(year, month);
        
        // Izračunaj in prikaži povzetek
        const summaryData = calculateSwimmerSummaryData(year, month);
        renderSwimmerSummary(summaryData);
    }
    
    // Funkcija za izračun povzetka udeležbe OLY plavalcev
    async function calculateOlySwimmerSummaryData(year, month) {
        // Najprej pridobi OLY status za plavalce za ta mesec
        const swimmerFees = await getSwimmerFeesFromDB(month, year);
        
        // Pridobi OLY plavalce (tisti, ki imajo is_oly = true za ta mesec)
        const olySwimmerIds = new Set();
        Object.entries(swimmerFees).forEach(([swimmerId, feeData]) => {
            if (feeData.is_oly === true) {
                olySwimmerIds.add(swimmerId);
            }
        });
        
        // Izračunaj podatke za vse plavalce
        const allSummaryData = calculateSwimmerSummaryData(year, month);
        
        // Filtriraj samo OLY plavalce
        const olySummaryData = {};
        Object.entries(allSummaryData).forEach(([swimmerId, data]) => {
            if (olySwimmerIds.has(swimmerId)) {
                olySummaryData[swimmerId] = data;
            }
        });
        
        return olySummaryData;
    }
    
    // Funkcija za prikaz povzetka udeležbe OLY plavalcev
    function renderOlySwimmerSummary(summaryData) {
        if (!elOlySwimmerSummaryBox) return;
        
        let html = `<table><thead><tr><th>Plavalec</th><th>Sezone / Termini</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
        
        const rows = Object.entries(summaryData)
            .filter(([swimmerId, r]) => {
                const swimmer = swimmers.find(s => s.id === swimmerId);
                if (swimmer && swimmer.is_deleted) return false;
                return r.pos > 0 || r.att > 0;
            })
            .map(([swimmerId, r]) => ({ ...r, swimmerId }))
            .sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
            
        if (rows.length === 0) {
            html += `<tr><td colspan="5" class="muted">Ni OLY plavalcev za ta mesec.</td></tr>`;
        }
        
        rows.forEach(r => {
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            const swimmer = swimmers.find(s => s.id === r.swimmerId);
            const termsSummary = swimmer ? formatSwimmerTermsSummary(swimmer) : '<span class="muted">—</span>';
            html += `<tr><td>${r.first} ${r.last}</td><td class="terms-cell">${termsSummary}</td><td>${r.att}</td><td>${r.pos}</td><td>${pct}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        elOlySwimmerSummaryBox.innerHTML = html;
    }
    
    // Funkcija za osvežitev povzetka udeležbe OLY plavalcev
    async function refreshOlySwimmerSummary() {
        const month = currentOlySwimmerSummaryMonth;
        const year = currentOlySwimmerSummaryYear;
        
        if (!elOlySwimmerSummaryBox) return;
        
        // Osveži podatke o prisotnosti za izbrani mesec
        await loadAttendanceForMonth(year, month);
        
        // Izračunaj in prikaži povzetek
        const summaryData = await calculateOlySwimmerSummaryData(year, month);
        renderOlySwimmerSummary(summaryData);
    }

    // Funkcija za nalaganje podatkov o prisotnosti za določen mesec
    async function loadAttendanceForMonth(year, month) {
// console.log('🔍 loadAttendanceForMonth - prej: year:', year, 'month:', month, '(1-based)');
        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        // month je 1-based, zato ga pretvorimo v 0-based za JavaScript Date
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
// console.log('🔍 loadAttendanceForMonth - po: monthStart:', monthStart, 'monthEnd:', monthEnd);
        

        
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .gte('date', iso(monthStart))
                .lte('date', iso(monthEnd));
            
            if (error) {
                console.error('Napaka pri nalaganju prisotnosti za mesec:', error);
                return;
            }
            
            // Osveži lokalne podatke o prisotnosti za ta mesec
            data.forEach(row => {
                if (!attendance[row.date]) attendance[row.date] = {};
                if (!attendance[row.date][row.term_id]) attendance[row.date][row.term_id] = {};
                attendance[row.date][row.term_id][row.swimmer_id] = row.status;
            });
            
// console.log('Podatki o prisotnosti za mesec osveženi:', data);
        } catch (error) {
            console.error('Napaka pri nalaganju prisotnosti za mesec:', error);
        }
    }

    const ATTENDANCE_PAGE_SIZE = 1000;

    /**
     * Naloži vso prisotnost za datumsko obdobje (več strani; Supabase privzeto omeji ~1000 vrstic).
     * Za datume v obdobju najprej počisti obstoječe zapise v pomnilniku, nato zlijemo sveže iz baze.
     */
    async function loadAttendanceForDateRange(fromYmd, toYmd) {
        if (!fromYmd || !toYmd || fromYmd > toYmd) return;
        const collected = [];
        let start = 0;
        try {
            for (;;) {
                const { data, error } = await supabase
                    .from('attendance')
                    .select('*')
                    .gte('date', fromYmd)
                    .lte('date', toYmd)
                    .order('date', { ascending: true })
                    .range(start, start + ATTENDANCE_PAGE_SIZE - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                collected.push(...data);
                if (data.length < ATTENDANCE_PAGE_SIZE) break;
                start += ATTENDANCE_PAGE_SIZE;
            }
        } catch (e) {
            console.error('Napaka pri nalaganju prisotnosti za obdobje:', e);
            showMessage('Napaka pri nalaganju prisotnosti za poročilo. Preverite konzolo.', 'error');
            return;
        }
        Object.keys(attendance).forEach(d => {
            if (d >= fromYmd && d <= toYmd) delete attendance[d];
        });
        collected.forEach(row => {
            if (!attendance[row.date]) attendance[row.date] = {};
            if (!attendance[row.date][row.term_id]) attendance[row.date][row.term_id] = {};
            attendance[row.date][row.term_id][row.swimmer_id] = row.status;
        });
    }

    async function loadTermStatusForDateRange(fromYmd, toYmd) {
        if (!fromYmd || !toYmd || fromYmd > toYmd) return;
        const collected = [];
        let start = 0;
        try {
            for (;;) {
                const { data, error } = await supabase
                    .from('term_status')
                    .select('*')
                    .gte('date', fromYmd)
                    .lte('date', toYmd)
                    .order('date', { ascending: true })
                    .range(start, start + ATTENDANCE_PAGE_SIZE - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                collected.push(...data);
                if (data.length < ATTENDANCE_PAGE_SIZE) break;
                start += ATTENDANCE_PAGE_SIZE;
            }
        } catch (e) {
            console.warn('Napaka pri nalaganju statusa terminov za obdobje:', e);
            return;
        }
        Object.keys(termStatus).forEach(d => {
            if (d >= fromYmd && d <= toYmd) delete termStatus[d];
        });
        collected.forEach(row => {
            if (!termStatus[row.date]) termStatus[row.date] = {};
            termStatus[row.date][row.term_id] = {
                status: row.status,
                note: row.note,
                notes: row.notes
            };
        });
    }

    async function loadSeasons() {
        try {
            const { data, error } = await supabase
                .from('seasons')
                .select('*')
                .order('date_from', { ascending: false });
            if (error) throw error;
            seasons = data || [];
        } catch (e) {
            console.warn('Sezone: tabela morda še ne obstaja. Poženite SQL/create_seasons.sql.', e.message || e);
            seasons = [];
        }
    }

    function populateSeasonSelects() {
        const newTermSel = document.getElementById('newTermSeasonId');
        const repSel = document.getElementById('seasonReportSelect');
        const optHtml = seasons.map(s =>
            `<option value="${s.id}">${escapeHtml(s.name)} (${s.date_from} – ${s.date_to})</option>`
        ).join('');
        if (newTermSel) {
            newTermSel.innerHTML = '<option value="">Brez sezone</option>' + optHtml;
        }
        const editTermSeasonEl = document.getElementById('editTermSeasonId');
        if (editTermSeasonEl) {
            editTermSeasonEl.innerHTML = '<option value="">Brez sezone</option>' + optHtml;
        }
        if (repSel) {
            repSel.innerHTML = '<option value="">Izberi sezono</option>' + optHtml;
        }
        const copySrc = document.getElementById('copyTermsSourceSeason');
        const copyTgt = document.getElementById('copyTermsTargetSeason');
        if (copySrc) copySrc.innerHTML = '<option value="">Izberi izvorno sezono</option>' + optHtml;
        if (copyTgt) copyTgt.innerHTML = '<option value="">Izberi ciljno sezono</option>' + optHtml;
        const termListSf = document.getElementById('termListSeasonFilter');
        if (termListSf) {
            termListSf.innerHTML = '<option value="">Vse sezone (zmešano)</option>' + seasons.map(s =>
                `<option value="${s.id}">${escapeHtml(s.name)}</option>`
            ).join('');
            const rawSaved = sessionStorage.getItem(TERM_LIST_SEASON_STORAGE_KEY);
            let pick = '';
            if (rawSaved !== null && (rawSaved === '' || seasons.some(s => s.id === rawSaved))) {
                pick = rawSaved;
            } else {
                const activeS = seasons.find(s => s.is_active);
                pick = activeS ? activeS.id : '';
            }
            termListSf.value = pick;
            sessionStorage.setItem(TERM_LIST_SEASON_STORAGE_KEY, pick);
        }
        const swimmersSf = document.getElementById('adminSeasonFilter');
        if (swimmersSf) {
            if (seasons.length === 0) {
                swimmersSf.innerHTML = '<option value="">Ni sezon</option>';
            } else {
                swimmersSf.innerHTML = seasons.map(s =>
                    `<option value="${s.id}">${escapeHtml(s.name)}</option>`
                ).join('');
                const rawSaved = sessionStorage.getItem(TERM_LIST_SEASON_STORAGE_KEY);
                let pick = '';
                if (rawSaved && seasons.some(s => s.id === rawSaved)) {
                    pick = rawSaved;
                } else {
                    const activeS = seasons.find(s => s.is_active);
                    pick = activeS ? activeS.id : seasons[0].id;
                }
                swimmersSf.value = pick;
                if (pick) sessionStorage.setItem(TERM_LIST_SEASON_STORAGE_KEY, pick);
            }
        }
        updateAdminSeasonBarHint();
        const browseSel = document.getElementById('seasonTermsBrowseSelect');
        if (browseSel) {
            const prev = browseSel.value;
            browseSel.innerHTML = '<option value="">Izberite sezono</option>' + optHtml;
            if (prev && seasons.some(s => s.id === prev)) browseSel.value = prev;
            renderSeasonTermsForSeason(browseSel.value || '');
        }
    }

    /** Ročno označene kljukice priprave sezone: season_id → { item_id: bool } */
    const SEASON_SETUP_STORAGE_KEY = 'eklub_season_setup_checks';
    const SEASON_SETUP_ITEMS = [
        {
            id: 'copy_terms',
            label: '1. Kopiraj / preveri termine',
            detail: 'V ciljni sezoni morajo obstajati termini (kopiraj iz prejšnje sezone ali dodaj ročno)',
            linkSection: 'seasons',
            linkLabel: 'Sezone → Kopiraj termine',
            scrollTo: 'copyTermsCard'
        },
        {
            id: 'assign_swimmers',
            label: '2. Dodeli plavalce na termine',
            detail: 'Vsak aktiven plavalec v sezoni naj ima vsaj en termin',
            linkSection: 'swimmers',
            linkLabel: 'Plavalci → Dodeli termine'
        },
        {
            id: 'assign_trainers',
            label: '3. Dodeli trenerje na termine',
            detail: 'Trenerji naj imajo dodeljene jutranje / večerne termine',
            linkSection: 'trainers',
            linkLabel: 'Trenerji → Dodeli termine'
        },
        {
            id: 'payment_plans',
            label: '4. Načini plačila',
            detail: 'Mesečno / enkratno (oktober) / 2 obroka (okt. + feb.)',
            linkSection: 'swimmers',
            linkLabel: 'Plavalci'
        },
        {
            id: 'fee_amounts',
            label: '5. Zneski vadnin po terminih',
            detail: `${formatDefaultFeesSummary()} — pri kopiranju in praznih poljih; popuste vnesite ročno`,
            linkSection: 'finance',
            linkLabel: 'Finance → Vadnine',
            scrollTo: 'finance-swimmer-fees'
        },
        {
            id: 'membership',
            label: '6. Članarina',
            detail: 'Mesec obračuna za vsakega plavalca (enkrat na sezono)',
            linkSection: 'finance',
            linkLabel: 'Finance → Računovodstvo',
            scrollTo: 'finance-accounting'
        },
        {
            id: 'report_order',
            label: '7. Vrstni red poročila za računovodstvo',
            detail: 'Shrani vrstni red v poročilu za računovodstvo',
            linkSection: 'finance',
            linkLabel: 'Finance → Računovodstvo',
            scrollTo: 'finance-accounting'
        }
    ];

    function getSwimmersInSeason(seasonId) {
        if (!seasonId) return [];
        return swimmers.filter(s => {
            if (s.is_deleted) return false;
            return (s.terms || []).some(tid => {
                const term = TERMS.find(t => t.id === tid);
                return term && term.season_id === seasonId;
            });
        });
    }

    function getSeasonSetupManualChecks() {
        try {
            return JSON.parse(localStorage.getItem(SEASON_SETUP_STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function getSeasonSetupChecked(seasonId, itemId, autoOk) {
        const manual = getSeasonSetupManualChecks()[seasonId];
        if (manual && Object.prototype.hasOwnProperty.call(manual, itemId)) {
            return !!manual[itemId];
        }
        return !!autoOk;
    }

    window.setSeasonSetupChecked = function(seasonId, itemId, checked) {
        const all = getSeasonSetupManualChecks();
        if (!all[seasonId]) all[seasonId] = {};
        all[seasonId][itemId] = checked === true;
        localStorage.setItem(SEASON_SETUP_STORAGE_KEY, JSON.stringify(all));
        renderSeasonSetupChecklist();
    };

    async function evaluateSeasonSetupStatus(seasonId) {
        const inSeason = getSwimmersInSeason(seasonId);
        const n = inSeason.length;
        const season = seasons.find(s => s.id === seasonId);
        const result = {};

        if (n === 0) {
            SEASON_SETUP_ITEMS.forEach(item => {
                if (item.id === 'copy_terms') {
                    const termCount = TERMS.filter(t => t.season_id === seasonId).length;
                    result[item.id] = {
                        ok: termCount > 0,
                        hint: termCount > 0
                            ? `${termCount} terminov v sezoni.`
                            : 'Še ni terminov — kopirajte iz prejšnje sezone ali jih dodajte.'
                    };
                } else if (item.id === 'assign_trainers') {
                    result[item.id] = { ok: false, hint: 'Najprej dodelite plavalce na termine sezone.' };
                } else {
                    result[item.id] = { ok: false, hint: 'Ni plavalcev z dodeljenimi termini v tej sezoni.' };
                }
            });
            return result;
        }

        const termCount = TERMS.filter(t => t.season_id === seasonId).length;
        result.copy_terms = {
            ok: termCount > 0,
            hint: termCount > 0
                ? `${termCount} terminov v sezoni.`
                : 'Še ni terminov — kopirajte iz prejšnje sezone.'
        };

        result.assign_swimmers = {
            ok: n > 0,
            hint: `${n} plavalcev z vsaj enim terminom v sezoni.`
        };

        let trainersWithTerms = 0;
        try {
            const seasonTermIds = TERMS.filter(t => t.season_id === seasonId).map(t => t.id);
            if (seasonTermIds.length > 0) {
                const { data: tt } = await supabase
                    .from('trainer_terms')
                    .select('trainer_id')
                    .in('term_id', seasonTermIds);
                trainersWithTerms = new Set((tt || []).map(r => r.trainer_id)).size;
            }
        } catch (_) { /* ignore */ }
        result.assign_trainers = {
            ok: trainersWithTerms > 0,
            hint: trainersWithTerms > 0
                ? `${trainersWithTerms} trenerjev ima dodeljene termine sezone.`
                : 'Nobeden trener še nima termina v tej sezoni.'
        };

        const withBillingRecord = inSeason.filter(s => !!swimmerSeasonBilling[`${s.id}|${seasonId}`]).length;
        result.payment_plans = {
            ok: withBillingRecord === n,
            hint: withBillingRecord === n
                ? `Vsi ${n} plavalci imajo shranjen način plačila.`
                : `${withBillingRecord}/${n} plavalcev ima eksplicitno shranjen način (preostali: privzeto mesečno).`
        };

        let feeHint = 'Ni podatkov o vadninah.';
        let feeOk = false;
        if (season) {
            const tuples = getSeasonMonthTuples(season);
            if (tuples.length > 0) {
                const { month, year } = tuples[0];
                const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
                const ids = inSeason.map(s => s.id);
                const { data: fees, error } = await supabase
                    .from('swimmer_monthly_fees')
                    .select('swimmer_id, monthly_fee')
                    .eq('month', month)
                    .eq('year', year)
                    .in('swimmer_id', ids);
                if (!error) {
                    const withFee = (fees || []).filter(f => parseFloat(f.monthly_fee || 0) > 0).length;
                    feeOk = withFee === n;
                    feeHint = feeOk
                        ? `Vsi ${n} plavalci imajo vadnino za ${monthLabel}.`
                        : `${withFee}/${n} plavalcev ima vnesen znesek vadnine za ${monthLabel}.`;
                }
            }
        }
        result.fee_amounts = { ok: feeOk, hint: feeHint };

        const withMembership = inSeason.filter(s => !!getMembershipChargedPeriod(s.id, seasonId)).length;
        result.membership = {
            ok: withMembership === n,
            hint: withMembership === n
                ? `Vsem ${n} plavalkam je določen mesec obračuna članarine.`
                : `${withMembership}/${n} plavalcev ima določen mesec obračuna članarine.`
        };

        const savedOrder = (accountingReportOrderBySeason[seasonId] || []).length;
        result.report_order = {
            ok: savedOrder > 0,
            hint: savedOrder > 0
                ? `Shranjen vrstni red (${savedOrder} vnosov).`
                : 'Vrstni red še ni shranjen — uredite in shranite v Finance.'
        };

        return result;
    }

    async function renderSeasonSetupChecklist() {
        const box = document.getElementById('seasonSetupChecklist');
        if (!box) return;

        const seasonId = getAdminSeasonFilterId();
        if (!seasonId) {
            box.innerHTML = '<p class="muted">Ni izbrane sezone — izberite sezono v pasu zgoraj.</p>';
            return;
        }

        const season = seasons.find(s => s.id === seasonId);
        box.innerHTML = '<p class="muted">Preverjam stanje …</p>';

        const status = await evaluateSeasonSetupStatus(seasonId);
        let doneCount = 0;
        let itemsHtml = '';

        SEASON_SETUP_ITEMS.forEach(item => {
            const st = status[item.id] || { ok: false, hint: '' };
            const checked = getSeasonSetupChecked(seasonId, item.id, st.ok);
            if (checked) doneCount++;
            const autoBadge = st.ok
                ? '<span style="color:#166534;font-size:12px">✓ zaznano v bazi</span>'
                : '<span style="color:#b45309;font-size:12px">⚠ preverite</span>';
            itemsHtml += `
                <div class="season-setup-item${checked ? ' done' : ''}">
                    <label>
                        <input type="checkbox"
                               ${checked ? 'checked' : ''}
                               onchange="setSeasonSetupChecked('${seasonId}', '${item.id}', this.checked)">
                        <span>
                            <strong>${escapeHtml(item.label)}</strong><br>
                            <span class="muted" style="font-size:12px">${escapeHtml(item.detail)}</span><br>
                            <span style="font-size:12px">${autoBadge} — ${escapeHtml(st.hint || '')}</span><br>
                            <button type="button" class="btn" style="margin-top:6px;padding:2px 8px;font-size:12px"
                                    data-goto-section="${item.linkSection}"
                                    data-scroll-to="${item.scrollTo || ''}">${escapeHtml(item.linkLabel)} →</button>
                        </span>
                    </label>
                </div>`;
        });

        const allDone = doneCount === SEASON_SETUP_ITEMS.length;
        const progressClass = allDone ? 'season-setup-progress complete' : 'season-setup-progress';
        const seasonLabel = season ? escapeHtml(season.name) : 'sezona';

        box.innerHTML = `
            <div class="${progressClass}">
                <strong>${seasonLabel}:</strong> ${doneCount}/${SEASON_SETUP_ITEMS.length} opravljenih korakov
                ${allDone ? ' — sezona je pripravljena za obračun.' : ' — dokončajte preostale korake pred prvim obračunom.'}
            </div>
            <div class="season-setup-checklist">${itemsHtml}</div>`;
    }

    function updateAdminSeasonBarHint() {
        const el = document.getElementById('adminSeasonBarHint');
        if (!el || !seasons.length) return;
        const rawSaved = sessionStorage.getItem(TERM_LIST_SEASON_STORAGE_KEY);
        const activeS = seasons.find(s => s.is_active);
        const currentId = getAdminSeasonFilterId();
        const current = seasons.find(s => s.id === currentId);
        let source = 'prva sezona na seznamu';
        if (rawSaved && seasons.some(s => s.id === rawSaved)) source = 'zadnja izbira v brskalniku';
        else if (activeS && currentId === activeS.id) source = 'označena kot aktivna v bazi';
        el.textContent = current
            ? `Velja sezona: ${current.name}. Privzeto: ${source}.`
            : 'Izberite sezono.';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function renderSeasonsAdminList() {
        const box = document.getElementById('seasonsListContainer');
        if (!box) return;
        if (seasons.length === 0) {
            box.innerHTML = '<p class="muted">Ni sezon. Dodajte prvo sezono zgoraj ali poženite migracijo v SQL.</p>';
            return;
        }
        let html = '<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Naziv</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Od</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Do</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Aktivna</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Terminov</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Dejanja</th></tr></thead><tbody>';
        seasons.forEach(s => {
            const nTerms = TERMS.filter(t => t.season_id === s.id).length;
            html += `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(s.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${s.date_from}</td><td style="padding:8px;border-bottom:1px solid #eee">${s.date_to}</td><td style="padding:8px;border-bottom:1px solid #eee">${s.is_active ? 'Da' : 'Ne'}</td><td style="padding:8px;border-bottom:1px solid #eee">${nTerms}</td><td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap"><button type="button" class="btn" data-edit-season="${s.id}">Uredi</button> <button type="button" class="btn warn" data-delete-season="${s.id}">Izbriši</button></td></tr>`;
        });
        html += '</tbody></table>';
        box.innerHTML = html;
        renderSeasonSetupChecklist();
    }

    /**
     * Letno poročilo: seštevki prisotnih in možnih (dan × termin × dodeljen plavalec) za celo sezono.
     * Skupni delež v UI: attAll/posAll (in ločeno jutro/popoldan). Dodatno: povpr. po treningih in po plavalcih.
     */
    function buildSeasonAttendanceStats(season, swimmerIdFilter = null) {
        const filter = swimmerIdFilter && swimmerIdFilter.size > 0 ? swimmerIdFilter : null;
        const termsInSeason = getTermsForSeason(season);
        const termIds = new Set(termsInSeason.map(t => t.id));
        let sessSumAll = 0, sessNAll = 0, sessSumMorn = 0, sessNMorn = 0, sessSumAfter = 0, sessNAfter = 0;
        const out = {
            posAll: 0, attAll: 0, posMorn: 0, attMorn: 0, posAfter: 0, attAfter: 0,
            termCount: termsInSeason.length,
            avgIndividualPctAll: null,
            swimmersCountedForAvg: 0,
            sessAvgPctAll: null,
            sessCountAll: 0,
            sessAvgPctMorn: null,
            sessCountMorn: 0,
            sessAvgPctAfter: null,
            sessCountAfter: 0
        };
        const perSwimmer = new Map();
        function bump(swId, isPresent) {
            if (!perSwimmer.has(swId)) {
                perSwimmer.set(swId, { pos: 0, att: 0 });
            }
            const p = perSwimmer.get(swId);
            p.pos++;
            if (isPresent) p.att++;
        }
        const start = new Date(season.date_from);
        const end = new Date(season.date_to);
        const cur = new Date(start);
        while (cur <= end) {
            const ymd = iso(cur);
            const todays = getTermsForDate(cur).filter(t => termIds.has(t.id));
            for (const term of todays) {
                if (getTermStatus(cur, term.id).status !== 'active') continue;
                const isMorning = isTermMorningSlot(term);
                const termAtt = attendance[ymd]?.[term.id] || {};
                const assigned = [];
                for (const s of swimmers) {
                    if (s.is_deleted || !s.terms || !s.terms.includes(term.id)) continue;
                    if (filter && !filter.has(s.id)) continue;
                    assigned.push(s);
                }
                if (assigned.length === 0) continue;
                let nPres = 0;
                for (const s of assigned) {
                    out.posAll++;
                    if (isMorning) out.posMorn++; else out.posAfter++;
                    const st = termAtt[s.id];
                    const pres = st === true || st === 'true' || st === 1;
                    if (pres) {
                        nPres++;
                        out.attAll++;
                        if (isMorning) out.attMorn++; else out.attAfter++;
                    }
                    bump(s.id, pres);
                }
                const rate = nPres / assigned.length;
                sessSumAll += rate;
                sessNAll++;
                if (isMorning) {
                    sessSumMorn += rate;
                    sessNMorn++;
                } else {
                    sessSumAfter += rate;
                    sessNAfter++;
                }
            }
            cur.setDate(cur.getDate() + 1);
        }
        let sumInd = 0;
        let nInd = 0;
        for (const p of perSwimmer.values()) {
            if (p.pos > 0) {
                sumInd += Math.min(100, (p.att / p.pos) * 100);
                nInd++;
            }
        }
        out.avgIndividualPctAll = nInd > 0 ? (sumInd / nInd).toFixed(1) : null;
        out.swimmersCountedForAvg = nInd;
        out.sessAvgPctAll = sessNAll > 0 ? Math.min(100, (sessSumAll / sessNAll) * 100).toFixed(1) : null;
        out.sessCountAll = sessNAll;
        out.sessAvgPctMorn = sessNMorn > 0 ? Math.min(100, (sessSumMorn / sessNMorn) * 100).toFixed(1) : null;
        out.sessCountMorn = sessNMorn;
        out.sessAvgPctAfter = sessNAfter > 0 ? Math.min(100, (sessSumAfter / sessNAfter) * 100).toFixed(1) : null;
        out.sessCountAfter = sessNAfter;
        return out;
    }

    /** Plavalci z vsaj enim mesecem OLY vadnine znotraj obdobja sezone */
    async function getOlySwimmerIdsForSeason(season) {
        const fromY = new Date(season.date_from).getFullYear();
        const toY = new Date(season.date_to).getFullYear();
        try {
            const { data, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('swimmer_id, year, month')
                .eq('is_oly', true)
                .gte('year', fromY)
                .lte('year', toY);
            if (error) throw error;
            const ids = new Set();
            (data || []).forEach(row => {
                if (ymInSeasonRange(row.year, row.month, season)) ids.add(row.swimmer_id);
            });
            return ids;
        } catch (e) {
            console.warn('OLY filtri za sezono:', e.message || e);
            return new Set();
        }
    }

    function renderSeasonTermsForSeason(seasonId) {
        const box = document.getElementById('seasonTermsBrowseOutput');
        if (!box) return;
        if (!seasonId) {
            box.innerHTML = '<p class="muted">Izberite sezono zgoraj.</p>';
            return;
        }
        const termsList = TERMS.filter(t => t.season_id === seasonId)
            .sort((a, b) => a.day - b.day || String(a.start_time).localeCompare(String(b.start_time), 'sl'));
        if (termsList.length === 0) {
            box.innerHTML = '<p class="muted">Za to sezono ni terminov.</p>';
            return;
        }
        let html = '';
        termsList.forEach(term => {
            const assigned = swimmers.filter(s => !s.is_deleted && s.terms && s.terms.includes(term.id))
                .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'sl'));
            const names = assigned.length
                ? assigned.map(s => `${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}`).join(', ')
                : '<span class="muted">Brez dodeljenih plavalcev</span>';
            const label = escapeHtml(term.label || term.id);
            html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px;background:#fafafa">
              <strong>${label}</strong>
              <span class="muted" style="font-size:12px"> · ${escapeHtml(formatDate(term.date_from))} – ${escapeHtml(formatDate(term.date_to))}</span>
              <div style="margin-top:8px;font-size:14px">${names}</div>
            </div>`;
        });
        box.innerHTML = html;
    }

    async function getSeasonFeesTotals(season) {
        const fromY = new Date(season.date_from).getFullYear();
        const toY = new Date(season.date_to).getFullYear();
        try {
            const { data, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('swimmer_id, year, month, monthly_fee, discount, is_oly')
                .gte('year', fromY)
                .lte('year', toY);
            if (error) throw error;
            let total = 0;
            let rows = 0;
            let olyRows = 0;
            let fromRegular = 0;
            let fromOly = 0;
            (data || []).forEach(row => {
                if (!ymInSeasonRange(row.year, row.month, season)) return;
                if (!shouldIncludeSwimmerInBillingMonth(row.swimmer_id, row.month, row.year, season, season.id)) return;
                rows++;
                if (row.is_oly === true) {
                    total += OLY_MONTHLY_CONTRIBUTION_EUR;
                    fromOly += OLY_MONTHLY_CONTRIBUTION_EUR;
                    olyRows++;
                } else {
                    const part = parseFloat(row.monthly_fee || 0) - parseFloat(row.discount || 0);
                    total += part;
                    fromRegular += part;
                }
            });
            return { total, rows, olyRows, fromRegular, fromOly };
        } catch (e) {
            console.error('Napaka pri seštevku vadnin za sezono:', e);
            return { total: 0, rows: 0, olyRows: 0, fromRegular: 0, fromOly: 0 };
        }
    }

    function getSeasonMonthTuples(season) {
        const out = [];
        const s = new Date(season.date_from);
        const e = new Date(season.date_to);
        let y = s.getFullYear();
        let m = s.getMonth() + 1;
        const endY = e.getFullYear();
        const endM = e.getMonth() + 1;
        while (y < endY || (y === endY && m <= endM)) {
            out.push({ year: y, month: m });
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return out;
    }

    /** Izračun stroškov trenerjev in objektov za en mesec (kot Finance). */
    async function computeCalculatedCostsForMonth(year, month, seasonId = null) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const trainerRates = await getTrainerRatesFromDB(month, year);
        const termCosts = await getTermCostsFromDB();
        const trainerCosts = {};
        const seasonTermIds = seasonId ? getAdminSeasonTermIdsForSeason(seasonId) : null;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);

            TERMS.forEach(term => {
                if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                if (term.day !== dayOfWeek || isoDate < term.date_from || isoDate > term.date_to) return;

                const trainersForTerm = trainers.filter(t =>
                    t.terms && t.terms.includes(term.id) && !t.is_deleted
                );
                const tStart = new Date(`2000-01-01T${term.start_time}`);
                const tEnd = new Date(`2000-01-01T${term.end_time}`);
                const durationHours = (tEnd - tStart) / (1000 * 60 * 60);

                trainersForTerm.forEach(trainer => {
                    const key = `${trainer.id}`;
                    if (!trainerCosts[key]) {
                        trainerCosts[key] = { trainer, sessions: 0, totalHours: 0, cost: 0 };
                    }
                    const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                    if (!trainerAtt || trainerAtt.present !== false) {
                        trainerCosts[key].sessions += 1;
                        trainerCosts[key].totalHours += durationHours;
                    } else if (trainerAtt.present === false && trainerAtt.note) {
                        const substituteIdMatch = trainerAtt.note.match(/\(([a-f0-9-]{36})\)/);
                        if (substituteIdMatch) {
                            const substituteTrainerId = substituteIdMatch[1];
                            const substituteTrainer = trainers.find(t => t.id === substituteTrainerId && !t.is_deleted);
                            if (substituteTrainer) {
                                const substituteKey = `${substituteTrainer.id}`;
                                if (!trainerCosts[substituteKey]) {
                                    trainerCosts[substituteKey] = {
                                        trainer: substituteTrainer,
                                        sessions: 0,
                                        totalHours: 0,
                                        cost: 0
                                    };
                                }
                                trainerCosts[substituteKey].sessions += 1;
                                trainerCosts[substituteKey].totalHours += durationHours;
                            }
                        }
                    }
                });

                if (trainerAttendance[isoDate]?.[term.id]) {
                    Object.keys(trainerAttendance[isoDate][term.id]).forEach(trainerId => {
                        const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                        if (!isRegularlyAssigned) {
                            const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                            if (trainer) {
                                const key = `${trainer.id}`;
                                if (!trainerCosts[key]) {
                                    trainerCosts[key] = {
                                        trainer,
                                        sessions: 0,
                                        totalHours: 0,
                                        cost: 0
                                    };
                                }
                                const tAtt = trainerAttendance[isoDate][term.id][trainerId];
                                if (tAtt && tAtt.present === true) {
                                    trainerCosts[key].sessions += 1;
                                    trainerCosts[key].totalHours += durationHours;
                                }
                            }
                        }
                    });
                }
            });
        }

        for (const trainerCost of Object.values(trainerCosts)) {
            const ratePerSession = trainerRates[trainerCost.trainer.id] || 25;
            trainerCost.cost = calcTrainerCostFromSessions(trainerCost.sessions, ratePerSession);
        }
        const totalTrainerCost = Object.values(trainerCosts).reduce((sum, tc) => sum + tc.cost, 0);

        let totalFacilityCost = 0;
        for (const term of TERMS) {
            if (seasonTermIds && !seasonTermIds.has(term.id)) continue;
            const termHourlyCost = termCosts[term.id] || 50;
            if (termHourlyCost <= 0) continue;
            const termStartDate = new Date(term.date_from);
            const termEndDate = new Date(term.date_to);
            if (startDate > termEndDate || endDate < termStartDate) continue;

            const st = new Date(`2000-01-01T${term.start_time}`);
            const et = new Date(`2000-01-01T${term.end_time}`);
            const durationHours = (et - st) / (1000 * 60 * 60);

            let termExecutionsInMonth = 0;
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                const isoDate = iso(d);
                if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                    const ts = getTermStatus(d, term.id);
                    if (ts.status !== 'inactive') termExecutionsInMonth += 1;
                }
            }
            totalFacilityCost += termExecutionsInMonth * durationHours * termHourlyCost;
        }

        return { totalTrainerCost, totalFacilityCost };
    }

    async function computeSeasonFinanceRollup(season) {
        const tuples = getSeasonMonthTuples(season);
        const mgmtDefault = parseFloat(elManagementCostPerMonth?.value) || 500;
        let facility = 0;
        let trainerC = 0;
        let management = 0;
        let membership = 0;
        for (const { year, month } of tuples) {
            const manual = await getManualCostsFromDB(month, year);
            let f = manual?.facilityCost;
            let t = manual?.trainerCost;
            let m = manual?.managementCost;
            if (f === undefined || t === undefined) {
                const calc = await computeCalculatedCostsForMonth(year, month, season.id);
                if (f === undefined) f = calc.totalFacilityCost;
                if (t === undefined) t = calc.totalTrainerCost;
            }
            if (m === undefined) m = mgmtDefault;
            facility += f;
            trainerC += t;
            management += m;
            // Zgodovinski ročni vnosi članarine (nove se štejejo iz swimmer_season_billing spodaj)
            membership += parseFloat(manual?.membershipFee || 0);
        }
        // Članarine, obračunane plavalcem te sezone (30 € na plavalca, enkrat na sezono)
        if (season?.id) {
            const monthsInSeason = new Set(tuples.map(t => `${t.year}-${t.month}`));
            Object.entries(swimmerSeasonBilling).forEach(([key, rec]) => {
                if (!key.endsWith(`|${season.id}`)) return;
                if (!rec.membership_charged_month || !rec.membership_charged_year) return;
                if (!monthsInSeason.has(`${rec.membership_charged_year}-${rec.membership_charged_month}`)) return;
                membership += getMembershipFeeAmount();
            });
        }
        return { facility, trainer: trainerC, management, membership, months: tuples.length };
    }

    function pct(att, pos) {
        if (pos <= 0) return '—';
        const p = Math.min(100, (att / pos) * 100);
        return p.toFixed(1) + ' %';
    }

    async function runSeasonReport() {
        const sel = document.getElementById('seasonReportSelect');
        const out = document.getElementById('seasonReportOutput');
        if (!sel || !out) return;
        const id = sel.value;
        if (!id) {
            showMessage('Izberite sezono.', 'warning');
            return;
        }
        const season = seasons.find(s => s.id === id);
        if (!season) {
            out.innerHTML = '<p class="muted">Sezona ni najdena.</p>';
            return;
        }
        out.innerHTML = '<p class="muted">Nalagam prisotnost in statuse za celotno obdobje sezone …</p>';
        await loadAttendanceForDateRange(season.date_from, season.date_to);
        await loadTermStatusForDateRange(season.date_from, season.date_to);
        out.innerHTML = '<p class="muted">Računanje …</p>';
        const scopeEl = document.getElementById('seasonReportAttendanceScope');
        const scope = scopeEl?.value || 'all';
        let stats;
        if (scope === 'oly') {
            const olyIds = await getOlySwimmerIdsForSeason(season);
            if (olyIds.size === 0) {
                showMessage('V obdobju te sezone ni OLY vadninskih zapisov (preverite Finance).', 'warning');
            }
            stats = buildSeasonAttendanceStats(season, olyIds);
        } else {
            stats = buildSeasonAttendanceStats(season, null);
        }
        const attScopeLabel = scope === 'oly' ? 'OLY (filtrirano)' : 'vsi dodeljeni';
        const fees = await getSeasonFeesTotals(season);
        const fin = await computeSeasonFinanceRollup(season);
        const revenueTotal = fees.total + fin.membership;
        const costTotal = fin.facility + fin.trainer + fin.management;
        const net = revenueTotal - costTotal;
        const netClass = net >= 0 ? '#166534' : '#991b1b';
        const olyDetail = fees.olyRows > 0
            ? ` · OLY: ${fees.fromOly.toFixed(2)} € (${fees.olyRows} zap., po ${OLY_MONTHLY_CONTRIBUTION_EUR} €)`
            : '';
        const regDetail = fees.fromRegular > 0 || fees.olyRows === 0
            ? `Običajne vadnine: ${fees.fromRegular.toFixed(2)} €`
            : '';
        const html = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:20px">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#0369a1">Terminov v sezoni</div>
              <div style="font-size:22px;font-weight:700">${stats.termCount}</div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#166534">Skupna prisotnost (vsi termini) · ${attScopeLabel}</div>
              <div style="font-size:22px;font-weight:700">${pct(stats.attAll, stats.posAll)}</div>
              <div style="font-size:13px;color:#444">${stats.attAll} / ${stats.posAll} prisotnih / možnih (cela sezona, seštevek vseh plavalcev)</div>
              <div style="font-size:12px;color:#444;margin-top:8px;line-height:1.4"><span class="muted">Dodatno — povpr. po treningih:</span> ${stats.sessAvgPctAll != null ? stats.sessAvgPctAll + ' %' : '—'} <span class="muted">(${stats.sessCountAll} izvedb)</span> · <span class="muted">povpr. individualno:</span> ${stats.avgIndividualPctAll != null ? stats.avgIndividualPctAll + ' %' : '—'}</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde047;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#854d0e">Jutranji (&lt; 12:00)</div>
              <div style="font-size:22px;font-weight:700">${pct(stats.attMorn, stats.posMorn)}</div>
              <div style="font-size:13px;color:#444">${stats.attMorn} / ${stats.posMorn} prisotnih / možnih</div>
            </div>
            <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#6b21a8">Popoldanski (≥ 12:00)</div>
              <div style="font-size:22px;font-weight:700">${pct(stats.attAfter, stats.posAfter)}</div>
              <div style="font-size:13px;color:#444">${stats.attAfter} / ${stats.posAfter} prisotnih / možnih</div>
            </div>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#991b1b">Prihodki vadnin (+ članarine)</div>
              <div style="font-size:22px;font-weight:700">${revenueTotal.toFixed(2)} €</div>
              <div style="font-size:13px;color:#444">${regDetail}${olyDetail} · Skupaj vadnine+OLY: ${fees.total.toFixed(2)} € (${fees.rows} zapisov)${fin.membership > 0 ? ` · Član.: ${fin.membership.toFixed(2)} €` : ''}</div>
            </div>
            <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#9a3412">Stroški objektov (seštevek mesecev)</div>
              <div style="font-size:22px;font-weight:700">${fin.facility.toFixed(2)} €</div>
              <div style="font-size:13px;color:#444">${fin.months} mesecev · ročno v Finance ali izračun</div>
            </div>
            <div style="background:#ecfeff;border:1px solid #67e8f9;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#0e7490">Stroški trenerjev</div>
              <div style="font-size:22px;font-weight:700">${fin.trainer.toFixed(2)} €</div>
              <div style="font-size:13px;color:#444">Urne postavke po mesecih</div>
            </div>
            <div style="background:#f5f5f4;border:1px solid #d6d3d1;border-radius:8px;padding:14px">
              <div style="font-size:12px;color:#44403c">Vodenje (mesečni strošek)</div>
              <div style="font-size:22px;font-weight:700">${fin.management.toFixed(2)} €</div>
              <div style="font-size:13px;color:#444">Privzeto z nastavitve »Strošek vodenja« v Finance</div>
            </div>
            <div style="background:#ecfdf5;border:2px solid ${netClass};border-radius:8px;padding:14px;grid-column:1/-1">
              <div style="font-size:12px;color:${netClass}"><strong>Letni poračun (v obdobju sezone)</strong></div>
              <div style="font-size:24px;font-weight:700;color:${netClass}">${net >= 0 ? '+' : ''}${net.toFixed(2)} €</div>
              <div style="font-size:13px;color:#444">Prihodki (${revenueTotal.toFixed(2)} €) − skupaj stroški (${costTotal.toFixed(2)} €)</div>
            </div>
          </div>
          <p class="muted" style="font-size:13px;line-height:1.5;margin-top:16px">
            <strong>Skupna prisotnost</strong> je <strong>vsota vseh zabeleženih prisotnosti / vsota vseh možnih obiskov</strong> v izbranem obdobju sezone (po vseh dnevih, vseh terminih sezone in vseh dodeljenih plavalcih). Jutro in popoldan sta isti račun, ločeno po uri začetka termina. Če je delež nad 100 %, je prikaz omejen na 100 % (preverite podvojene zapise ali nadomestne obiske).<br>
            Ob izračunu poročila se iz baze za celotno obdobje sezone znova naložita prisotnost in statusi terminov (vsi zapisi, ne le prvih 1000).<br>
            <strong>Pravila:</strong> aktivni termini sezone; plavalec z dodeljenim terminom; nadomestni obiski brez dodelitve v možne niso všteti.<br>
            <strong>Prihodki:</strong> OLY zapisi v <code>swimmer_monthly_fees</code> štejejo <strong>${OLY_MONTHLY_CONTRIBUTION_EUR} €</strong> na zapis na mesec (ne znesek vadnine v tabeli).<br>
            <strong>Stroški:</strong> ročno v Finance ali izračun; preverite »Strošek vodenja na mesec«.
          </p>
        `;
        out.innerHTML = html;
    }

    // ===== FUNKCIJE ZA FINANCE SEKCIJO =====
    
    
    // Funkcija za shranjevanje stroškov prog po terminih
    function saveTermCosts() {
        const termCosts = {};
        TERMS.forEach(term => {
            const input = document.getElementById(`term-cost-${term.id}`);
            if (input) {
                termCosts[term.id] = parseFloat(input.value) || 0;
            }
        });
        
        localStorage.setItem('termCosts', JSON.stringify(termCosts));
        alert('Stroški prog po terminih so bili shranjeni!');
        
        // Osveži Finance sekcijo, če je prikazana
        if (document.getElementById('finance-section').classList.contains('active')) {
            calculateFinanceData();
        }
    }
    
    // Funkcija za shranjevanje urnih postavk trenerjev
    function saveTrainerRates() {
        const trainerRates = {};
        trainers.forEach(trainer => {
            if (!trainer.is_deleted) {
                const input = document.getElementById(`trainer-rate-${trainer.id}`);
                if (input) {
                    trainerRates[trainer.id] = parseFloat(input.value) || 25;
                }
            }
        });
        
        localStorage.setItem('trainerRates', JSON.stringify(trainerRates));
        alert('Urne postavke trenerjev so bile shranjene!');
        
        // Osveži Finance sekcijo, če je prikazana
        if (document.getElementById('finance-section').classList.contains('active')) {
            calculateFinanceData();
        }
    }
    
    // Funkcija za pridobivanje stroška prog za termin
    async function getTermCost(termId) {
        const termCosts = await getTermCostsFromDB();
        return termCosts[termId] || 800;
    }
    
    // Funkcija za pridobivanje urne postavke trenerja
    async function getTrainerRate(trainerId, month = null, year = null) {
        // Uporabi trenutni mesec in leto za finance, če nista podana
        const targetMonth = month || currentFinanceMonth;
        const targetYear = year || currentFinanceYear;
        const trainerRates = await getTrainerRatesFromDB(targetMonth, targetYear);
        return trainerRates[trainerId] || 25;
    }
    
    // Funkcija za izračun finančnih podatkov
    async function calculateFinanceData() {
        try {
            const month = currentFinanceMonth;
            const year = currentFinanceYear;
// console.log('🔍 calculateFinanceData - mesec:', month, 'leto:', year);
// console.log('🔍 calculateFinanceData - mesec tip:', typeof month, 'leto tip:', typeof year);
            

            
            if (month === undefined || year === undefined) {
// console.log('❌ calculateFinanceData - mesec ali leto ni definiran');
                elFinanceSummaryBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
                elDetailedCostsBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
                return;
            }

            // Ustvari datume za mesec
            const startDate = new Date(year, month - 1, 1); // month - 1 ker je JavaScript 0-based
            const endDate = new Date(year, month, 0); // month ker je JavaScript 0-based
// console.log('🔍 calculateFinanceData - startDate:', startDate, 'endDate:', endDate);
// console.log('🔍 calculateFinanceData - startDate mesec:', startDate.getMonth() + 1, 'endDate mesec:', endDate.getMonth() + 1);
            

            
            // Pridobi nastavitve cen
            const managementCostPerMonth = parseFloat(elManagementCostPerMonth.value) || 500;
// console.log('🔍 calculateFinanceData - managementCostPerMonth:', managementCostPerMonth);
            
            // Izračunaj prihodke - uporabi individualne pristojbine plavalcev
            // Filtrirati samo plavalce, ki imajo dodeljene termine
            const activeSwimmers = swimmers.filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s));
// console.log('🔍 calculateFinanceData - activeSwimmers:', activeSwimmers.length);

            
            // Pridobi pristojbine plavalcev iz baze
            const swimmerFees = await getSwimmerFeesFromDB(month, year);
// console.log('🔍 calculateFinanceData - swimmerFees:', swimmerFees.length);
// console.log('🔍 calculateFinanceData - swimmerFees za mesec:', month, 'leto:', year);

            
            const seasonId = getAdminSeasonFilterId();
            const season = seasons.find(s => s.id === seasonId);
            let totalRevenue = 0;
// console.log('🔍 calculateFinanceData - začenjam izračun prihodkov...');
            
            // Preštej OLY plavalce in dodaj njihove prispevke
            let olyContributions = 0;
            // Članarine plavalcev, ki jih imajo obračunane v tem mesecu (OLY je ne plačajo)
            let membershipRevenue = 0;
            let membershipCount = 0;
            activeSwimmers.forEach(swimmer => {
                const plan = getSwimmerPaymentPlan(swimmer.id, seasonId);
                const feeDataRaw = swimmerFees[swimmer.id];
                const isOlySwimmer = feeDataRaw?.is_oly === true;

                if (!isOlySwimmer && isMembershipChargedInMonth(swimmer.id, seasonId, month, year)) {
                    membershipRevenue += getMembershipFeeAmount();
                    membershipCount++;
                }

                if (!shouldIncludeSwimmerInBillingMonth(swimmer.id, month, year, season, seasonId)) return;

                let feeData = feeDataRaw;
                if (!feeData) {
                    if (plan !== 'monthly') return;
                    const termCount = getSwimmerSeasonTermLabels(swimmer).length;
                    feeData = { fee: getDefaultSwimmerFeeByTermCount(termCount, plan), discount: 0, is_oly: false };
                }
                
                // Če je OLY plavalec, dodaj prispevek (enako kot letno poročilo)
                if (feeData.is_oly) {
                    olyContributions += OLY_MONTHLY_CONTRIBUTION_EUR;
                } else {
                    // Če ni OLY, upoštevaj normalno vadnino
                    const finalFee = Math.max(0, feeData.fee - (feeData.discount || 0));
                    totalRevenue += finalFee;
                }
                //// console.log('🔍 calculateFinanceData - plavalec:', swimmer.first_name, swimmer.last_name, 'fee:', feeData.fee, 'discount:', feeData.discount, 'is_oly:', feeData.is_oly);

            });
            
            // Dodaj OLY prispevke skupnim prihodkom
            totalRevenue += olyContributions;
            

            
            // Izračunaj stroške trenerjev - na podlagi ur (enako kot v tabelici ur in stroškov)
            let totalTrainerSessions = 0;
            let totalTrainerHours = 0;
            let trainerCosts = {};
            
            // Pridobi postavke trenerjev iz baze za trenutni mesec in leto
            const trainerRates = await getTrainerRatesFromDB(currentFinanceMonth, currentFinanceYear);
            const seasonTermIds = getAdminSeasonTermIds();

            // Iteriraj po vseh dnevih v mesecu
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                const isoDate = iso(d);
                
                TERMS.forEach(term => {
                    if (seasonTermIds && !seasonTermIds.has(term.id)) return;
                    if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                        // Poišči trenerje za ta termin (redno dodeljeni)
                        const trainersForTerm = trainers.filter(t => 
                            t.terms && t.terms.includes(term.id) && !t.is_deleted
                        );
                        
                        // Izračunaj trajanje termina v urah
                        const startTime = new Date(`2000-01-01T${term.start_time}`);
                        const endTime = new Date(`2000-01-01T${term.end_time}`);
                        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                        
                        // Dodaj redno dodeljene trenerje
                        trainersForTerm.forEach(trainer => {
                            const key = `${trainer.id}`;
                            if (!trainerCosts[key]) {
                                trainerCosts[key] = {
                                    trainer: trainer,
                                    sessions: 0,
                                    totalHours: 0,
                                    cost: 0
                                };
                            }
                            
                            // Preveri, ali je trener prisoten na ta dan
                            const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                            if (!trainerAtt || trainerAtt.present !== false) {
                                // Trener je prisoten (ali ni označen kot odsoten)
                                trainerCosts[key].sessions += 1;
                                trainerCosts[key].totalHours += durationHours;
                                totalTrainerSessions += 1;
                                totalTrainerHours += durationHours;
                            } else if (trainerAtt.present === false) {
                                // Trener je odsoten, preveri nadomestnega trenerja
                                if (trainerAtt.note) {
                                    const substituteIdMatch = trainerAtt.note.match(/\(([a-f0-9-]{36})\)/);
                                    if (substituteIdMatch) {
                                        const substituteTrainerId = substituteIdMatch[1];
                                        const substituteTrainer = trainers.find(t => t.id === substituteTrainerId && !t.is_deleted);
                                        
                                        if (substituteTrainer) {
                                            const substituteKey = `${substituteTrainer.id}`;
                                            
                                            if (!trainerCosts[substituteKey]) {
                                                trainerCosts[substituteKey] = {
                                                    trainer: substituteTrainer,
                                                    sessions: 0,
                                                    totalHours: 0,
                                                    cost: 0
                                                };
                                            }
                                            
                                            trainerCosts[substituteKey].sessions += 1;
                                            trainerCosts[substituteKey].totalHours += durationHours;
                                            totalTrainerSessions += 1;
                                            totalTrainerHours += durationHours;
                                        }
                                    }
                                }
                            }
                        });
                        
                        // Dodaj nadomestne trenerje iz trainer_attendance (ki niso redno dodeljeni)
                        if (trainerAttendance[isoDate]?.[term.id]) {
                            Object.keys(trainerAttendance[isoDate][term.id]).forEach(trainerId => {
                                // Preveri, če trener ni že vključen kot redno dodeljen
                                const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                                if (!isRegularlyAssigned) {
                                    const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                                    if (trainer) {
                                        const key = `${trainer.id}`;
                                        if (!trainerCosts[key]) {
                                            trainerCosts[key] = {
                                                trainer: trainer,
                                                sessions: 0,
                                                totalHours: 0,
                                                cost: 0
                                            };
                                        }
                                        
                                        const trainerAtt = trainerAttendance[isoDate][term.id][trainerId];
                                        if (trainerAtt && trainerAtt.present === true) {
                                            trainerCosts[key].sessions += 1;
                                            trainerCosts[key].totalHours += durationHours;
                                            totalTrainerSessions += 1;
                                            totalTrainerHours += durationHours;
                                        }
                                    }
                                }
                            });
                        }
                    }
                });
            }
            
            // Izračunaj stroške trenerjev - na podlagi terminov (€/termin)
            for (const trainerCost of Object.values(trainerCosts)) {
                const ratePerSession = trainerRates[trainerCost.trainer.id] || 25;
                trainerCost.cost = calcTrainerCostFromSessions(trainerCost.sessions, ratePerSession);
            }
            
            const totalTrainerCost = Object.values(trainerCosts).reduce((sum, tc) => sum + tc.cost, 0);

            
            // Izračunaj stroške prog po terminih - za vsak izveden termin v mesecu
            let totalFacilityCost = 0;
            
            // Pridobi stroške prog iz baze
            const termCosts = await getTermCostsFromDB();

            // Termini, ki v izbranem mesecu dejansko tečejo (tudi če je sezona že končana)
            const termsInMonth = TERMS.filter(term => {
                const seasonTermIds = getAdminSeasonTermIds();
                if (seasonTermIds && !seasonTermIds.has(term.id)) return false;
                const termStartDate = new Date(term.date_from);
                const termEndDate = new Date(term.date_to);
                return startDate <= termEndDate && endDate >= termStartDate;
            });

            for (const term of termsInMonth) {
                const termHourlyCost = termCosts[term.id] || 50; // Default 50€/uro

                if (termHourlyCost > 0) {
                    // Izračunaj trajanje termina v urah
                    const startTime = new Date(`2000-01-01T${term.start_time}`);
                    const endTime = new Date(`2000-01-01T${term.end_time}`);
                    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

                    // Preštej vse dni v mesecu, ko se termin izvaja
                    let termExecutionsInMonth = 0;
                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                        const isoDate = iso(d);

                        if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                            const termStatusForDay = getTermStatus(d, term.id);
                            if (termStatusForDay.status !== 'inactive') {
                                termExecutionsInMonth += 1;
                            }
                        }
                    }

                    totalFacilityCost += termExecutionsInMonth * durationHours * termHourlyCost;
                }
            }
            

            
            // Naloži ročno vnesene vrednosti za summary (če obstajajo) - najprej iz baze
            const summaryDbManualCosts = await getManualCostsFromDB(currentFinanceMonth, currentFinanceYear);
            const summaryManualCostsKey = `manualCosts_${currentFinanceYear}_${currentFinanceMonth}`;
            const summaryLocalStorageCosts = JSON.parse(localStorage.getItem(summaryManualCostsKey) || '{}');
            // Članarina se sešteje samodejno iz plavalcev z obračunom v tem mesecu
            const summaryMembershipFee = membershipRevenue;
            
            // Uporabi ročno vnesene vrednosti za summary, če obstajajo
            const summaryMonthlyFee = (summaryDbManualCosts?.monthlyFee !== undefined ? summaryDbManualCosts.monthlyFee : summaryLocalStorageCosts.monthlyFee);
            const summaryTrainerCost = (summaryDbManualCosts?.trainerCost !== undefined ? summaryDbManualCosts.trainerCost : summaryLocalStorageCosts.trainerCost);
            const summaryManagementCost = (summaryDbManualCosts?.managementCost !== undefined ? summaryDbManualCosts.managementCost : summaryLocalStorageCosts.managementCost);
            const summaryFacilityCost = (summaryDbManualCosts?.facilityCost !== undefined ? summaryDbManualCosts.facilityCost : summaryLocalStorageCosts.facilityCost);
            
            // Skupni stroški - uporabi ročno vnesene vrednosti, če obstajajo, sicer izračunane
            const finalTrainerCost = summaryTrainerCost !== undefined ? summaryTrainerCost : totalTrainerCost;
            const finalManagementCost = summaryManagementCost !== undefined ? summaryManagementCost : managementCostPerMonth;
            const finalFacilityCost = summaryFacilityCost !== undefined ? summaryFacilityCost : totalFacilityCost;
            const totalCosts = finalTrainerCost + finalManagementCost + finalFacilityCost;
            
            // Prihodki - uporabi ročno vneseno mesečno vadnino, če obstaja, sicer izračunano
            const finalMonthlyFee = summaryMonthlyFee !== undefined ? summaryMonthlyFee : (totalRevenue - olyContributions);
            const totalRevenueWithMembership = finalMonthlyFee + olyContributions + summaryMembershipFee;
            
            // Dobiček/izguba
            const profit = totalRevenueWithMembership - totalCosts;
            

            
    
            
            // Prikaži povzetek - uporabi ročno vnesene vrednosti iz tabele
            let summary = `
                <div class="finance-summary">
                    <div class="finance-card revenue">
                        <h4>Prihodki</h4>
                        <div class="amount">${totalRevenueWithMembership.toFixed(2)} €</div>
                        <div class="details">${activeSwimmers.length} plavalcev (individualne pristojbine${olyContributions > 0 ? ` + ${olyContributions}€ OLY prispevkov` : ''}${summaryMembershipFee > 0 ? ` + ${summaryMembershipFee.toFixed(2)}€ članarina (${membershipCount})` : ''})</div>
                    </div>
                    <div class="finance-card costs">
                        <h4>Stroški</h4>
                        <div class="amount">${totalCosts.toFixed(2)} €</div>
                        <div class="details">
                            Trenerji: ${finalTrainerCost.toFixed(2)} €<br>
                            Vodenje: ${finalManagementCost.toFixed(2)} €<br>
                            Objekti: ${finalFacilityCost.toFixed(2)} €
                        </div>
                    </div>
                    <div class="finance-card ${profit >= 0 ? 'profit' : 'loss'}">
                        <h4>${profit >= 0 ? 'Dobiček' : 'Izguba'}</h4>
                        <div class="amount">${profit.toFixed(2)} €</div>
                        <div class="details">${profit >= 0 ? 'Pozitivno' : 'Negativno'} stanje</div>
                    </div>
                </div>
            `;
            
            elFinanceSummaryBox.innerHTML = summary;
            
            // Naloži ročno vnesene vrednosti (če obstajajo) - najprej iz baze, nato iz localStorage kot fallback
            const dbManualCosts = await getManualCostsFromDB(currentFinanceMonth, currentFinanceYear);
            const manualCostsKey = `manualCosts_${currentFinanceYear}_${currentFinanceMonth}`;
            const localStorageManualCosts = JSON.parse(localStorage.getItem(manualCostsKey) || '{}');
            
            // Prednost ima baza, če obstaja, sicer localStorage
            const savedManualCosts = dbManualCosts || {
                monthlyFee: localStorageManualCosts.monthlyFee,
                trainerCost: localStorageManualCosts.trainerCost,
                managementCost: localStorageManualCosts.managementCost,
                facilityCost: localStorageManualCosts.facilityCost,
                membershipFee: localStorageManualCosts.membershipFee
            };
            
            // Izračunane vrednosti (uporabijo se, če ni ročno vnesene vrednosti)
            const calculatedMonthlyFee = totalRevenue - olyContributions;
            const calculatedTrainerCost = totalTrainerCost;
            const calculatedManagementCost = managementCostPerMonth;
            const calculatedFacilityCost = totalFacilityCost;
            
            // Uporabi ročno vnesene vrednosti, če obstajajo, sicer uporabi izračunane
            const monthlyFee = savedManualCosts.monthlyFee !== undefined ? savedManualCosts.monthlyFee : calculatedMonthlyFee;
            const trainerCost = savedManualCosts.trainerCost !== undefined ? savedManualCosts.trainerCost : calculatedTrainerCost;
            const managementCost = savedManualCosts.managementCost !== undefined ? savedManualCosts.managementCost : calculatedManagementCost;
            const facilityCost = savedManualCosts.facilityCost !== undefined ? savedManualCosts.facilityCost : calculatedFacilityCost;
            
            // Članarina - samodejno iz plavalcev z obračunom v tem mesecu (30 € na plavalca)
            const membershipFee = membershipRevenue;
            
            // Ponovno izračunaj skupne vrednosti z ročno vnesenimi vrednostmi
            const manualTotalRevenue = monthlyFee + olyContributions + membershipFee;
            const manualTotalCosts = trainerCost + managementCost + facilityCost;
            const manualProfit = manualTotalRevenue - manualTotalCosts;

            updateFinanceMonthSummaryBar(manualTotalRevenue, manualTotalCosts, manualProfit, month, year);
            
            // Prikaži podrobnosti stroškov z urejnimi polji
            let detailedCosts = `
                <table>
                    <thead>
                        <tr>
                            <th>Kategorija</th>
                            <th>Znesek</th>
                            <th>Opis</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Mesečna vadnina</td>
                            <td>
                                <input type="number" 
                                       id="manual-monthly-fee" 
                                       value="${monthlyFee.toFixed(2)}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 120px; text-align: right;"
                                       onchange="saveManualCost('monthlyFee', this.value, ${currentFinanceMonth}, ${currentFinanceYear})">
                                <span> €</span>
                                ${monthlyFee !== calculatedMonthlyFee ? `<span style="color: #999; font-size: 11px; margin-left: 5px;">(izračunano: ${calculatedMonthlyFee.toFixed(2)}€)</span>` : ''}
                            </td>
                            <td>${activeSwimmers.length - Math.round(olyContributions / OLY_MONTHLY_CONTRIBUTION_EUR)} aktivnih plavalcev (individualne pristojbine)</td>
                        </tr>
                        <tr>
                            <td>Članarina</td>
                            <td>${membershipFee.toFixed(2)} €</td>
                            <td>${membershipCount} ${membershipCount === 1 ? 'plavalec' : 'plavalcev'} × ${getMembershipFeeAmount()} € (obračun nastavite v poročilu za računovodstvo)</td>
                        </tr>
                        ${olyContributions > 0 ? `
                        <tr>
                            <td>OLY prispevki</td>
                            <td>${olyContributions.toFixed(2)} €</td>
                            <td>${Math.round(olyContributions / OLY_MONTHLY_CONTRIBUTION_EUR)} OLY plavalcev (${OLY_MONTHLY_CONTRIBUTION_EUR}€ na plavalca)</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td><strong>Skupaj prihodki</strong></td>
                            <td><strong>${manualTotalRevenue.toFixed(2)} €</strong></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Stroški trenerjev</td>
                            <td>
                                <input type="number" 
                                       id="manual-trainer-cost" 
                                       value="${trainerCost.toFixed(2)}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 120px; text-align: right;"
                                       onchange="saveManualCost('trainerCost', this.value, ${currentFinanceMonth}, ${currentFinanceYear})">
                                <span> €</span>
                                ${trainerCost !== calculatedTrainerCost ? `<span style="color: #999; font-size: 11px; margin-left: 5px;">(izračunano: ${calculatedTrainerCost.toFixed(2)}€)</span>` : ''}
                            </td>
                            <td>${totalTrainerSessions} terminov (individualne postavke na termin)</td>
                        </tr>
                        <tr>
                            <td>Stroški vodenja</td>
                            <td>
                                <input type="number" 
                                       id="manual-management-cost" 
                                       value="${managementCost.toFixed(2)}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 120px; text-align: right;"
                                       onchange="saveManualCost('managementCost', this.value, ${currentFinanceMonth}, ${currentFinanceYear})">
                                <span> €</span>
                                ${managementCost !== calculatedManagementCost ? `<span style="color: #999; font-size: 11px; margin-left: 5px;">(izračunano: ${calculatedManagementCost.toFixed(2)}€)</span>` : ''}
                            </td>
                            <td>Fiksni mesečni strošek</td>
                        </tr>
                        <tr>
                            <td>Stroški objektov</td>
                            <td>
                                <input type="number" 
                                       id="manual-facility-cost" 
                                       value="${facilityCost.toFixed(2)}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 120px; text-align: right;"
                                       onchange="saveManualCost('facilityCost', this.value, ${currentFinanceMonth}, ${currentFinanceYear})">
                                <span> €</span>
                                ${facilityCost !== calculatedFacilityCost ? `<span style="color: #999; font-size: 11px; margin-left: 5px;">(izračunano: ${calculatedFacilityCost.toFixed(2)}€)</span>` : ''}
                            </td>
                            <td>Stroški prog po terminih</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>Skupaj stroški</strong></td>
                            <td><strong>${manualTotalCosts.toFixed(2)} €</strong></td>
                            <td></td>
                        </tr>
                        <tr style="background: #f0f0f0;">
                            <td colspan="3"></td>
                        </tr>
                        <tr class="profit-row ${manualProfit >= 0 ? 'positive' : 'negative'}">
                            <td><strong>${manualProfit >= 0 ? 'Dobiček' : 'Izguba'}</strong></td>
                            <td><strong>${manualProfit.toFixed(2)} €</strong></td>
                            <td>${manualProfit >= 0 ? 'Pozitivno stanje' : 'Negativno stanje'}</td>
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top: 12px;">
                    <span style="color: #666; font-size: 12px;">
                        Ročno vnesene vrednosti se shranjujejo avtomatsko ob spremembi v SQL bazo
                    </span>
                </div>
            `;
            
            elDetailedCostsBox.innerHTML = detailedCosts;
        } catch (error) {
            console.error('Error in calculateFinanceData:', error);
            elFinanceSummaryBox.innerHTML = '<p class="error">Napaka pri izračunu finančnih podatkov</p>';
            elDetailedCostsBox.innerHTML = '<p class="error">Napaka pri izračunu finančnih podatkov</p>';
        }
    }
    
    function updateFinanceMonthSummaryBar(revenue, costs, profit, month, year) {
        const el = document.getElementById('financeMonthSummary');
        if (!el) return;
        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        el.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:12px;font-size:14px">
            <span><strong>${escapeHtml(monthLabel)}</strong></span>
            <span>Prihodki: <strong>${revenue.toFixed(2)} €</strong></span>
            <span>Stroški: <strong>${costs.toFixed(2)} €</strong></span>
            <span>${profit >= 0 ? 'Dobiček' : 'Izguba'}: <strong style="color:${profit >= 0 ? '#166534' : '#991b1b'}">${profit.toFixed(2)} €</strong></span>
        </div>`;
    }

    // Funkcija za shranjevanje nastavitev cen
    async function saveCostSettings() {
        const managementCostPerMonth = parseFloat(elManagementCostPerMonth.value);
        localStorage.setItem('managementCostPerMonth', managementCostPerMonth);
        await saveManualCost('managementCost', managementCostPerMonth, currentFinanceMonth, currentFinanceYear);
        showMessage('Nastavitve cen so bile shranjene!', 'success');
    }
    
    // Funkcija za nalaganje nastavitev cen
    async function loadCostSettings() {
        const fromLocal = localStorage.getItem('managementCostPerMonth');
        let managementCostPerMonth = fromLocal ? parseFloat(fromLocal) : 500;
        try {
            const db = await getManualCostsFromDB(currentFinanceMonth, currentFinanceYear);
            if (db?.managementCost !== undefined && db?.managementCost !== null) {
                managementCostPerMonth = db.managementCost;
            }
        } catch (e) {
            console.warn('Napaka pri nalaganju stroškov vodenja iz baze:', e);
        }
        if (elManagementCostPerMonth) elManagementCostPerMonth.value = managementCostPerMonth;
    }
    
    // Funkcija za pridobivanje pristojbin plavalcev za določen mesec
    async function getSwimmerFees(month, year) {
        return await getSwimmerFeesFromDB(month, year);
    }
    
    // Funkcija za shranjevanje pristojbin plavalcev za določen mesec
    async function saveSwimmerFees(month, year, fees) {
        return await saveSwimmerFeesToDB(month, year, fees);
    }
    
    function resolveSwimmerNetFee(swimmer, feeRow, seasonId, season) {
        const termLabels = getSwimmerSeasonTermLabels(swimmer);
        const plan = getSwimmerPaymentPlan(swimmer.id, seasonId);
        const defaultFee = getDefaultSwimmerFeeByTermCount(termLabels.length, plan);
        const fee = feeRow
            ? parseFloat(feeRow.monthly_fee || 0)
            : (plan === 'monthly' ? defaultFee : 0);
        const discount = feeRow ? parseFloat(feeRow.discount || 0) : 0;
        if (feeRow?.is_oly === true) return { net: 0, fee: 0, discount: 0, isOly: true, hasRecord: !!feeRow };
        const net = Math.max(0, fee - discount);
        return { net, fee, discount, isOly: false, hasRecord: !!feeRow };
    }
    function getDefaultSwimmerFeeByTermCount(numberOfTerms, paymentPlan = 'monthly') {
        if (numberOfTerms === 0) return 0;
        const s = defaultFeeSettings;
        if (paymentPlan === 'lump_sum') {
            if (numberOfTerms === 1) return s.lump1;
            if (numberOfTerms === 2) return s.lump2;
            return s.lump3;
        }
        if (paymentPlan === 'two_installments') {
            if (numberOfTerms === 1) return s.installment1;
            if (numberOfTerms === 2) return s.installment2;
            return s.installment3;
        }
        if (numberOfTerms === 1) return s.monthly1;
        if (numberOfTerms === 2) return s.monthly2;
        return s.monthly3;
    }

    function getSwimmerSeasonTermLabels(swimmer) {
        const seasonTermIds = getAdminSeasonTermIds();
        const labels = [];
        (swimmer.terms || []).forEach(termId => {
            if (seasonTermIds && !seasonTermIds.has(termId)) return;
            const term = TERMS.find(t => t.id === termId);
            if (term) labels.push(formatTermTimeLabel(term));
        });
        return labels;
    }

    async function refreshSwimmerFees() {
        if (!elSwimmerFeesBox) return;

        const month = currentSwimmerFeesMonth;
        const year = currentSwimmerFeesYear;

        if (month === undefined || month === null || !year) {
            elSwimmerFeesBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        const seasonName = getSeasonNameById(getAdminSeasonFilterId());
        const seasonId = getAdminSeasonFilterId();
        const season = seasons.find(s => s.id === seasonId);
        const swimmerFees = await getSwimmerFeesFromDB(month, year);

        const sortedSwimmers = swimmers
            .filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s))
            .sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });

        if (sortedSwimmers.length === 0) {
            elSwimmerFeesBox.innerHTML = `<p class="muted">Ni plavalcev z dodeljenimi termini v sezoni <strong>${escapeHtml(seasonName) || '—'}</strong>. Dodelite termine v zavihku Plavalci.</p>`;
            return;
        }

        let olyCount = 0;
        sortedSwimmers.forEach(swimmer => {
            const feeData = swimmerFees[swimmer.id];
            if (feeData && feeData.is_oly) olyCount++;
        });

        const requestedDate = new Date(year, month - 1, 1);
        const currentDate = new Date();
        currentDate.setDate(1);
        currentDate.setHours(0, 0, 0, 0);
        const isPastMonth = requestedDate < currentDate;
        const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });

        let html = `<p class="muted" style="font-size:13px;margin-bottom:10px">Sezona: <strong>${escapeHtml(seasonName) || '—'}</strong> · ${sortedSwimmers.length} plavalcev · ${monthLabel}<br>
            <span style="font-size:12px">Enkratno in 1. obrok: <strong>oktober</strong> · 2. obrok: <strong>februar</strong> · Zneske vnašate ročno.</span></p>`;
        html += `
            <table class="swimmer-fees-table">
                <thead>
                    <tr>
                        <th>Plavalec</th>
                        <th>Termini (sezona)</th>
                        <th>Način plačila</th>
                        <th>Znesek vadnine (€)</th>
                        <th>Popust (€)</th>
                        <th>Končna vadnina (€)</th>
                        <th>OLY</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let rowCount = 0;
        for (const swimmer of sortedSwimmers) {
            const termLabels = getSwimmerSeasonTermLabels(swimmer);
            const termsDisplay = termLabels.length > 0 ? termLabels.join(', ') : 'Brez terminov';
            const paymentPlan = getSwimmerPaymentPlan(swimmer.id, seasonId);
            const defaultFee = getDefaultSwimmerFeeByTermCount(termLabels.length, paymentPlan);
            const feeData = swimmerFees[swimmer.id];
            const planLabel = PAYMENT_PLAN_LABELS[paymentPlan] || PAYMENT_PLAN_LABELS.monthly;
            const isBillingMonth = shouldIncludeSwimmerInBillingMonth(swimmer.id, month, year, season, seasonId);
            const billingHint = getPaymentPlanBillingHint(paymentPlan, season);

            if (!feeData && isPastMonth) continue;
            if (!feeData && !isBillingMonth && paymentPlan !== 'monthly') continue;

            let fee = feeData?.fee ?? ((paymentPlan === 'monthly' || isBillingMonth) ? defaultFee : 0);
            let discount = feeData?.discount || 0;
            const isOly = feeData?.is_oly || false;
            const effectiveFee = isOly ? 0 : fee;
            const finalFee = Math.max(0, effectiveFee - discount);
            const canCheckOly = olyCount < 15 || isOly;
            const rowStyle = (finalFee === 0 && !isOly && isBillingMonth) ? 'style="background-color: #ffe0e0;"' : (!isBillingMonth ? 'style="opacity:0.65"' : '');
            const inputsDisabled = !isBillingMonth || isOly;
            const planDisplay = billingHint
                ? `${escapeHtml(planLabel)}<br><span style="font-size:11px;color:#666">${escapeHtml(billingHint)}</span>`
                : escapeHtml(planLabel);
            const notBillingNote = !isBillingMonth ? '<br><span style="font-size:11px;color:#999">Ni mesec obračuna</span>' : '';

            rowCount++;
            html += `
                <tr ${rowStyle}>
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td>${termsDisplay}</td>
                    <td>${planDisplay}${notBillingNote}</td>
                    <td>
                        <input type="number" id="fee-${swimmer.id}" value="${effectiveFee}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})" ${inputsDisabled ? 'disabled' : ''}>
                    </td>
                    <td>
                        <input type="number" id="discount-${swimmer.id}" value="${discount}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})" ${inputsDisabled ? 'disabled' : ''}>
                    </td>
                    <td><strong>${isBillingMonth ? finalFee.toFixed(2) + '€' : '—'}</strong></td>
                    <td style="text-align: center;">
                        <input type="checkbox" id="oly-${swimmer.id}" ${isOly ? 'checked' : ''} ${canCheckOly && isBillingMonth ? '' : 'disabled'} onchange="updateSwimmerOly('${swimmer.id}', this.checked, ${month}, ${year})" style="cursor: pointer; width: 20px; height: 20px;">
                        ${!canCheckOly && !isOly ? '<span style="font-size: 11px; color: #999; display: block;">Max 15</span>' : ''}
                    </td>
                </tr>
            `;
        }

        if (rowCount === 0) {
            elSwimmerFeesBox.innerHTML = `<p class="muted">Za ${monthLabel} v sezoni <strong>${escapeHtml(seasonName) || '—'}</strong> ni shranjenih pristojbin. Izberite trenutni ali prihodnji mesec, da nastavite privzete vadnine.</p>`;
            return;
        }

        html += `
                </tbody>
            </table>
            <div style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 6px;">
                <strong>OLY opcija:</strong> Maksimalno 15 plavalcev lahko ima obkljukljeno OLY opcijo.
                Plavalci z OLY imajo znesek vadnine 0€, vendar mesečno prispevajo 40€.
                Trenutno: <strong>${olyCount}/15</strong> OLY plavalcev.
            </div>
        `;
        elSwimmerFeesBox.innerHTML = html;
    }

    // ===== POROČILO ZA RAČUNOVODSTVO =====

    function swimmerDisplayName(s) {
        return `${s.first_name} ${s.last_name}`.trim();
    }

    function normalizePersonName(name) {
        return (name || '').trim().toLocaleLowerCase('sl');
    }

    function getSeasonForMonthYear(month, year) {
        const mid = iso(new Date(year, month - 1, 15));
        const byDate = seasons.find(s => mid >= s.date_from && mid <= s.date_to);
        if (byDate) return byDate;
        return seasons.find(s => s.is_active) || seasons[0] || null;
    }

    async function loadAccountingReportOrders() {
        accountingReportOrderBySeason = {};
        try {
            const { data, error } = await supabase
                .from('accounting_report_swimmer_order')
                .select('season_id, swimmer_id, sort_order')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            (data || []).forEach(row => {
                if (!accountingReportOrderBySeason[row.season_id]) {
                    accountingReportOrderBySeason[row.season_id] = [];
                }
                accountingReportOrderBySeason[row.season_id].push({
                    swimmer_id: row.swimmer_id,
                    sort_order: row.sort_order
                });
            });
        } catch (e) {
            console.warn('Vrstni red poročila za računovodstvo ni naložen (poženite SQL/create_accounting_report_order.sql):', e.message || e);
        }
    }

    function swimmerIdFromSeedName(fullName) {
        const target = normalizePersonName(fullName);
        const hit = swimmers.find(s => normalizePersonName(swimmerDisplayName(s)) === target);
        return hit ? hit.id : null;
    }

    async function ensureAccountingReportSeedForSeason(season) {
        if (!season || accountingReportOrderBySeason[season.id]?.length) return;
        const isSeedSeason = /2025\s*[\/\-]\s*26/i.test(season.name || '')
            || (season.date_from <= '2026-06-30' && season.date_to >= '2025-09-01');
        if (!isSeedSeason) return;
                const ids = ACCOUNTING_REPORT_SEED_NAMES
            .map(swimmerIdFromSeedName)
            .filter(id => {
                if (!id) return false;
                const s = swimmers.find(sw => sw.id === id);
                return entityHasTermsInAdminSeason(s);
            });
        if (ids.length === 0) return;
        const rows = ids.map((swimmer_id, i) => ({
            season_id: season.id,
            swimmer_id,
            sort_order: i + 1
        }));
        try {
            const { error } = await supabase.from('accounting_report_swimmer_order').upsert(rows, {
                onConflict: 'season_id,swimmer_id'
            });
            if (error) throw error;
            accountingReportOrderBySeason[season.id] = rows.map(r => ({
                swimmer_id: r.swimmer_id,
                sort_order: r.sort_order
            }));
        } catch (e) {
            console.warn('Privzeti vrstni red poročila ni shranjen:', e.message || e);
            accountingReportOrderBySeason[season.id] = rows.map(r => ({
                swimmer_id: r.swimmer_id,
                sort_order: r.sort_order
            }));
        }
    }

    function getAccountingReportSeason(month, year) {
        const seasonId = getAdminSeasonFilterId();
        if (seasonId) {
            const fromFilter = seasons.find(s => s.id === seasonId);
            if (fromFilter) return fromFilter;
        }
        return getSeasonForMonthYear(month, year);
    }

    /** Plavalci za obračun v izbranem mesecu — glede na način plačila in sezono */
    async function fetchAccountingReportFeeRows(month, year) {
        const season = getAccountingReportSeason(month, year);
        const seasonId = season?.id || getAdminSeasonFilterId();
        const { data, error } = await supabase
            .from('swimmer_monthly_fees')
            .select('swimmer_id, monthly_fee, discount, is_oly')
            .eq('month', month)
            .eq('year', year);
        if (error) throw error;

        const feesBySwimmer = {};
        (data || []).forEach(row => {
            feesBySwimmer[row.swimmer_id] = row;
        });

        const rows = [];
        swimmers
            .filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s))
            .forEach(swimmer => {
                const plan = getSwimmerPaymentPlan(swimmer.id, seasonId);
                if (!shouldIncludeSwimmerInBillingMonth(swimmer.id, month, year, season, seasonId)) return;

                const feeRow = feesBySwimmer[swimmer.id];
                if (feeRow?.is_oly === true) return;

                const { net, fee, discount } = resolveSwimmerNetFee(swimmer, feeRow, seasonId, season);

                rows.push({
                    swimmer,
                    netFee: net,
                    fee,
                    discount,
                    paymentPlan: plan,
                    hasFeeRecord: !!feeRow
                });
            });
        return rows;
    }

    /** Članarina se šteje samo v mesecu, v katerem je bila obračunana */
    function rowIncludesMembership(row, month, year) {
        const seasonId = getAdminSeasonFilterId();
        const m = month || currentAccountingReportMonth;
        const y = year || currentAccountingReportYear;
        return isMembershipChargedInMonth(row.swimmer.id, seasonId, m, y);
    }

    function getAccountingRowTotal(row, month, year) {
        const base = Number(row.netFee) || 0;
        return base + (rowIncludesMembership(row, month, year) ? getMembershipFeeAmount() : 0);
    }

    function accountingReportHasAnyMembership(rows, month, year) {
        return (rows || accountingReportWorkingOrder).some(r => rowIncludesMembership(r, month, year));
    }

    /** Vrstice za PDF: brez plavalcev, ki nimajo česa obračunati */
    function filterAccountingRowsForExport(rows, month, year) {
        return (rows || []).filter(r => getAccountingRowTotal(r, month, year) > 0);
    }

    function groupAndSortAccountingRows(feeRows, orderedIds, seasonId) {
        const byPlan = { monthly: [], two_installments: [], lump_sum: [] };
        feeRows.forEach(r => {
            const plan = r.paymentPlan || getSwimmerPaymentPlan(r.swimmer.id, seasonId);
            r.paymentPlan = plan;
            (byPlan[plan] || byPlan.monthly).push(r);
        });
        const result = [];
        PAYMENT_PLAN_GROUP_ORDER.forEach(plan => {
            const group = byPlan[plan];
            if (!group.length) return;
            applyOrderToAccountingRows(group, orderedIds).forEach(r => result.push(r));
        });
        return result;
    }

    function sortSwimmersAlpha(list) {
        return [...list].sort((a, b) =>
            swimmerDisplayName(a.swimmer).localeCompare(swimmerDisplayName(b.swimmer), 'sl')
        );
    }

    function applyOrderToAccountingRows(feeRows, orderedIds) {
        const byId = Object.fromEntries(feeRows.map(r => [r.swimmer.id, r]));
        const out = [];
        const used = new Set();
        (orderedIds || []).forEach(id => {
            if (byId[id]) {
                out.push(byId[id]);
                used.add(id);
            }
        });
        const rest = feeRows.filter(r => !used.has(r.swimmer.id));
        sortSwimmersAlpha(rest).forEach(r => out.push(r));
        return out;
    }

    async function buildAccountingReportRows(month, year) {
        const season = getAccountingReportSeason(month, year);
        const seasonId = season?.id || getAdminSeasonFilterId();
        const feeRows = await fetchAccountingReportFeeRows(month, year);
        if (!season) {
            return { season: null, rows: groupAndSortAccountingRows(feeRows, [], seasonId) };
        }
        await ensureAccountingReportSeedForSeason(season);
        const orderRows = accountingReportOrderBySeason[season.id] || [];
        const orderedIds = [...orderRows]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(r => r.swimmer_id);
        return {
            season,
            rows: groupAndSortAccountingRows(feeRows, orderedIds, seasonId)
        };
    }

    function moveAccountingReportRow(index, delta) {
        const next = index + delta;
        if (next < 0 || next >= accountingReportWorkingOrder.length) return;
        const arr = [...accountingReportWorkingOrder];
        const tmp = arr[index];
        arr[index] = arr[next];
        arr[next] = tmp;
        accountingReportWorkingOrder = arr;
        const season = getAccountingReportSeason(currentAccountingReportMonth, currentAccountingReportYear);
        renderAccountingReportEditorTable(accountingReportWorkingOrder, season);
    }

    function sortAccountingReportAlphabetically() {
        if (!accountingReportWorkingOrder.length) return;
        const seasonId = getAdminSeasonFilterId();
        const byPlan = { monthly: [], two_installments: [], lump_sum: [] };
        accountingReportWorkingOrder.forEach(r => {
            const plan = r.paymentPlan || getSwimmerPaymentPlan(r.swimmer.id, seasonId);
            (byPlan[plan] || byPlan.monthly).push(r);
        });
        accountingReportWorkingOrder = [
            ...sortSwimmersAlpha(byPlan.monthly),
            ...sortSwimmersAlpha(byPlan.two_installments),
            ...sortSwimmersAlpha(byPlan.lump_sum)
        ];
        const season = getAccountingReportSeason(currentAccountingReportMonth, currentAccountingReportYear);
        renderAccountingReportEditorTable(accountingReportWorkingOrder, season);
        showMessage('Vrstni red po abecedi znotraj skupin (shrani gumb, če želite obdržati).', 'info');
    }

    function updateAccountingReportSummary(rows, month, year) {
        const el = document.getElementById('accountingReportSummary');
        if (!el) return;
        if (!rows.length) {
            el.innerHTML = '';
            return;
        }
        const exportRows = filterAccountingRowsForExport(rows, month, year);
        let feeTotal = 0;
        let membershipTotal = 0;
        let grandTotal = 0;
        exportRows.forEach(r => {
            feeTotal += Number(r.netFee) || 0;
            const mem = rowIncludesMembership(r, month, year) ? getMembershipFeeAmount() : 0;
            membershipTotal += mem;
            grandTotal += getAccountingRowTotal(r, month, year);
        });
        const skipped = rows.length - exportRows.length;
        el.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:12px;font-size:14px">
            <span><strong>${exportRows.length}</strong> plavalcev v PDF</span>
            <span>Vadnina: <strong>${formatAccountingFeeAmount(feeTotal)} €</strong></span>
            ${membershipTotal > 0 ? `<span>Članarina: <strong>${formatAccountingFeeAmount(membershipTotal)} €</strong></span>` : ''}
            <span>Skupaj: <strong>${formatAccountingFeeAmount(grandTotal)} €</strong></span>
            ${skipped > 0 ? `<span style="color:#991b1b">(${skipped} z 0 € izpuščenih iz PDF)</span>` : ''}
        </div>`;
    }

    function renderAccountingReportEditorTable(rows, season) {
        const box = document.getElementById('accountingReportEditorBox');
        if (!box) return;
        const month = currentAccountingReportMonth;
        const year = currentAccountingReportYear;
        if (!rows.length) {
            const seasonLabel = season?.name || getSeasonNameById(getAdminSeasonFilterId()) || 'izbrani sezoni';
            const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
            box.innerHTML = `<p class="muted">Za <strong>${escapeHtml(monthLabel)}</strong> v sezoni <strong>${escapeHtml(seasonLabel)}</strong> ni plavalcev za obračun (mesečni v mesecih sezone; enkratno/dvakratno le v mesecih obračuna).</p>`;
            updateAccountingReportSummary([], month, year);
            return;
        }
        const seasonId = getAdminSeasonFilterId();
        const missingFeeCount = rows.filter(r => (Number(r.netFee) || 0) <= 0).length;
        let header = '';
        if (season) {
            const nSaved = (accountingReportOrderBySeason[season.id] || []).length;
            header = `<p class="muted" style="font-size:13px;margin-bottom:10px">Sezona: <strong>${escapeHtml(season.name)}</strong> · ${rows.length} plavalcev · ${nSaved ? 'shranjen vrstni red znotraj skupin' : 'po abecedi znotraj skupin'} · premakni z ↑ ↓, nato <strong>Shrani vrstni red</strong></p>`;
        } else {
            header = `<p class="muted" style="font-size:13px;margin-bottom:10px">${rows.length} plavalcev · po skupinah načina plačila</p>`;
        }
        if (missingFeeCount > 0) {
            header += `<p style="font-size:13px;margin-bottom:10px;padding:8px 10px;background:#fee2e2;border-radius:6px;color:#991b1b">
                <strong>${missingFeeCount}</strong> ${missingFeeCount === 1 ? 'plavalec nima' : 'plavalcev nima'} vnesenega zneska vadnine za ta mesec (0 €). V PDF ne bodo vključeni – zneske vnesite v «Upravljanje mesečnih pristojbin».
            </p>`;
        }
        let html = header + `<div class="admin-table-scroll"><table class="trainer-hours-table" style="width:100%"><thead><tr>
            <th style="width:70px">Vrstni red</th>
            <th>Ime in priimek</th>
            <th>E-pošta</th>
            <th>Naslov</th>
            <th>Pošta</th>
            <th style="text-align:right">Znesek vadnine (€)</th>
            <th style="text-align:center">Član. (30 €)</th>
            <th style="text-align:right">Skupaj (€)</th>
        </tr></thead><tbody>`;

        let lastPlan = null;
        rows.forEach((row, i) => {
            const plan = row.paymentPlan || 'monthly';
            if (plan !== lastPlan) {
                html += `<tr style="background:#eef2ff"><td colspan="8"><strong>${escapeHtml(PAYMENT_PLAN_REPORT_GROUP_LABELS[plan] || plan)}</strong></td></tr>`;
                lastPlan = plan;
            }
            const s = row.swimmer;
            const period = getMembershipChargedPeriod(s.id, seasonId);
            const chargedHere = !!period && period.month === month && period.year === year;
            const chargedElsewhere = !!period && !chargedHere;
            const total = getAccountingRowTotal(row, month, year);
            const noFee = (Number(row.netFee) || 0) <= 0;
            const rowStyle = noFee ? ' style="background:#fee2e2"' : '';
            const membershipCell = chargedElsewhere
                ? `<span class="muted" style="font-size:11px" title="Članarina je za to sezono že obračunana">✓ ${escapeHtml(formatMembershipPeriod(period))}</span>
                   <button type="button" class="btn" style="padding:1px 6px;font-size:11px;margin-left:4px" onclick="clearSwimmerMembershipFee('${s.id}')" title="Prekliči obračun članarine">×</button>`
                : `<input type="checkbox" ${chargedHere ? 'checked' : ''} onchange="updateSwimmerMembershipFee('${s.id}', this.checked)" style="width:18px;height:18px;cursor:pointer" title="Obračunaj članarino v tem mesecu">`;
            html += `<tr${rowStyle}>
                <td style="white-space:nowrap">
                    <button type="button" class="btn" style="padding:2px 8px;font-size:12px" data-acc-order-up="${i}" title="Premakni gor">↑</button>
                    <button type="button" class="btn" style="padding:2px 8px;font-size:12px" data-acc-order-down="${i}" title="Premakni dol">↓</button>
                </td>
                <td>${escapeHtml(swimmerDisplayName(s))}</td>
                <td>${s.email ? escapeHtml(s.email) : '<span title="Manjka email">⚠</span>'}</td>
                <td>${s.address ? escapeHtml(s.address) : '<span title="Manjka naslov">⚠</span>'}</td>
                <td>${s.postal_code ? escapeHtml(s.postal_code) : '<span title="Manjka pošta">⚠</span>'}</td>
                <td style="text-align:right">${noFee ? '<span style="color:#991b1b">0</span>' : formatAccountingFeeAmount(row.netFee)}</td>
                <td style="text-align:center">${membershipCell}</td>
                <td style="text-align:right"><strong>${formatAccountingFeeAmount(total)}</strong></td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        box.innerHTML = html;
        updateAccountingReportSummary(rows, month, year);
        syncGlobalMembershipCheckbox();
    }

    async function refreshAccountingReportEditor() {
        const box = document.getElementById('accountingReportEditorBox');
        if (!box) return;
        box.innerHTML = '<p class="muted">Nalaganje …</p>';
        try {
            const month = currentAccountingReportMonth;
            const year = currentAccountingReportYear;
            const { season, rows } = await buildAccountingReportRows(month, year);
            accountingReportWorkingOrder = rows;
            renderAccountingReportEditorTable(rows, season);
        } catch (e) {
            console.error(e);
            box.innerHTML = '<p class="muted">Napaka pri nalaganju poročila.</p>';
        }
    }

    async function saveAccountingReportOrder() {
        const month = currentAccountingReportMonth;
        const year = currentAccountingReportYear;
        const season = getAccountingReportSeason(month, year);
        if (!season) {
            showMessage('Ni sezone za izbrani mesec – vrstni red ni shranjen.', 'warning');
            return;
        }
        if (!accountingReportWorkingOrder.length) {
            showMessage('Ni plavalcev za shranjevanje vrstnega reda.', 'warning');
            return;
        }
        const rows = accountingReportWorkingOrder
            .filter(row => entityHasTermsInAdminSeason(row.swimmer))
            .map((row, i) => ({
            season_id: season.id,
            swimmer_id: row.swimmer.id,
            sort_order: i + 1
        }));
        try {
            const { error: delErr } = await supabase
                .from('accounting_report_swimmer_order')
                .delete()
                .eq('season_id', season.id);
            if (delErr) throw delErr;
            const { error } = await supabase.from('accounting_report_swimmer_order').insert(rows);
            if (error) throw error;
            accountingReportOrderBySeason[season.id] = rows.map(r => ({
                swimmer_id: r.swimmer_id,
                sort_order: r.sort_order
            }));
            showMessage(`Vrstni red shranjen za sezono «${season.name}».`, 'success');
        } catch (e) {
            console.error(e);
            alert('Napaka pri shranjevanju vrstnega reda: ' + (e.message || e));
        }
    }

    function formatAccountingFeeAmount(n) {
        const v = Number(n);
        if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
        return v.toFixed(1).replace(/\.0$/, '');
    }

    async function getAccountingReportExportRows() {
        const month = currentAccountingReportMonth;
        const year = currentAccountingReportYear;
        let rows = accountingReportWorkingOrder;
        if (!rows.length) {
            const built = await buildAccountingReportRows(month, year);
            rows = built.rows;
        }
        return { month, year, rows };
    }

    function accountingPdfCell(text, alignment) {
        return {
            text: text == null ? '' : String(text),
            noWrap: true,
            fontSize: 7.5,
            alignment: alignment || 'left'
        };
    }

    async function downloadAccountingReportPdf() {
        const btn = document.getElementById('printAccountingReportBtn');
        if (typeof pdfMake === 'undefined') {
            showMessage('PDF knjižnica ni naložena. Osvežite stran (Ctrl+F5).', 'error');
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Pripravljam PDF …';
        }
        try {
            const { month, year, rows: allRows } = await getAccountingReportExportRows();
            const rows = filterAccountingRowsForExport(allRows, month, year);
            if (!rows.length) {
                showMessage('Ni podatkov za PDF (vsi plavalci imajo 0 €).', 'warning');
                return;
            }
            const skipped = allRows.length - rows.length;
            const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
            const fileSlug = `${String(month).padStart(2, '0')}_${year}`;
            const hasAnyMembership = accountingReportHasAnyMembership(rows, month, year);
            const headerRow = [
                { text: 'Št.', style: 'tableHeader', alignment: 'center' },
                { text: 'Ime priimek', style: 'tableHeader' },
                { text: 'Mail', style: 'tableHeader' },
                { text: 'Naslov', style: 'tableHeader' },
                { text: 'Pošta', style: 'tableHeader' },
                { text: 'Vadnina', style: 'tableHeader', alignment: 'right' },
                { text: 'Član.', style: 'tableHeader', alignment: 'right' },
                { text: 'Skupaj', style: 'tableHeader', alignment: 'right' }
            ];
            const tableBody = [headerRow];
            let lastPlan = null;
            let rowIndex = 0;
            rows.forEach(row => {
                const plan = row.paymentPlan || 'monthly';
                if (plan !== lastPlan) {
                    const groupLabel = PAYMENT_PLAN_REPORT_GROUP_LABELS[plan] || plan;
                    tableBody.push([
                        { text: groupLabel, bold: true, colSpan: headerRow.length, fillColor: '#eef2ff', margin: [0, 4, 0, 2] },
                        ...Array(headerRow.length - 1).fill({})
                    ]);
                    lastPlan = plan;
                }
                rowIndex++;
                const s = row.swimmer;
                const membershipAmount = rowIncludesMembership(row, month, year) ? getMembershipFeeAmount() : 0;
                const total = getAccountingRowTotal(row, month, year);
                tableBody.push([
                    accountingPdfCell(String(rowIndex), 'center'),
                    accountingPdfCell(swimmerDisplayName(s)),
                    accountingPdfCell(s.email || ''),
                    accountingPdfCell(s.address || ''),
                    accountingPdfCell(s.postal_code || ''),
                    accountingPdfCell(formatAccountingFeeAmount(row.netFee), 'right'),
                    accountingPdfCell(membershipAmount ? formatAccountingFeeAmount(membershipAmount) : '—', 'right'),
                    accountingPdfCell(formatAccountingFeeAmount(total), 'right')
                ]);
            });
            const colWidths = ['4%', '14%', '22%', '28%', '12%', '7%', '6%', '7%'];
            const docDefinition = {
                pageSize: 'A4',
                pageOrientation: 'landscape',
                pageMargins: [22, 32, 22, 24],
                defaultStyle: { font: 'Roboto', fontSize: 7.5 },
                content: [
                    {
                        text: `Razpored PKL – vadnine (${monthLabel})${hasAnyMembership ? ' + članarina' : ''}`,
                        fontSize: 11,
                        margin: [0, 0, 0, 10]
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: colWidths,
                            body: tableBody
                        },
                        layout: {
                            hLineWidth(i, node) {
                                if (i === 0 || i === 1) return 1;
                                if (i === node.table.body.length) return 0.5;
                                return 0.25;
                            },
                            vLineWidth: () => 0,
                            hLineColor(i) {
                                return i === 1 ? '#000000' : '#dddddd';
                            },
                            paddingLeft: () => 1,
                            paddingRight: () => 1,
                            paddingTop: () => 2,
                            paddingBottom: () => 2
                        }
                    }
                ],
                styles: {
                    tableHeader: { bold: true, fontSize: 7.5 }
                }
            };
            pdfMake.createPdf(docDefinition).download(`Razpored_PKL_vadnine_${fileSlug}.pdf`);
            showMessage(skipped > 0
                ? `PDF je prenesen (izpuščenih ${skipped} plavalcev z 0 €).`
                : 'PDF je prenesen.', 'success');
        } catch (e) {
            console.error('PDF poročilo:', e);
            showMessage('Napaka pri ustvarjanju PDF: ' + (e.message || e), 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Prenesi PDF';
            }
        }
    }

    // Funkcija za izvoz vadnin v CSV
    window.exportSwimmerFees = async function() {
        const month = currentSwimmerFeesMonth;
        const year = currentSwimmerFeesYear;
        
        if (month === undefined || year === undefined) {
            alert('Prosim izberite mesec in leto');
            return;
        }
        
        try {
            const swimmerFees = await getSwimmerFees(month, year);
            const activeSwimmers = swimmers.filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s));
            
            // Ustvari CSV vsebino z imenom, priimkom, emailom, naslovom, pošto in zneskom vadnine
            let csv = 'first_name,last_name,email,address,postal_code,monthly_fee\n';
            
            // Sortiraj plavalce po abecedi po priimku, nato po imenu
            const sortedActiveSwimmers = activeSwimmers.sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });
            
            sortedActiveSwimmers.forEach(swimmer => {
                const feeData = swimmerFees[swimmer.id];
                const fee = feeData && feeData.fee !== undefined ? feeData.fee : 0;
                
                // Formatiraj podatke - uporabi narekovaje za polja, ki lahko vsebujejo vejice
                const formatCSVField = (value) => {
                    if (!value) return '';
                    // Če vrednost vsebuje vejico ali narekovaje, jo zavij v narekovaje
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                };
                
                csv += `${formatCSVField(swimmer.first_name)},${formatCSVField(swimmer.last_name)},${formatCSVField(swimmer.email || '')},${formatCSVField(swimmer.address || '')},${formatCSVField(swimmer.postal_code || '')},${fee.toFixed(2)}\n`;
            });
            
            // Prenesi CSV datoteko z BOM za pravilno podporo šumnikov
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const monthName = new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
            link.setAttribute('download', `vadnine_${monthName.replace(/\s+/g, '_')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ CSV izvoz vadnin uspešno končan');
            showMessage(`Izvoženih ${sortedActiveSwimmers.length} vadnin za ${monthName}`, 'success');
            
        } catch (error) {
            console.error('❌ Napaka pri izvozu vadnin:', error);
            showMessage('Napaka pri izvozu vadnin: ' + error.message, 'error');
        }
    };
    
    // Funkcija za posodobitev pristojbine plavalca
    async function updateSwimmerFee(swimmerId, fee, month, year) {
        const success = await updateSwimmerFeeInDB(swimmerId, fee, month, year);
        
        if (success) {
            // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
            if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                calculateFinanceData();
            }
            refreshSwimmerFees();
        } else {
            showMessage('Napaka pri posodobitvi pristojbine!', 'error');
        }
    }
    
    // Funkcija za posodobitev popusta plavalca
    async function updateSwimmerDiscount(swimmerId, discount, month, year) {
        const success = await updateSwimmerDiscountInDB(swimmerId, discount, month, year);
        
        if (success) {
            // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
            if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                calculateFinanceData();
            }
            refreshSwimmerFees();
        } else {
            showMessage('Napaka pri posodobitvi popusta!', 'error');
        }
    }
    
    // Funkcija za posodobitev OLY statusa plavalca
    async function updateSwimmerOly(swimmerId, isOly, month, year) {
        try {
            // Če je OLY obkljukljeno, nastavi znesek vadnine na 0
            if (isOly) {
                const { error: feeError } = await supabase
                    .from('swimmer_monthly_fees')
                    .upsert({
                        swimmer_id: swimmerId,
                        month: month,
                        year: year,
                        monthly_fee: 0,
                        is_oly: true
                    }, { onConflict: 'swimmer_id,month,year' });
                
                if (feeError) throw feeError;
            } else {
                // Če je OLY odkljukljeno, nastavi is_oly na false, vendar ohrani znesek vadnine
                const { error: olyError } = await supabase
                    .from('swimmer_monthly_fees')
                    .upsert({
                        swimmer_id: swimmerId,
                        month: month,
                        year: year,
                        is_oly: false
                    }, { onConflict: 'swimmer_id,month,year' });
                
                if (olyError) throw olyError;
                
                // Osveži znesek vadnine (uporabi default ali obstoječo vrednost)
                await refreshSwimmerFees();
                // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
                if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                    calculateFinanceData();
                }
                return;
            }
            
            // Osveži prikaz
            // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
            if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                calculateFinanceData();
            }
            refreshSwimmerFees();
            
        } catch (error) {
            console.error('Napaka pri posodobitvi OLY statusa:', error);
            showMessage('Napaka pri posodobitvi OLY statusa!', 'error');
            // Osveži, da se checkbox vrne na prejšnje stanje
            refreshSwimmerFees();
        }
    }
    
    // Globalne funkcije za onchange evente
    window.updateSwimmerFee = updateSwimmerFee;
    window.updateSwimmerDiscount = updateSwimmerDiscount;
    window.updateSwimmerOly = updateSwimmerOly;

    // ===== SUPABASE FUNKCIJE ZA FINANCE =====

    // Funkcija za pridobivanje stroškov prog po terminih iz baze
    async function getTermCostsFromDB() {
        try {
// console.log('🔍 Nalagam stroške terminov iz baze...');
            const { data, error } = await supabase
                .from('term_costs')
                .select('*');
            
            if (error) {
                console.error('❌ Napaka pri nalaganju stroškov terminov:', error);
                throw error;
            }
            
// console.log('✅ Naloženih stroškov terminov:', data.length, data);
            
            // Pretvori v obliko, ki jo pričakuje aplikacija
            const termCosts = {};
            data.forEach(item => {
                termCosts[item.term_id] = item.cost_per_hour;
            });
            
            return termCosts;
        } catch (error) {
            console.error('Napaka pri pridobivanju stroškov prog:', error);
            return {};
        }
    }

    // Funkcija za shranjevanje stroškov prog v bazo
    async function saveTermCostsToDB(termCosts) {
        try {
            const updates = Object.entries(termCosts).map(([termId, cost]) => ({
                term_id: termId,
                cost_per_hour: parseFloat(cost)
            }));

            const { error } = await supabase
                .from('term_costs')
                .upsert(updates, { onConflict: 'term_id' });

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju stroškov prog:', error);
            return false;
        }
    }

    // Funkcija za pridobivanje postavk trenerjev iz baze
    async function getTrainerRatesFromDB(month = null, year = null) {
        try {
            // Uporabi trenutni mesec in leto, če nista podana
            const targetMonth = month || currentTrainerRatesMonth;
            const targetYear = year || currentTrainerRatesYear;
            
// console.log('🔍 Nalagam urne postavke trenerjev iz baze za mesec', targetMonth, 'in leto', targetYear);
            const { data, error } = await supabase
                .from('trainer_rates')
                .select('*')
                .eq('month', targetMonth)
                .eq('year', targetYear);
            
            if (error) {
                console.error('❌ Napaka pri nalaganju urnih postavk trenerjev:', error);
                throw error;
            }
            
// console.log('✅ Naloženih urnih postavk trenerjev:', data.length, data);
            
            // Pretvori v obliko, ki jo pričakuje aplikacija
            const trainerRates = {};
            data.forEach(item => {
                trainerRates[item.trainer_id] = item.rate_per_session;
            });
            
            return trainerRates;
        } catch (error) {
            console.error('Napaka pri pridobivanju postavk trenerjev:', error);
            return {};
        }
    }

    // Funkcija za shranjevanje postavk trenerjev v bazo
    async function saveTrainerRatesToDB(trainerRates, month = null, year = null) {
        try {
            // Uporabi trenutni mesec in leto, če nista podana
            const targetMonth = month || currentTrainerRatesMonth;
            const targetYear = year || currentTrainerRatesYear;
            
            const updates = Object.entries(trainerRates).map(([trainerId, rate]) => ({
                trainer_id: trainerId,
                rate_per_session: parseFloat(rate),
                month: targetMonth,
                year: targetYear
            }));

            const { error } = await supabase
                .from('trainer_rates')
                .upsert(updates, { onConflict: 'trainer_id,month,year' });

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju postavk trenerjev:', error);
            return false;
        }
    }

    // Funkcija za pridobivanje mesečnih pristojbin plavalcev iz baze
    async function getSwimmerFeesFromDB(month, year) {
        try {
            // Najprej poskusi najti pristojbine za točen mesec in leto
            let { data, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', month)
                .eq('year', year);
            
            if (error) {
                console.error('❌ Napaka pri nalaganju vadnin:', error);
                throw error;
            }
            
            // Pretvori v obliko, ki jo pričakuje aplikacija
            const swimmerFees = {};
            data.forEach(item => {
                swimmerFees[item.swimmer_id] = {
                    fee: item.monthly_fee,
                    discount: item.discount || 0,
                    is_oly: item.is_oly || false
                };
            });
            
            // Če nismo našli pristojbin za točen mesec/leto, poišči najnovejše pristojbine za vsakega plavalca
            // VENDAR: Ne uporabi najnovejše vadnine za pretekle mesece - če plavalec ni imel vadnine za pretelek mesec,
            // to pomeni, da takrat še ni bil plavalec ali ni obiskoval vadbe
            if (data.length === 0) {
                const requestedDate = new Date(year, month - 1, 1); // Mesec za katerega iščemo vadnine (1-based)
                const currentDate = new Date();
                currentDate.setDate(1); // Nastavi na prvi dan meseca
                currentDate.setHours(0, 0, 0, 0);
                
                const isPastMonth = requestedDate < currentDate;
                
                if (isPastMonth) {
                    // Za pretekle mesece ne uporabljamo najnovejših vadnin
                    // Če ni vadnine za pretelek mesec, plavalec verjetno takrat še ni bil dodan ali ni obiskoval vadbe
                    return swimmerFees; // Vrni prazen objekt - ne prikaži vadnine
                }
                
                // Pridobi vse plavalce, ki nimajo pristojbin za ta mesec
                const activeSwimmers = swimmers.filter(s => !s.is_deleted);
                const swimmersWithoutFees = activeSwimmers.filter(s => !swimmerFees[s.id]);
                
                if (swimmersWithoutFees.length > 0) {
// console.log(`Looking for recent fees for ${swimmersWithoutFees.length} swimmers...`);
                    
                    // Za vsakega plavalca poišči najnovejšo pristojbino
                    // SAMO za sedanji ali prihodnji mesec (ne za pretekle!)
                    for (const swimmer of swimmersWithoutFees) {
                        const { data: recentData, error: recentError } = await supabase
                            .from('swimmer_monthly_fees')
                            .select('*')
                            .eq('swimmer_id', swimmer.id)
                            .order('year', { ascending: false })
                            .order('month', { ascending: false })
                            .limit(1);
                        
                        if (!recentError && recentData.length > 0) {
                            const recentFee = recentData[0];
                            // Uporabi najnovejšo pristojbino samo če je iz preteklosti ali sedanjosti
                            const feeDate = new Date(recentFee.year, recentFee.month - 1, 1);
                            
                            if (feeDate <= requestedDate) {
                                swimmerFees[swimmer.id] = {
                                    fee: recentFee.monthly_fee,
                                    discount: 0, // Popusti se ne prenašajo na prihodnje mesece
                                    is_oly: recentFee.is_oly || false
                                };
// console.log(`Using recent fee for ${swimmer.first_name} ${swimmer.last_name}: ${recentFee.monthly_fee}€ (from ${recentFee.month}/${recentFee.year})`);
                            }
                        }
                    }
                }
            }
            
            return swimmerFees;
        } catch (error) {
            console.error('Napaka pri pridobivanju pristojbin:', error);
            return {};
        }
    }

    // Funkcija za shranjevanje mesečnih pristojbin v bazo
    async function saveSwimmerFeesToDB(month, year, fees) {
        try {
            const updates = Object.entries(fees).map(([swimmerId, feeData]) => ({
                swimmer_id: swimmerId,
                month: month,
                year: year,
                monthly_fee: parseFloat(feeData.fee),
                discount: parseFloat(feeData.discount)
            }));

            const { error } = await supabase
                .from('swimmer_monthly_fees')
                .upsert(updates, { onConflict: 'swimmer_id,month,year' });

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju pristojbin:', error);
            return false;
        }
    }

    // Funkcija za posodobitev posamezne pristojbine plavalca
    async function updateSwimmerFeeInDB(swimmerId, fee, month, year) {
        try {
            const { error } = await supabase
                .from('swimmer_monthly_fees')
                .upsert({
                    swimmer_id: swimmerId,
                    month: month,
                    year: year,
                    monthly_fee: parseFloat(fee)
                }, { onConflict: 'swimmer_id,month,year' });

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Napaka pri posodobitvi pristojbine:', error);
            return false;
        }
    }

    // Funkcija za posodobitev popusta plavalca
    async function updateSwimmerDiscountInDB(swimmerId, discount, month, year) {
        try {
            const { error } = await supabase
                .from('swimmer_monthly_fees')
                .upsert({
                    swimmer_id: swimmerId,
                    month: month,
                    year: year,
                    discount: parseFloat(discount)
                }, { onConflict: 'swimmer_id,month,year' });

            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Napaka pri posodobitvi popusta:', error);
            return false;
        }
    }

    // Funkcija za debugiranje pristojbin v bazi
    async function debugSwimmerFees() {
        try {
// console.log('=== DEBUG: All swimmer fees in database ===');
            const { data, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .order('year', { ascending: true })
                .order('month', { ascending: true });
            
            if (error) throw error;
            
// console.log('Total fees in database:', data.length);
            data.forEach(fee => {
                const swimmer = swimmers.find(s => s.id === fee.swimmer_id);
                const swimmerName = swimmer ? `${swimmer.first_name} ${swimmer.last_name}` : `Unknown (${fee.swimmer_id})`;
// console.log(`${swimmerName}: ${fee.monthly_fee}€ for ${fee.month + 1}/${fee.year} (discount: ${fee.discount}€)`);
            });
            
            return data;
        } catch (error) {
            console.error('Error debugging swimmer fees:', error);
            return [];
        }
    }

    // Dodaj funkcijo v global scope za debugiranje
    window.debugSwimmerFees = debugSwimmerFees;

    // ===== POSODOBLJENE FINANCE FUNKCIJE =====

    // Posodobljena funkcija za renderiranje nastavitev stroškov prog
    async function renderTermCostsSettings() {
        if (!elTermCostsSettings) return;
        
        const termCosts = await getTermCostsFromDB();
        const sortedTerms = getTermsForAdminSeason();
        
        if (sortedTerms.length === 0) {
            elTermCostsSettings.innerHTML = '<p class="muted">Ni terminov v izbrani sezoni.</p>';
            return;
        }
        
        let html = '<div class="term-costs-grid">';
        
        for (const term of sortedTerms) {
            const cost = termCosts[term.id] || 50; // Default to 50€/uro
            const termLabel = `${DAY_SHORT_NAME[term.day]} ${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}`;
            html += `
                <div class="term-cost-row">
                    <label for="term-cost-${term.id}">${termLabel}:</label>
                    <input type="number" 
                           id="term-cost-${term.id}" 
                           value="${cost}" 
                           min="0" 
                           step="0.01" 
                           style="width: 120px;"
                           onchange="updateTermCost('${term.id}', this.value)">
                    <span class="hourly-rate-label">€/uro</span>
                </div>
            `;
        }
        
        html += '</div>';
        elTermCostsSettings.innerHTML = html;
    }

    // Funkcija za kopiranje postavk trenerjev iz prejšnjega meseca
    async function copyPreviousMonthTrainerRates(targetMonth, targetYear) {
        try {
            // Izračunaj prejšnji mesec
            let previousMonth = targetMonth - 1;
            let previousYear = targetYear;
            if (previousMonth < 1) {
                previousMonth = 12;
                previousYear = targetYear - 1;
            }
            
// console.log(`🔄 Preverjam, ali je potrebno kopirati postavke trenerjev iz ${previousMonth}/${previousYear} v ${targetMonth}/${targetYear}...`);
            
            // Preveri, če za trenutni mesec že obstajajo postavke
            const { data: currentMonthRates, error: currentError } = await supabase
                .from('trainer_rates')
                .select('*')
                .eq('month', targetMonth)
                .eq('year', targetYear);
            
            if (currentError) {
                console.error('Napaka pri preverjanju postavk trenerjev:', currentError);
                return false;
            }
            
            // Če že obstajajo postavke za trenutni mesec, ni potrebno kopirati
            if (currentMonthRates && currentMonthRates.length > 0) {
// console.log(`✅ Postavke trenerjev za ${targetMonth}/${targetYear} že obstajajo (${currentMonthRates.length} zapisov)`);
                return false;
            }
            
            // Pridobi postavke iz prejšnjega meseca
            const { data: previousMonthRates, error: fetchError } = await supabase
                .from('trainer_rates')
                .select('*')
                .eq('month', previousMonth)
                .eq('year', previousYear);
            
            if (fetchError) {
                console.error('Napaka pri pridobivanju postavk trenerjev iz prejšnjega meseca:', fetchError);
                return false;
            }
            
            if (!previousMonthRates || previousMonthRates.length === 0) {
// console.log(`ℹ️ Ni postavk trenerjev za prejšnji mesec ${previousMonth}/${previousYear}`);
                return false;
            }
            
// console.log(`📋 Kopiram ${previousMonthRates.length} postavk trenerjev iz ${previousMonth}/${previousYear} v ${targetMonth}/${targetYear}...`);
            
            // Kopiraj postavke za trenutni mesec
            const newRates = previousMonthRates.map(rate => ({
                trainer_id: rate.trainer_id,
                rate_per_session: rate.rate_per_session,
                month: targetMonth,
                year: targetYear
            }));
            
            const { error: insertError } = await supabase
                .from('trainer_rates')
                .upsert(newRates, { onConflict: 'trainer_id,month,year' });
            
            if (insertError) {
                console.error('Napaka pri kopiranju postavk trenerjev:', insertError);
                return false;
            }
            
// console.log(`✅ Uspešno kopirane postavke trenerjev iz ${previousMonth}/${previousYear} v ${targetMonth}/${targetYear}`);
            return true;
        } catch (error) {
            console.error('Napaka pri kopiranju postavk trenerjev:', error);
            return false;
        }
    }
    
    // Posodobljena funkcija za renderiranje nastavitev urnih postavk
    async function renderTrainerRatesSettings() {
        if (!elTrainerRatesSettings) return;
        
        // Avtomatično kopiraj postavke iz prejšnjega meseca, če za trenutni mesec še ne obstajajo
        await copyPreviousMonthTrainerRates(currentTrainerRatesMonth, currentTrainerRatesYear);
        
        const trainerRates = await getTrainerRatesFromDB(currentTrainerRatesMonth, currentTrainerRatesYear);
        const seasonId = getAdminSeasonFilterId();
        const seasonName = getSeasonNameById(seasonId) || 'izbrana sezona';
        const monthLabel = new Date(currentTrainerRatesYear, currentTrainerRatesMonth - 1, 1)
            .toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainers = [...trainers]
            .filter(trainer => !trainer.is_deleted)
            .sort((a, b) => {
                const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '', 'sl');
                if (lastNameCompare !== 0) {
                    return lastNameCompare;
                }
                return (a.first_name || '').localeCompare(b.first_name || '', 'sl');
            });
        
        let html = `<p class="muted" style="font-size:13px;margin-bottom:12px">Sezona: <strong>${escapeHtml(seasonName)}</strong> · ${monthLabel} · prikazani so samo termini, ki v tem mesecu dejansko tečejo.</p>`;
        html += '<div class="trainer-rates-list" style="display: flex; flex-direction: column; gap: 12px;">';
        
        for (const trainer of sortedTrainers) {
            const rate = trainerRates[trainer.id] || 25; // Default to 25€/termin
            
            const activeTerms = getTrainerTermsActiveInMonth(
                trainer,
                currentTrainerRatesMonth,
                currentTrainerRatesYear,
                seasonId
            );
            const termCount = activeTerms.length;
            const sessionCount = countTrainerSessionsInMonth(trainer, currentTrainerRatesMonth, currentTrainerRatesYear, seasonId);
            const estimatedCost = calcTrainerCostFromSessions(sessionCount, rate);
            const termLabels = activeTerms.map(t => formatTermTimeLabel(t)).join(', ');
            const termHint = termCount > 0
                ? termLabels
                : 'Ni dodeljenih terminov v tej sezoni — preverite zavihek Trenerji ali izberite drug mesec/sezono';
            const estimateHint = sessionCount > 0
                ? `${sessionCount} ${sessionCount === 1 ? 'termin' : sessionCount === 2 ? 'termina' : 'terminov'} × ${parseFloat(rate).toFixed(2)} € = ${estimatedCost.toFixed(2)} €/mesec (ocena)`
                : (termCount === 0 ? '' : '0 terminov v tem mesecu');
            
            html += `
                <div class="trainer-rate-row" style="display: flex; align-items: center; gap: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                    <div style="flex: 1; min-width: 200px;">
                        <label for="trainer-rate-${trainer.id}" style="font-weight: 500; display: block; margin-bottom: 4px;">
                            ${trainer.first_name} ${trainer.last_name}
                        </label>
                        <span style="font-size: 12px; color: ${termCount > 0 ? '#6c757d' : '#991b1b'};">
                            ${termCount} termin${termCount === 1 ? '' : termCount === 2 ? 'a' : 'ov'} na teden
                        </span>
                        <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${escapeHtml(termHint)}</div>
                        ${estimateHint ? `<div style="font-size: 12px; color: #2563eb; margin-top: 4px; font-weight: 500;">${escapeHtml(estimateHint)}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="number" 
                               id="trainer-rate-${trainer.id}" 
                               value="${rate}" 
                               min="0" 
                               step="0.01" 
                               style="width: 120px; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;"
                               onchange="updateTrainerRate('${trainer.id}', this.value)">
                        <span style="color: #6c757d;">€/termin</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        elTrainerRatesSettings.innerHTML = html;
    }

    // Posodobljena funkcija za shranjevanje stroškov prog
    async function saveTermCosts() {
        const termCosts = {};
        
        // Shrani urne postavke za vse termine (tudi pretekle sezone)
        for (const term of TERMS) {
            const input = document.getElementById(`term-cost-${term.id}`);
            if (input) {
                termCosts[term.id] = input.value;
            }
        }
        
        const success = await saveTermCostsToDB(termCosts);
        
        if (success) {
            showMessage('Stroški prog so bili uspešno shranjeni!', 'success');
            if (currentSection === 'finance') {
                calculateFinanceData();
            }
        } else {
            showMessage('Napaka pri shranjevanju stroškov prog!', 'error');
        }
    }

    // Posodobljena funkcija za shranjevanje urnih postavk
    async function saveTrainerRates() {
        const trainerRates = {};
        
        for (const trainer of trainers) {
            if (trainer.is_deleted) continue;
            
            const input = document.getElementById(`trainer-rate-${trainer.id}`);
            if (input) {
                trainerRates[trainer.id] = input.value;
            }
        }
        
        const success = await saveTrainerRatesToDB(trainerRates);
        
        if (success) {
            showMessage('Urne postavke so bile uspešno shranjene!', 'success');
            if (currentSection === 'finance') {
                calculateFinanceData();
            }
        } else {
            showMessage('Napaka pri shranjevanju urnih postavk!', 'error');
        }
    }

    // Posodobljena funkcija za posodobitev pristojbine plavalca
    async function updateSwimmerFee(swimmerId, fee, month, year) {
        const success = await updateSwimmerFeeInDB(swimmerId, fee, month, year);
        
        if (success) {
            // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
            if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                calculateFinanceData();
            }
            refreshSwimmerFees();
        } else {
            showMessage('Napaka pri posodobitvi pristojbine!', 'error');
        }
    }

    // Posodobljena funkcija za posodobitev popusta plavalca
    async function updateSwimmerDiscount(swimmerId, discount, month, year) {
        const success = await updateSwimmerDiscountInDB(swimmerId, discount, month, year);
        
        if (success) {
            // Osveži finance summary, če se sprememba nanaša na isti mesec/leto kot prikazan finance summary
            if (currentSection === 'finance' && currentFinanceMonth === month && currentFinanceYear === year) {
                calculateFinanceData();
            }
            refreshSwimmerFees();
        } else {
            showMessage('Napaka pri posodobitvi popusta!', 'error');
        }
    }

    // ===== POMOŽNE FUNKCIJE =====

    // Funkcija za posodobitev stroška posameznega termina
    async function updateTermCost(termId, cost) {
        const termCosts = await getTermCostsFromDB();
        termCosts[termId] = parseFloat(cost);
        
        const success = await saveTermCostsToDB(termCosts);
        if (success && currentSection === 'finance') {
            calculateFinanceData();
        }
    }

    // Funkcija za posodobitev urni postavki posameznega trenerja
    async function updateTrainerRate(trainerId, rate) {
        const trainerRates = await getTrainerRatesFromDB(currentTrainerRatesMonth, currentTrainerRatesYear);
        trainerRates[trainerId] = parseFloat(rate);
        
        const success = await saveTrainerRatesToDB(trainerRates, currentTrainerRatesMonth, currentTrainerRatesYear);
        if (success && currentSection === 'finance') {
            calculateFinanceData();
        }
    }

    // Funkcija za pridobivanje ročno vnesenih stroškov iz baze
    async function getManualCostsFromDB(month, year) {
        try {
            const { data, error } = await supabase
                .from('manual_costs')
                .select('*')
                .eq('month', month)
                .eq('year', year)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Napaka pri nalaganju ročnih stroškov:', error);
                return null;
            }
            
            if (data) {
                return {
                    monthlyFee: data.monthly_fee !== null ? data.monthly_fee : undefined,
                    trainerCost: data.trainer_cost !== null ? data.trainer_cost : undefined,
                    managementCost: data.management_cost !== null ? data.management_cost : undefined,
                    facilityCost: data.facility_cost !== null ? data.facility_cost : undefined,
                    membershipFee: data.membership_fee !== null ? data.membership_fee : 0
                };
            }
            
            return null;
        } catch (error) {
            console.error('Napaka pri pridobivanju ročnih stroškov:', error);
            return null;
        }
    }
    
    // Funkcija za shranjevanje ročno vnesene vrednosti stroška
    async function saveManualCost(costType, value, month, year) {
        try {
            // Mapiranje tipov stroškov na stolpce v bazi
            const costTypeMap = {
                'monthlyFee': 'monthly_fee',
                'trainerCost': 'trainer_cost',
                'managementCost': 'management_cost',
                'facilityCost': 'facility_cost',
                'membershipFee': 'membership_fee'
            };
            
            const columnName = costTypeMap[costType];
            if (!columnName) {
                console.error('Neznan tip stroška:', costType);
                return;
            }
            
            const costValue = value === '' || value === null || value === undefined ? null : parseFloat(value);
            
            // Najprej preberi obstoječi zapis, da ohranimo druge vrednosti
            const { data: existing } = await supabase
                .from('manual_costs')
                .select('*')
                .eq('month', month)
                .eq('year', year)
                .single();
            
            // Pripravi podatke za upsert
            const upsertData = {
                month: month,
                year: year,
                [columnName]: costValue
            };
            
            // Če zapis že obstaja, ohrani druge vrednosti
            if (existing) {
                upsertData.monthly_fee = existing.monthly_fee;
                upsertData.trainer_cost = existing.trainer_cost;
                upsertData.management_cost = existing.management_cost;
                upsertData.facility_cost = existing.facility_cost;
                upsertData.membership_fee = existing.membership_fee;
                // Prepiši le posodobljeno polje
                upsertData[columnName] = costValue;
            }
            
            // Upsert (insert ali update)
            const { error: upsertError } = await supabase
                .from('manual_costs')
                .upsert(upsertData, { 
                    onConflict: 'month,year',
                    ignoreDuplicates: false 
                });
            
            if (upsertError) {
                console.error('Napaka pri shranjevanju ročnih stroškov:', upsertError);
                // Fallback na localStorage
                const key = `manualCosts_${year}_${month}`;
                const saved = JSON.parse(localStorage.getItem(key) || '{}');
                saved[costType] = costValue;
                localStorage.setItem(key, JSON.stringify(saved));
            }
            
            // Osveži prikaz
            if (currentSection === 'finance') {
                calculateFinanceData();
            }
        } catch (error) {
            console.error('Napaka pri shranjevanju ročnih stroškov:', error);
            // Fallback na localStorage
            const key = `manualCosts_${year}_${month}`;
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            saved[costType] = parseFloat(value);
            localStorage.setItem(key, JSON.stringify(saved));
        }
    }
    
    // Funkcija za ponastavitev ročno vnesenih vrednosti na izračunane
    function resetManualCosts(month, year) {
        if (confirm('Ali ste prepričani, da želite ponastaviti vse ročno vnesene vrednosti na izračunane vrednosti?')) {
            const key = `manualCosts_${year}_${month}`;
            localStorage.removeItem(key);
            
            // Osveži prikaz
            if (currentSection === 'finance') {
                calculateFinanceData();
            }
        }
    }
    
    // ===== GLOBALNE FUNKCIJE =====
    window.updateSwimmerFee = updateSwimmerFee;
    window.updateSwimmerDiscount = updateSwimmerDiscount;
    window.updateTermCost = updateTermCost;
    window.updateTrainerRate = updateTrainerRate;
    window.copyFeesForNextYear = copyFeesForNextYear;
    window.saveManualCost = saveManualCost;
    window.resetManualCosts = resetManualCosts;
    
    // Funkcija za izvoz seznama plavalcev
    window.exportSwimmersList = function() {
        try {
            const seasonName = getSeasonNameById(getAdminSeasonFilterId()) || 'sezona';
            let csv = 'first_name,last_name,email,phone,address,postal_code,terms\n';
            
            const seasonTermIds = getAdminSeasonTermIds();
            const activeSwimmers = swimmers.filter(s => !s.is_deleted && entityHasTermsInAdminSeason(s));
            
            if (activeSwimmers.length === 0) {
                alert('Ni plavalcev za izvoz v izbrani sezoni');
                return;
            }
            
            activeSwimmers.forEach(swimmer => {
                const termsStr = swimmer.terms && swimmer.terms.length > 0 
                    ? swimmer.terms.filter(termId => !seasonTermIds || seasonTermIds.has(termId)).map(termId => {
                        const term = TERMS.find(t => t.id === termId);
                        return term ? `${DAY_SHORT_NAME[term.day]}-${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}` : termId;
                    }).join(',')
                    : '';
                
                csv += `${swimmer.first_name},${swimmer.last_name},${swimmer.email || ''},${swimmer.phone || ''},${swimmer.address || ''},${swimmer.postal_code || ''},"${termsStr}"\n`;
            });
            
            // Prenesi CSV datoteko z BOM za pravilno podporo šumnikov
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `seznam_plavalcev_${seasonName.replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ CSV izvoz seznama plavalcev uspešno končan');
            
        } catch (error) {
            console.error('❌ Napaka pri izvozu seznama plavalcev:', error);
            alert('Napaka pri izvozu seznama plavalcev: ' + error.message);
        }
    };
    
                // Funkcija za prenos primera CSV datoteke za termine plavalcev
            window.downloadSwimmerTermsExample = function() {
                const csvContent = `first_name,last_name,email,phone,address,postal_code,terms
            Janez,Novak,janez.novak@email.com,040123456,Trg svobode 1,1000 Ljubljana,"pon-20:00-21:00,sre-20:00-21:00,čet-20:00-21:00"
            Maja,Kovač,maja.kovac@email.com,041234567,Cesta na Gorenjsko 15,4000 Kranj,"pon-06:15-07:15,čet-06:15-07:15"
            Peter,Horvat,peter.horvat@email.com,042345678,Prešernova 8,2000 Maribor,"sre-07:15-08:15,čet-20:00-21:00"
            Ana,Žnidar,ana.znidar@email.com,043456789,Slovenska cesta 22,1000 Ljubljana,"pon-06:15-07:15"
            Marko,Potočnik,marko.potocnik@email.com,044567890,Trubarjeva 5,1000 Ljubljana,"sre-07:15-08:15,čet-06:15-07:15,čet-20:00-21:00"
            Sara,Medvešek,sara.medvesek@email.com,045678901,Partizanska 12,3000 Celje,"pon-20:00-21:00,sre-20:00-21:00"
            Luka,Žagar,luka.zagar@email.com,046789012,Glavna ulica 3,5000 Nova Gorica,"čet-06:15-07:15,čet-20:00-21:00"
            Nina,Košir,nina.kosir@email.com,047890123,Stara cesta 7,6000 Koper,"pon-06:15-07:15,pon-20:00-21:00"
            Tomaž,Petek,tomaz.petek@email.com,048901234,Novi trg 11,8000 Novo Mesto,"sre-07:15-08:15"
            Eva,Horvat,eva.horvat@email.com,049012345,Mestni trg 2,9000 Murska Sobota,"pon-06:15-07:15,sre-07:15-08:15,čet-06:15-07:15"`;

                // Prenesi CSV datoteko z BOM za pravilno podporo šumnikov
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'primer_terminov_plavalcev.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };
    
    // Funkcija za izvoz terminov z njihovimi ID-ji (za uporabo v CSV uvozu plavalcev)
    window.exportTermsList = function() {
        try {
            // Ustvari CSV vsebino s termini
            let csv = 'term_id,dan,dan_kratek,začetna_ura,končna_ura,datum_od,datum_do\n';
            
            const sortedTerms = getTermsForAdminSeason();
            
            if (sortedTerms.length === 0) {
                alert('Ni terminov za izvoz v izbrani sezoni');
                return;
            }
            
            sortedTerms.forEach(term => {
                const dayNames = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
                const dayName = dayNames[term.day] || `Dan ${term.day}`;
                const dateFrom = formatDate(term.date_from);
                const dateTo = formatDate(term.date_to);
                
                csv += `${term.id},${dayName},${DAY_SHORT_NAME[term.day]},${term.start_time},${term.end_time},"${dateFrom}","${dateTo}"\n`;
            });
            
            // Prenesi CSV datoteko z BOM za pravilno podporo šumnikov
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `seznam_terminov_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ CSV izvoz seznama terminov uspešno končan');
            alert(`Izvoženih ${sortedTerms.length} terminov. Uporabite stolpec "term_id" za uvoz plavalcev.`);
            
        } catch (error) {
            console.error('❌ Napaka pri izvozu seznama terminov:', error);
            alert('Napaka pri izvozu seznama terminov: ' + error.message);
        }
            };

    // ===== FUNKCIJE ZA KOPIRANJE VADNIN =====
    
    // Funkcija za kopiranje vadnin za naslednje leto (leto + 1)
    async function copyFeesForNextYear() {
        try {
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const sourceYear = currentYear;
            
// console.log(`🔄 Začenjam kopiranje vadnin iz ${sourceYear} v ${nextYear}...`);
            
            // Pridobi vadnine iz decembra trenutnega leta (zadnji mesec)
            const { data: decemberFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', 12) // December (1-based)
                .eq('year', sourceYear);
            
            if (fetchError) {
                console.error(`❌ Napaka pri pridobivanju vadnin iz decembra ${sourceYear}:`, fetchError);
                showMessage(`Napaka pri pridobivanju vadnin iz decembra ${sourceYear}!`, 'error');
                return false;
            }
            
            if (!decemberFees || decemberFees.length === 0) {
// console.log(`⚠️ Ni vadnin za december ${sourceYear}`);
                showMessage(`Ni vadnin za december ${sourceYear}! Najprej ustvarite vadnine za december ${sourceYear}.`, 'info');
                return false;
            }
            
// console.log(`✅ Najdenih ${decemberFees.length} vadnin iz decembra ${sourceYear} za kopiranje`);
            
            // Ustvari vadnine za vse mesece naslednjega leta
            const newFeesNextYear = [];
            for (let month = 1; month <= 12; month++) {
                decemberFees.forEach(fee => {
                    newFeesNextYear.push({
                        swimmer_id: fee.swimmer_id,
                        month: month,
                        year: nextYear,
                        monthly_fee: fee.monthly_fee,
                        discount: 0 // Brez popusta za nove mesece
                    });
                });
            }
            
// console.log(`📅 Ustvarjam ${newFeesNextYear.length} vadnin za leto ${nextYear} (${decemberFees.length} plavalcev × 12 mesecev)`);
            
            // Preveri, katere vadnine za naslednje leto že obstajajo
            const { data: existingFeesNextYear, error: existingError } = await supabase
                .from('swimmer_monthly_fees')
                .select('swimmer_id, month')
                .eq('year', nextYear);
            
            if (existingError) {
                console.error(`❌ Napaka pri preverjanju obstoječih vadnin za ${nextYear}:`, existingError);
                showMessage(`Napaka pri preverjanju obstoječih vadnin za ${nextYear}!`, 'error');
                return false;
            }
            
            // Filtriraj samo nove vadnine (ki še ne obstajajo)
            const existingKeys = new Set(existingFeesNextYear.map(fee => `${fee.swimmer_id}-${fee.month}`));
            const newFeesToInsert = newFeesNextYear.filter(fee => 
                !existingKeys.has(`${fee.swimmer_id}-${fee.month}`)
            );
            
// console.log(`📊 Obstaja ${existingFeesNextYear.length} vadnin za ${nextYear}, ustvarjam ${newFeesToInsert.length} novih`);
            
            if (newFeesToInsert.length === 0) {
// console.log(`✅ Vse vadnine za leto ${nextYear} že obstajajo`);
                showMessage(`Vse vadnine za leto ${nextYear} že obstajajo!`, 'info');
                return true;
            }
            
            // Uvozi samo nove vadnine za naslednje leto v bazo
            const { data: insertedFees, error: insertError } = await supabase
                .from('swimmer_monthly_fees')
                .insert(newFeesToInsert)
                .select();
            
            if (insertError) {
                console.error(`❌ Napaka pri vstavljanju vadnin za ${nextYear}:`, insertError);
                showMessage(`Napaka pri vstavljanju vadnin za ${nextYear}!`, 'error');
                return false;
            }
            
// console.log(`✅ Uspešno ustvarjenih ${insertedFees.length} novih vadnin za leto ${nextYear}`);
            showMessage(`Uspešno ustvarjenih ${insertedFees.length} novih vadnin za leto ${nextYear}!`, 'success');
            
            // Osveži prikaz
            if (currentSection === 'finance') {
                await refreshSwimmerFees();
                calculateFinanceData();
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Napaka pri kopiranju vadnin za 2026:', error);
            showMessage('Napaka pri kopiranju vadnin za 2026!', 'error');
            return false;
        }
    }
    
    // Funkcija za kopiranje vadnin iz prejšnega meseca v trenutni mesec
    async function copyPreviousMonthFees(targetMonth, targetYear) {
        try {
            const currentMonth1Based = targetMonth ?? currentFinanceMonth;
            const currentYear = targetYear ?? currentFinanceYear;

            if (currentMonth1Based < 1 || currentMonth1Based > 12) {
                showMessage('Napaka: Neveljaven mesec!', 'error');
                return false;
            }

            let previousMonth1Based = currentMonth1Based - 1;
            let previousYear = currentYear;
            if (previousMonth1Based < 1) {
                previousMonth1Based = 12;
                previousYear = currentYear - 1;
            }
            
// console.log(`🔄 Začenjam kopiranje vadnin iz ${previousMonth + 1}/${previousYear} v ${currentMonth + 1}/${currentYear}...`);
            
            // Pridobi vse vadnine iz prejšnega meseca (month v bazi je 1-based)
            const { data: previousMonthFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', previousMonth1Based)
                .eq('year', previousYear);
            
            if (fetchError) {
                console.error('Napaka pri pridobivanju vadnin iz prejšnega meseca:', fetchError);
                showMessage('Napaka pri pridobivanju vadnin iz prejšnega meseca!', 'error');
                return false;
            }
            
            if (!previousMonthFees || previousMonthFees.length === 0) {
// console.log(`Ni vadnin za prejšnji mesec ${previousMonth1Based}/${previousYear}`);
                showMessage(`Ni vadnin za prejšnji mesec ${previousMonth1Based}/${previousYear}!`, 'info');
                return false;
            }
            
// console.log(`Najdenih ${previousMonthFees.length} vadnin iz prejšnega meseca za kopiranje`);
            
            // Povozimo vadnine tekočega meseca – samo plavalci z dodeljenim terminom in veljavnim mesecem obračuna
            const seasonId = getAdminSeasonFilterId();
            const season = seasons.find(s => s.id === seasonId);
            const newFees = previousMonthFees
                .filter(previousFee => {
                    const s = swimmers.find(sw => sw.id === previousFee.swimmer_id);
                    if (!swimmerHasAssignedTerms(s)) return false;
                    if (!entityHasTermsInAdminSeason(s)) return false;
                    return shouldIncludeSwimmerInBillingMonth(
                        previousFee.swimmer_id,
                        currentMonth1Based,
                        currentYear,
                        season,
                        seasonId
                    );
                })
                .map(previousFee => ({
                swimmer_id: previousFee.swimmer_id,
                month: currentMonth1Based, // 1-based za bazo
                year: currentYear,
                monthly_fee: previousFee.monthly_fee,
                discount: 0, // Brez popusta za nov mesec
                is_oly: previousFee.is_oly || false
            }));
            
// console.log(`Ustvarjam / posodabljam ${newFees.length} vadnin za trenutni mesec`);
            
            const { data: insertedFees, error: insertError } = await supabase
                .from('swimmer_monthly_fees')
                .upsert(newFees, { 
                    onConflict: 'swimmer_id,month,year' 
                })
                .select();
            
            if (insertError) {
                console.error('Napaka pri vnašanju novih vadnin:', insertError);
                showMessage('Napaka pri vnašanju novih vadnin!', 'error');
                return false;
            }
            
// console.log('✅ Uspešno kopirane vadnine:', insertedFees);
            showMessage(`Uspešno kopiranih ${insertedFees.length} vadnin iz ${previousMonth1Based}/${previousYear} v ${currentMonth1Based}/${currentYear} (obstoječe so bile prepisane).`, 'success');
            
            // Osveži finance sekcijo
            if (currentSection === 'finance') {
                refreshAllFinanceViews();
            } else {
                refreshSwimmerFees();
            }
            
            return true;
            
        } catch (error) {
            console.error('Napaka pri kopiranju vadnin:', error);
            showMessage('Napaka pri kopiranju vadnin: ' + error.message, 'error');
            return false;
        }
    }
    
    // Funkcija za avtomatsko kopiranje vadnin iz prejšnega meseca
    async function autoCopyFeesIfNeeded() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Dodatna validacija meseca
            if (currentMonth < 0 || currentMonth > 11) {
                console.error(`❌ Neveljaven trenutni mesec v autoCopyFeesIfNeeded: ${currentMonth}`);
                showMessage('Napaka: Neveljaven trenutni mesec!', 'error');
                return;
            }
            
// console.log(`🔍 Preverjam vadnine za trenutni mesec: ${currentMonth + 1}/${currentYear}`);
            
            // Pretvori mesec iz 0-based (JavaScript) v 1-based (SQL)
            const currentMonth1Based = currentMonth + 1;
            
            // Preveri, ali obstajajo vadnine za trenutni mesec
            const { data: currentMonthFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', currentMonth1Based)
                .eq('year', currentYear);
            
            if (fetchError) {
                console.error('Napaka pri preverjanju trenutnih vadnin:', fetchError);
                return;
            }
            
            // Če ni vadnin za trenutni mesec, poskusi kopirati iz prejšnega meseca
            if (!currentMonthFees || currentMonthFees.length === 0) {
// console.log(`🔄 Ni vadnin za trenutni mesec ${currentMonth + 1}/${currentYear} - poskušam kopirati iz prejšnega meseca...`);
                await copyPreviousMonthFees();
            } else {
// console.log(`✅ Vadnine za trenutni mesec ${currentMonth + 1}/${currentYear} že obstajajo (${currentMonthFees.length} vadnin)`);
            }
            
        } catch (error) {
            console.error('Napaka pri avtomatskem kopiranju vadnin:', error);
        }
    }
    
    // Poveži gumbe za kopiranje in preverjanje vadnin z obstoječimi gumbi v HTML
    function setupCopyFeesButton() {
        const copyButton = document.getElementById('copyFeesBtn');
        const copyNextYearButton = document.getElementById('copyFeesNextYearBtn');
        const checkButton = document.getElementById('checkFeesStatusBtn');
        
        if (copyButton) {
            copyButton.onclick = async () => {
                const monthLabel = new Date(currentFinanceYear, currentFinanceMonth - 1, 1)
                    .toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
                if (!confirm(`Kopiram vadnine iz prejšnjega meseca v ${monthLabel}?\n\nObstoječe vadnine za ta mesec bodo prepisane. Po kopiranju jih lahko še urejate.`)) return;
                await copyPreviousMonthFees();
            };
        }
        
        if (copyNextYearButton) {
            copyNextYearButton.onclick = copyFeesForNextYear;
            
            // Dinamično posodobi besedilo gumba z naslednjim letom
            const nextYear = new Date().getFullYear() + 1;
            copyNextYearButton.textContent = `📅 Kopiraj vadnine za leto ${nextYear}`;
            
// console.log(`✅ Gumb za kopiranje vadnin za leto ${nextYear} je povezan`);
        } else {
            console.warn('⚠️ Gumb za kopiranje vadnin za naslednje leto ni bil najden');
        }
        
        if (checkButton) {
            checkButton.onclick = async () => {
                const status = await checkFeesStatus();
                if (status.status === 'complete') {
                    showMessage(`✅ Vse vadnine za trenutni mesec obstajajo (skupaj ${status.totalFees} vadnin)`, 'success');
                } else if (status.status === 'incomplete') {
                    showMessage(`⚠️ Manjkajo vadnine za meseec: ${status.missingMonths.join(', ')}`, 'warning');
                } else {
                    showMessage(`❌ Napaka pri preverjanju: ${status.error}`, 'error');
                }
            };
// console.log('✅ Gumb za preverjanje stanja vadnin je povezan');
        } else {
            console.warn('⚠️ Gumb za kopiranje vadnin ni bil najden');
        }
    }
    
    // Funkcija za preverjanje stanja vadnin za trenutni mesec
    async function checkFeesStatus() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Dodatna validacija meseca
            if (currentMonth < 0 || currentMonth > 11) {
                console.error(`❌ Neveljaven trenutni mesec v checkFeesStatus: ${currentMonth}`);
                return { status: 'error', error: `Neveljaven trenutni mesec: ${currentMonth}` };
            }
            
// console.log(`🔍 Preverjam stanje vadnin za trenutni mesec: ${currentMonth + 1}/${currentYear}...`);
            
            // Pretvori mesec iz 0-based (JavaScript) v 1-based (SQL)
            const currentMonth1Based = currentMonth + 1;
            
            // Preveri vadnine za trenutni mesec
            const { data: currentMonthFees, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', currentMonth1Based)
                .eq('year', currentYear);
            
            if (error) {
                console.error(`Napaka pri preverjanju vadnin za ${currentMonth + 1}/${currentYear}:`, error);
                return { status: 'error', error: error.message };
            }
            
            if (!currentMonthFees || currentMonthFees.length === 0) {
// console.log(`⚠️ Ni vadnin za trenutni mesec ${currentMonth + 1}/${currentYear}`);
                return { status: 'incomplete', totalFees: 0, missingMonths: [`${currentMonth + 1}/${currentYear}`] };
            } else {
// console.log(`✅ Vadnine za trenutni mesec ${currentMonth + 1}/${currentYear} obstajajo (skupaj ${currentMonthFees.length} vadnin)`);
                return { status: 'complete', totalFees: currentMonthFees.length, missingMonths: [] };
            }
            
        } catch (error) {
            console.error('Napaka pri preverjanju stanja vadnin:', error);
            return { status: 'error', error: error.message };
        }
    }
    
    // Funkcija za čiščenje neveljavnih vadnin iz baze
    async function clearInvalidFees() {
        try {
// console.log('🧹 Začenjam čiščenje neveljavnih vadnin...');
            
            // Poišči vse vadnine z neveljavnimi meseci
            const { data: allFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*');
            
            if (fetchError) {
                console.error('Napaka pri pridobivanju vadnin:', fetchError);
                showMessage('Napaka pri pridobivanju vadnin!', 'error');
                return false;
            }
            
            const invalidFees = allFees.filter(fee => fee.month < 0 || fee.month > 11);
            
            if (invalidFees.length === 0) {
// console.log('✅ Ni neveljavnih vadnin za čiščenje');
                showMessage('Ni neveljavnih vadnin za čiščenje!', 'info');
                return true;
            }
            
// console.log(`🧹 Najdenih ${invalidFees.length} neveljavnih vadnin za brisanje`);
            
            // Izbriši neveljavne vadnine
            const { error: deleteError } = await supabase
                .from('swimmer_monthly_fees')
                .delete()
                .in('id', invalidFees.map(fee => fee.id));
            
            if (deleteError) {
                console.error('Napaka pri brisanju neveljavnih vadnin:', deleteError);
                showMessage('Napaka pri brisanju neveljavnih vadnin!', 'error');
                return false;
            }
            
// console.log(`✅ Uspešno izbrisanih ${invalidFees.length} neveljavnih vadnin`);
            showMessage(`Uspešno izbrisanih ${invalidFees.length} neveljavnih vadnin!`, 'success');
            
            return true;
            
        } catch (error) {
            console.error('Napaka pri čiščenju neveljavnih vadnin:', error);
            showMessage('Napaka pri čiščenju neveljavnih vadnin!', 'error');
            return false;
        }
    }
    
    // Funkcija za preverjanje baze podatkov za neveljavne podatke
    async function checkDatabaseIntegrity() {
        try {
// console.log('🔍 Preverjam integriteto baze podatkov...');
            
            // Poišči vse vadnine
            const { data: allFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*');
            
            if (fetchError) {
                console.error('Napaka pri pridobivanju vadnin:', fetchError);
                return { status: 'error', error: fetchError.message };
            }
            
            const invalidFees = allFees.filter(fee => fee.month < 0 || fee.month > 11);
            const validFees = allFees.filter(fee => fee.month >= 0 && fee.month <= 11);
            
// console.log(`📊 Skupaj vadnin: ${allFees.length}`);
// console.log(`✅ Veljavne vadnine: ${validFees.length}`);
// console.log(`❌ Neveljavne vadnine: ${invalidFees.length}`);
            
            if (invalidFees.length > 0) {
// console.log('Neveljavne vadnine:', invalidFees);
                return { 
                    status: 'corrupted', 
                    total: allFees.length, 
                    valid: validFees.length, 
                    invalid: invalidFees.length,
                    invalidData: invalidFees
                };
            } else {
                return { 
                    status: 'clean', 
                    total: allFees.length, 
                    valid: validFees.length, 
                    invalid: 0 
                };
            }
            
        } catch (error) {
            console.error('Napaka pri preverjanju integritete baze:', error);
            return { status: 'error', error: error.message };
        }
    }

    // Naredimo funkcije globalno dostopne za uporabo v HTML onclick atributih
    window.clearInvalidFees = clearInvalidFees;
    window.checkDatabaseIntegrity = checkDatabaseIntegrity;
    
    // ===== Mailing liste =====
    function updateMailingTermSelect() {
        if (!elMailingTermsCheckboxes) return;
        
        elMailingTermsCheckboxes.innerHTML = '';
        
        // Prikaži termine iz izbrane sezone
        const sortedTerms = getTermsForAdminSeason();
        
        if (sortedTerms.length === 0) {
            elMailingTermsCheckboxes.innerHTML = '<p class="muted">Ni terminov v izbrani sezoni</p>';
            return;
        }
        
        // Razvrsti termine: najprej po dnevu (1-7), nato po času začetka
        sortedTerms.sort((a, b) => {
            if (a.day !== b.day) {
                return a.day - b.day;
            }
            return a.start_time.localeCompare(b.start_time);
        });
        
        // Dodaj checkbox za "Izberi vse"
        const selectAllDiv = document.createElement('div');
        selectAllDiv.style.marginBottom = '10px';
        selectAllDiv.style.paddingBottom = '10px';
        selectAllDiv.style.borderBottom = '1px solid #ddd';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'mailingSelectAllTerms';
        selectAllCheckbox.style.marginRight = '8px';
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = elMailingTermsCheckboxes.querySelectorAll('input[type="checkbox"][data-term-id]');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            displayMailingList();
        });
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'mailingSelectAllTerms';
        selectAllLabel.textContent = 'Izberi vse';
        selectAllLabel.style.fontWeight = 'bold';
        selectAllLabel.style.cursor = 'pointer';
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        elMailingTermsCheckboxes.appendChild(selectAllDiv);
        
        sortedTerms.forEach(t => {
            const termDiv = document.createElement('div');
            termDiv.style.marginBottom = '6px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `mailingTerm_${t.id}`;
            checkbox.value = t.id;
            checkbox.setAttribute('data-term-id', t.id);
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', () => {
                displayMailingList();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `mailingTerm_${t.id}`;
            label.textContent = `${DAY_SHORT_NAME[t.day]} ${formatTimeWithoutSeconds(t.start_time)}-${formatTimeWithoutSeconds(t.end_time)}`;
            label.style.cursor = 'pointer';
            
            termDiv.appendChild(checkbox);
            termDiv.appendChild(label);
            elMailingTermsCheckboxes.appendChild(termDiv);
        });
    }
    
    // Funkcija za pridobitev email naslovov glede na filtre
    function getMailingListEmails() {
        const filterType = elMailingFilterType ? elMailingFilterType.value : '';
        
        if (!filterType) {
            return [];
        }
        
        let targetTermIds = [];
        
        if (filterType === 'term') {
            // Določeni termini (več izbranih)
            if (!elMailingTermsCheckboxes) {
                return [];
            }
            const checkedCheckboxes = elMailingTermsCheckboxes.querySelectorAll('input[type="checkbox"][data-term-id]:checked');
            if (checkedCheckboxes.length === 0) {
                return [];
            }
            targetTermIds = Array.from(checkedCheckboxes).map(cb => cb.value);
        } else if (filterType === 'afternoon') {
            targetTermIds = getTermsForAdminSeason()
                .filter(term => {
                    const startHour = parseInt(term.start_time.split(':')[0]);
                    return startHour < 18;
                })
                .map(term => term.id);
        } else if (filterType === 'evening') {
            targetTermIds = getTermsForAdminSeason()
                .filter(term => {
                    const startHour = parseInt(term.start_time.split(':')[0]);
                    return startHour >= 18;
                })
                .map(term => term.id);
        }
        
        // Pridobi vse plavalce, ki imajo vsaj enega od ciljnih terminov
        const targetSwimmers = swimmers.filter(swimmer => {
            if (swimmer.is_deleted) return false;
            if (!swimmer.terms || swimmer.terms.length === 0) return false;
            return swimmer.terms.some(termId => targetTermIds.includes(termId));
        });
        
        // Zberi vse email naslove (brez duplikatov)
        const emailSet = new Set();
        const emailList = [];
        
        targetSwimmers.forEach(swimmer => {
            if (swimmer.email && swimmer.email.trim() && isValidEmail(swimmer.email.trim())) {
                const email = swimmer.email.trim().toLowerCase();
                if (!emailSet.has(email)) {
                    emailSet.add(email);
                    emailList.push({
                        email: swimmer.email.trim(),
                        name: `${swimmer.first_name} ${swimmer.last_name}`
                    });
                }
            }
        });
        
        return emailList;
    }
    
    // Funkcija za prikaz email naslovov
    function displayMailingList() {
        if (!elMailingListBox) return;
        
        const filterType = elMailingFilterType ? elMailingFilterType.value : '';
        
        if (!filterType) {
            elMailingListBox.innerHTML = '<p class="muted">Izberite tip filtra</p>';
            elCopyMailingListBtn.style.display = 'none';
            return;
        }
        
        if (filterType === 'term') {
            const checkedCheckboxes = elMailingTermsCheckboxes ? elMailingTermsCheckboxes.querySelectorAll('input[type="checkbox"][data-term-id]:checked') : [];
            if (checkedCheckboxes.length === 0) {
                elMailingListBox.innerHTML = '<p class="muted">Izberite vsaj en termin</p>';
                elCopyMailingListBtn.style.display = 'none';
                return;
            }
        }
        
        const emailList = getMailingListEmails();
        
        if (emailList.length === 0) {
            elMailingListBox.innerHTML = '<p class="muted">Ni email naslovov za prikazano skupino</p>';
            elCopyMailingListBtn.style.display = 'none';
            return;
        }
        
        // Pridobi informacije o izbranih terminih za prikaz
        let selectedTermsInfo = '';
        if (filterType === 'term' && elMailingTermsCheckboxes) {
            const checkedCheckboxes = elMailingTermsCheckboxes.querySelectorAll('input[type="checkbox"][data-term-id]:checked');
            const selectedTermNames = Array.from(checkedCheckboxes).map(cb => {
                const termId = cb.value;
                const term = TERMS.find(t => t.id === termId);
                if (term) {
                    return `${DAY_SHORT_NAME[term.day]} ${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}`;
                }
                return termId;
            });
            selectedTermsInfo = `<div style="margin-bottom: 10px; padding: 8px; background: #e8f5e9; border-radius: 4px;"><strong>Izbrani termini:</strong> ${selectedTermNames.join(', ')}</div>`;
        }
        
        // Prikaži seznam email naslovov
        let html = selectedTermsInfo;
        html += `<div style="margin-bottom: 15px;"><strong>Najdenih email naslovov: ${emailList.length}</strong></div>`;
        html += '<div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 6px; background: #f9f9f9;">';
        
        emailList.forEach((item, index) => {
            html += `<div style="padding: 5px; border-bottom: 1px solid #eee;">
                <strong>${item.name}</strong>: ${item.email}
            </div>`;
        });
        
        html += '</div>';
        html += '<div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 6px;">';
        html += '<strong>Email naslovi (ločeni z vejico):</strong><br>';
        html += `<textarea readonly style="width: 100%; min-height: 80px; margin-top: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;" id="mailingEmailsTextarea">${emailList.map(item => item.email).join(', ')}</textarea>`;
        html += '</div>';
        
        elMailingListBox.innerHTML = html;
        elCopyMailingListBtn.style.display = 'inline-block';
    }
    
    // Event listenerji za mailing liste
    if (elMailingFilterType) {
        elMailingFilterType.addEventListener('change', () => {
            const filterType = elMailingFilterType.value;
            if (elMailingTermSelectRow) {
                elMailingTermSelectRow.style.display = filterType === 'term' ? 'flex' : 'none';
            }
            // Počisti izbrane checkboxe
            if (elMailingTermsCheckboxes) {
                const checkboxes = elMailingTermsCheckboxes.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = false);
            }
            displayMailingList();
        });
    }
    
    if (elLoadMailingListBtn) {
        elLoadMailingListBtn.addEventListener('click', () => {
            displayMailingList();
        });
    }
    
    if (elCopyMailingListBtn) {
        elCopyMailingListBtn.addEventListener('click', async () => {
            const textarea = document.getElementById('mailingEmailsTextarea');
            if (!textarea) return;
            const text = textarea.value;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    textarea.select();
                    textarea.setSelectionRange(0, text.length);
                    document.execCommand('copy');
                }
                showMessage('Email naslovi so bili kopirani v odložišče', 'success');
            } catch (err) {
                console.error('Napaka pri kopiranju:', err);
                showMessage('Kopiranje ni uspelo — označite besedilo ročno in kopirajte.', 'warning');
            }
        });
    }
    
    // ===== Inicializacija =====
    try {
        loadData();
        loadCostSettings();
        loadDefaultFeeSettings();
        setupCopyFeesButton();
    } catch (error) {
        console.error('❌ Napaka pri inicializaciji:', error);
    }




    


});
