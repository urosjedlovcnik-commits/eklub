// Admin stran za upravljanje plavalne šole
document.addEventListener('DOMContentLoaded', () => {
    //// console.log('🚀 Admin stran se nalaga...');
    
    // Preveri, če je uporabnik prijavljen
    const session = authManager.isAdminLoggedIn();
    if (!session) {
        //// console.log('❌ Uporabnik ni prijavljen, preusmerjam na login...');
        window.location.href = 'admin-login.html';
        return;
    }
    //// console.log('✅ Uporabnik je prijavljen:', session);
    
    // Prikaži informacije o sessiona
    const adminInfo = document.getElementById('adminInfo');
    if (adminInfo) {
        const remainingDays = authManager.getSessionDaysRemaining();
        adminInfo.textContent = `Pozdravljeni, ${session.email} (login velja še ${remainingDays} dni)`;
    }

    // Uporabi centralizirano konfiguracijo
    const supabase = createSupabaseClient();
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

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let trainers = [];
    let attendance = {};
    let termStatus = {};
    let trainerAttendance = {};
    let currentSection = 'swimmers'; // Dodano: sledi trenutni sekciji
    
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

    const DAYNAME = ["","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota","Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];

    // ===== Pomožne funkcije =====
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
        if (direction === 'prev') {
            currentTrainerRatesMonth--;
            if (currentTrainerRatesMonth < 1) {
                currentTrainerRatesMonth = 12;
                currentTrainerRatesYear--;
            }
        } else if (direction === 'next') {
            currentTrainerRatesMonth++;
            if (currentTrainerRatesMonth > 12) {
                currentTrainerRatesMonth = 1;
                currentTrainerRatesYear++;
            }
        }
        updateTrainerRatesMonthDisplay();
        renderTrainerRatesSettings();
    }
    
    function goToCurrentTrainerRatesMonth() {
        const now = new Date();
        currentTrainerRatesMonth = now.getMonth() + 1;
        currentTrainerRatesYear = now.getFullYear();
        updateTrainerRatesMonthDisplay();
        renderTrainerRatesSettings();
    }
    
    function navigateFinanceMonth(direction) {
// console.log('🔄 navigateFinanceMonth - smer:', direction, 'trenutni mesec:', currentFinanceMonth, 'leto:', currentFinanceYear);
        if (direction === 'prev') {
            currentFinanceMonth--;
            if (currentFinanceMonth < 1) {
                currentFinanceMonth = 12;
                currentFinanceYear--;
            }
        } else if (direction === 'next') {
            currentFinanceMonth++;
            if (currentFinanceMonth > 12) {
                currentFinanceMonth = 1;
                currentFinanceYear++;
            }
        }
// console.log('🔄 navigateFinanceMonth - novi mesec:', currentFinanceMonth, 'leto:', currentFinanceYear);
        updateFinanceMonthDisplay();
        calculateFinanceData();
    }
    
    function navigateSwimmerFeesMonth(direction) {
        if (direction === 'prev') {
            currentSwimmerFeesMonth--;
            if (currentSwimmerFeesMonth < 1) {
                currentSwimmerFeesMonth = 12;
                currentSwimmerFeesYear--;
            }
        } else if (direction === 'next') {
            currentSwimmerFeesMonth++;
            if (currentSwimmerFeesMonth > 12) {
                currentSwimmerFeesMonth = 1;
                currentSwimmerFeesYear++;
            }
        }
        updateSwimmerFeesMonthDisplay();
        refreshSwimmerFees();
    }
    
    function goToCurrentFinanceMonth() {
        const now = new Date();
        currentFinanceMonth = now.getMonth() + 1;
        currentFinanceYear = now.getFullYear();
// console.log('🔄 goToCurrentFinanceMonth - nastavljam na:', currentFinanceMonth, currentFinanceYear);
        updateFinanceMonthDisplay();
        calculateFinanceData();
    }
    
    function goToCurrentSwimmerFeesMonth() {
        const now = new Date();
        currentSwimmerFeesMonth = now.getMonth() + 1;
        currentSwimmerFeesYear = now.getFullYear();
        updateSwimmerFeesMonthDisplay();
        refreshSwimmerFees();
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
    const elTermSelect = document.getElementById("termSelect");
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
    const elTrainerTermSelect = document.getElementById("trainerTermSelect");
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
    const elEditSwimmerFirst = document.getElementById("editSwimmerFirst");
    const elEditSwimmerLast = document.getElementById("editSwimmerLast");
    const elEditSwimmerEmail = document.getElementById("editSwimmerEmail");
    const elEditSwimmerPhone = document.getElementById("editSwimmerPhone");
    const elEditSwimmerAddress = document.getElementById("editSwimmerAddress");
    const elEditSwimmerPostalCode = document.getElementById("editSwimmerPostalCode");
    const elSaveEditSwimmerBtn = document.getElementById("saveEditSwimmerBtn");
    const elCloseEditSwimmerModalBtn = document.getElementById("closeEditSwimmerModalBtn");
    const elEditSwimmerInfo = document.getElementById("editSwimmerInfo");

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

    // Funkcija za pridobitev aktivnih terminov (ki še niso potekli)
    function getActiveTerms() {
        const today = new Date();
        const todayISO = iso(today);
        return TERMS.filter(term => term.date_to >= todayISO);
    }

    // ===== Navigacija med sekcijami =====
    document.querySelectorAll('.admin-nav .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Odstrani aktivno stanje iz vseh gumbov
            document.querySelectorAll('.admin-nav .btn').forEach(b => b.classList.remove('active'));
            // Doda aktivno stanje kliknjenemu gumbu
            btn.classList.add('active');
            
            // Skrije vse sekcije
            document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
            // Prikaže ustrezno sekcijo
            const sectionId = btn.getAttribute('data-section') + '-section';
            document.getElementById(sectionId).classList.add('active');
            
            // Posodobi trenutno sekcijo
            currentSection = btn.getAttribute('data-section');
            
            // Če je finance sekcija aktivna, avtomatsko osveži pristojbine plavalcev
            if (currentSection === 'finance') {
                // Nastavi trenutni mesec in leto za pristojbine
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();
                
                // Opomba: elSwimmerFeesMonthSelect in elSwimmerFeesYearSelect so bili zamenjani z navigacijskimi gumbi
                // Vrednosti se sedaj upravljajo preko currentSwimmerFeesMonth in currentSwimmerFeesYear
                
                // Osveži pristojbine plavalcev
                setTimeout(() => {
                    refreshSwimmerFees();
                }, 100);
                
                // Preveri stanje vadnin in avtomatsko kopiraj, če je potrebno
                setTimeout(async () => {
                    const status = await checkFeesStatus();
                    if (status.status === 'incomplete' && status.missingMonths.length > 0) {
                        await copyPreviousMonthFees();
                    }
                }, 500);
            }
        });
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

            // Posodobi UI
            updateSwimmerSelects();
            updateTermSelects();
            updateTrainerSelects();
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

        } catch (error) {
            console.error('❌ Napaka pri nalaganju podatkov:', error);
        }
    }

    // ===== Upravljanje plavalcev =====
    function updateSwimmerSelects() {
        // Posodobi select za plavalce
        elSwimmerSelect.innerHTML = '<option value="">Izberi plavalca</option>';
        
        // Sortiraj plavalce po abecedi po priimku, nato po imenu
        const sortedSwimmers = swimmers
            .filter(s => !s.is_deleted)
            .sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });
        
        sortedSwimmers.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.first_name} ${s.last_name}`;
            elSwimmerSelect.appendChild(option);
        });

        // Počisti select za termine
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';

        // Posodobi select v modalnem oknu
        const modalSwimmerSelect = document.getElementById('modalSwimmerSelect');
        if (modalSwimmerSelect) {
            modalSwimmerSelect.innerHTML = '<option value="">Izberi plavalca</option>';
            
            // Sortiraj plavalce po abecedi po priimku, nato po imenu
            const sortedSwimmers = swimmers
                .filter(s => !s.is_deleted)
                .sort((a, b) => {
                    const aName = `${a.last_name} ${a.first_name}`;
                    const bName = `${b.last_name} ${b.first_name}`;
                    return aName.localeCompare(bName, 'sl');
                });
            
            sortedSwimmers.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = `${s.first_name} ${s.last_name}`;
                modalSwimmerSelect.appendChild(option);
            });
        }
    }

    function updateTermSelects() {
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        
        // Prikaži samo aktivne termine
        const activeTerms = getActiveTerms();
        
        // Razvrsti termine: najprej po dnevu (1-7), nato po času začetka (jutranji pred popoldanskimi)
        const sortedTerms = activeTerms.sort((a, b) => {
            // Najprej primerjaj po dnevu
            if (a.day !== b.day) {
                return a.day - b.day;
            }
            // Če sta ista dana, razvrsti po času začetka
            return a.start_time.localeCompare(b.start_time);
        });
        
        sortedTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${formatTimeWithoutSeconds(t.start_time)}-${formatTimeWithoutSeconds(t.end_time)}`;
            elTermSelect.appendChild(option);
        });
    }

    // Funkcija za posodabljanje select elementa za termine pri dodeljevanju plavalcem
    function updateTermSelectForSwimmer(swimmerId) {
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        
        if (!swimmerId) return;
        
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) return;
        
        // Filtriraj samo aktivne termine, ki jih plavalec še nima
        const activeTerms = getActiveTerms();
        const availableTerms = activeTerms.filter(term => !swimmer.terms.includes(term.id));
        
        // Razvrsti termine: najprej po dnevu (1-7), nato po času začetka (jutranji pred popoldanskimi)
        const sortedTerms = availableTerms.sort((a, b) => {
            // Najprej primerjaj po dnevu
            if (a.day !== b.day) {
                return a.day - b.day;
            }
            // Če sta ista dana, razvrsti po času začetka
            return a.start_time.localeCompare(b.start_time);
        });
        
        sortedTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${formatTimeWithoutSeconds(t.start_time)}-${formatTimeWithoutSeconds(t.end_time)}`;
            elTermSelect.appendChild(option);
        });
    }

    function updateTrainerSelects() {
        // Posodobi select za trenerje
        elTrainerSelect.innerHTML = '<option value="">Izberi trenerja</option>';
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainers = [...trainers].filter(t => !t.is_deleted).sort((a, b) => {
            // Najprej sortiraj po priimku
            const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '', 'sl');
            if (lastNameCompare !== 0) {
                return lastNameCompare;
            }
            // Če so priimki enaki, sortiraj po imenu
            return (a.first_name || '').localeCompare(b.first_name || '', 'sl');
        });
        
        sortedTrainers.forEach(t => {
                const option = document.createElement('option');
                option.value = t.id;
                option.textContent = `${t.first_name} ${t.last_name}`;
                elTrainerSelect.appendChild(option);
        });

        // Počisti select za termine pri trenerjih in prikaži nedodeljene termine
        elTrainerTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        populateUnassignedTerms();
    }

    // Funkcija za posodabljanje select elementa za termine pri dodeljevanju trenerjem
    function updateTermSelectForTrainer(trainerId) {
        elTrainerTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        
        if (!trainerId) {
            // Če ni izbran trener, prikaži samo nedodeljene termine
            populateUnassignedTerms();
            return;
        }
        
        // Ko je trener izbran, vseeno prikaži samo nedodeljene termine
        populateUnassignedTerms();
    }
    
    // Funkcija za prikazovanje samo terminov, ki niso dodeljeni nobenemu trenerju
    function populateUnassignedTerms() {
        const activeTerms = getActiveTerms();
        
        // Zberi vse termine, ki so že dodeljeni kateremukoli trenerju
        const assignedTermIds = new Set();
        trainers.forEach(trainer => {
            if (trainer.terms && trainer.terms.length > 0) {
                trainer.terms.forEach(termId => {
                    assignedTermIds.add(termId);
                });
            }
        });
        
        // Filtriraj samo termine, ki niso dodeljeni nobenemu trenerju
        const unassignedTerms = activeTerms.filter(term => 
            !assignedTermIds.has(term.id)
        );
        
        unassignedTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${formatTimeWithoutSeconds(t.start_time)}-${formatTimeWithoutSeconds(t.end_time)}`;
            elTrainerTermSelect.appendChild(option);
        });
        
        // Dodaj informativno sporočilo, če ni nedodeljenih terminov
        if (unassignedTerms.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'Vsi aktivni termini so že dodeljeni';
            elTrainerTermSelect.appendChild(option);
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
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Ime</th>
                    <th>Priimek</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Termini</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        // Sortiraj plavalce po abecedi po priimku, nato po imenu
        const activeSwimmers = swimmers
            .filter(swimmer => !swimmer.is_deleted)
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
        
        sortedSwimmers.forEach(swimmer => {
            const row = document.createElement('tr');
                
                // Ustvari termine kot "chips" z možnostjo brisanja
                const termsChips = swimmer.terms.map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    if (term) {
                        return `
                            <span class="chip" data-term-id="${termId}" data-swimmer-id="${swimmer.id}">
                                ${DAY_SHORT_NAME[term.day]} ${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}
                                <button class="remove-term-btn" onclick="removeTermFromSwimmer('${swimmer.id}', '${termId}')" title="Odstrani termin">✖</button>
                            </span>
                        `;
                    }
                    return `<span class="chip" data-term-id="${termId}">${termId}</span>`;
                }).join(' ');

            // Določi stil vrstice glede na status
            if (swimmer.is_deleted) {
                row.style.opacity = '0.6';
                row.style.backgroundColor = '#f8f9fa';
            }
            
            row.innerHTML = `
                <td>${swimmer.first_name} ${swimmer.is_deleted ? '<span class="badge warn">Izbrisan</span>' : ''}</td>
                <td>${swimmer.last_name}</td>
                <td>${swimmer.email || '<span class="muted">Brez email naslova</span>'}</td>
                <td>${swimmer.phone || '<span class="muted">Brez telefona</span>'}</td>
                <td class="terms-cell">${swimmer.is_deleted ? '<span class="muted">Izbrisan</span>' : (termsChips || '<span class="muted">Brez terminov</span>')}</td>
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
                    <th>Telefon</th>
                    <th>Termini</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        // Sortiraj trenerje po priimku (in nato po imenu, če so priimki enaki)
        const sortedTrainers = [...trainers].filter(trainer => !trainer.is_deleted).sort((a, b) => {
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
                
                // Ustvari termine kot "chips" z možnostjo brisanja
                const termsChips = trainer.terms ? trainer.terms.map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    if (term) {
                        return `
                            <span class="chip" data-term-id="${termId}" data-trainer-id="${trainer.id}">
                                ${DAY_SHORT_NAME[term.day]} ${formatTimeWithoutSeconds(term.start_time)}-${formatTimeWithoutSeconds(term.end_time)}
                                <button class="remove-term-btn" onclick="removeTermFromTrainer('${trainer.id}', '${termId}')" title="Odstrani termin">✖</button>
                            </span>
                        `;
                    }
                    return `<span class="chip" data-term-id="${termId}">${termId}</span>`;
                }).join(' ') : '';

                row.innerHTML = `
                    <td>${trainer.first_name}</td>
                    <td>${trainer.last_name}</td>
                    <td>${trainer.email || ''}</td>
                    <td>${trainer.phone || '<span class="muted">Brez telefona</span>'}</td>
                    <td class="terms-cell">${termsChips || '<span class="muted">Brez terminov</span>'}</td>
                    <td>
                        <button class="btn warn" onclick="deleteTrainer('${trainer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši trenerja
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
            const { data, error } = await supabase
                .from('trainers')
                .insert([{
                    first_name: first,
                    last_name: last,
                    email: email,
                    phone: phone || null
                }])
                .select();

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
    elAssignTermBtn.addEventListener('click', async () => {
        const swimmerId = elSwimmerSelect.value;
        const termId = elTermSelect.value;
        
        if (!swimmerId || !termId) {
            alert('Prosim izberite plavalca in termin');
            return;
        }

        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (swimmer) {
            if (!swimmer.terms.includes(termId)) {
                try {
                    const { error } = await supabase
                        .from('swimmers')
                        .update({ terms: [...swimmer.terms, termId] })
                        .eq('id', swimmerId);

                    if (error) {
                        console.error('Napaka pri dodeljevanju termina:', error);
                        alert('Napaka pri dodeljevanju termina. Preverite konzolo.');
                        return;
                    }

                    // Posodobi lokalno stanje
                    swimmer.terms.push(termId);
                    updateSwimmersList();
                    elSwimmerInfo.textContent = `Termin dodeljen plavalcu ${swimmer.first_name} ${swimmer.last_name}`;
                    
                    setTimeout(() => {
                        elSwimmerInfo.textContent = '';
                    }, 3000);
                } catch (error) {
                    console.error('Napaka pri dodeljevanju termina:', error);
                    alert('Napaka pri dodeljevanju termina.');
                }
            } else {
                elSwimmerInfo.textContent = 'Plavalec že ima ta termin';
                setTimeout(() => {
                    elSwimmerInfo.textContent = '';
                }, 3000);
            }
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

                // Posodobi lokalno stanje
                swimmer.terms = updatedTerms;
                updateSwimmersList();
                alert('Termin uspešno odstranjen iz plavalca.');
            } catch (error) {
                console.error('Napaka pri odstranjevanju termina:', error);
                alert('Napaka pri odstranjevanju termina.');
            }
        }
    };

    // ===== Dodeljevanje terminov trenerjem =====
    elAssignTrainerTermBtn.addEventListener('click', async () => {
        const trainerId = elTrainerSelect.value;
        const termId = elTrainerTermSelect.value;
        
        if (!trainerId || !termId) {
            alert('Prosim izberite trenerja in termin');
            return;
        }

        const trainer = trainers.find(t => t.id === trainerId);
        if (trainer) {
            if (!trainer.terms) trainer.terms = [];
            if (!trainer.terms.includes(termId)) {
                try {
                    // Dodaj v tabelo trainer_terms
                    const { error } = await supabase
                        .from('trainer_terms')
                        .insert([{
                            trainer_id: trainerId,
                            term_id: termId
                        }]);

                    if (error) {
                        console.error('Napaka pri dodeljevanju termina trenerju:', error);
                        alert('Napaka pri dodeljevanju termina trenerju. Preverite konzolo.');
                        return;
                    }

                    // Posodobi lokalno stanje
                    trainer.terms.push(termId);
                    updateTrainersList();
                    updateTrainerSelects(); // Osveži dropdown z nedodeljenimi termini
                    elTrainerInfo.textContent = `Termin dodeljen trenerju ${trainer.first_name} ${trainer.last_name}`;
                    
                    setTimeout(() => {
                        elTrainerInfo.textContent = '';
                    }, 3000);
                } catch (error) {
                    console.error('Napaka pri dodeljevanju termina trenerju:', error);
                    alert('Napaka pri dodeljevanju termina trenerju.');
                }
            } else {
                elTrainerInfo.textContent = 'Trener že ima ta termin';
                setTimeout(() => {
                    elTrainerInfo.textContent = '';
                }, 3000);
            }
        }
    });

    // Gumb za dodajanje termina iz sekcije Upravljanje terminov (odstranjen - forma je sedaj pod upravljanjem terminov)

    // ===== Upravljanje terminov =====
    window.editTerm = async function(termId) {
        const term = TERMS.find(t => t.id === termId);
        if (term) {
            // Popolni modal za urejanje
            elEditTermDateFrom.value = term.date_from;
            elEditTermDateTo.value = term.date_to;
            
            // Pretvori čas v format brez sekund (HH:MM) za time input
            const formatTimeForInput = (timeStr) => {
                if (!timeStr) return '';
                // Če čas že vsebuje sekunde, jih odstrani
                if (timeStr.includes(':') && timeStr.split(':').length === 3) {
                    const parts = timeStr.split(':');
                    return `${parts[0]}:${parts[1]}`;
                }
                return timeStr;
            };
            
            elEditTermStart.value = formatTimeForInput(term.start_time);
            elEditTermEnd.value = formatTimeForInput(term.end_time);
            
            // Shrani ID termina za kasnejšo uporabo
            elEditTermModal.setAttribute('data-term-id', termId);
            
            // Prikaži modal
            elEditTermModal.style.display = 'block';
        }
    };

    window.deleteTerm = async function(termId) {
        const term = TERMS.find(t => t.id === termId);
        if (term) {
            try {
                // Izbriši termin iz Supabase
                const { error } = await supabase
                    .from('terms')
                    .delete()
                    .eq('id', termId);

                if (error) {
                    console.error('Napaka pri brisanju termina:', error);
                    alert('Napaka pri brisanju termina. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                TERMS = TERMS.filter(t => t.id !== termId);
                updateTermList();
                alert('Termin uspešno izbrisan.');
            } catch (error) {
                console.error('Napaka pri brisanju termina:', error);
                alert('Napaka pri brisanju termina.');
            }
        }
    };

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

        // Prikaži samo aktivne termine
        const activeTerms = getActiveTerms();
        const expiredCount = TERMS.length - activeTerms.length;
        
        if (activeTerms.length === 0) {
            elTermList.innerHTML = '<p class="muted">Ni aktivnih terminov</p>';
            return;
        }
        
        // Dodaj informacijo o skritih terminih
        if (expiredCount > 0) {
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'background: #fef3c7; border: 1px solid #fcd34d; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;';
            infoDiv.innerHTML = `<strong>ℹ️ Informacija:</strong> Skritih je ${expiredCount} poteklih terminov. Prikazani so samo aktivni termini.`;
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
                            ${s.first_name} ${s.last_name}
                            <button class="remove-term-btn" onclick="removeTermFromSwimmer('${s.id}', '${term.id}')" title="Odstrani iz termina">✖</button>
                        </span>
                    `).join(' ');
                } else {
                    swimmersList = '<span class="muted">Brez dodeljenih plavalcev</span>';
                }
                
                // Format čas brez sekund
                termCard.innerHTML = `
                    <div class="term-header">
                        <span class="term-time">${formatTimeWithoutSeconds(term.start_time)} - ${formatTimeWithoutSeconds(term.end_time)}</span>
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
                        <strong>Dodeljeni plavalci:</strong>
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

        const termId = `${DAY_SHORT_NAME[day].toLowerCase().replace('.', '')}-${start}-${end}`;
        
        try {
            const { data, error } = await supabase
                .from('terms')
                .insert([{
                    id: termId,
                    day: day,
                    start_time: start,
                    end_time: end,
                    date_from: dateFrom,
                    date_to: dateTo
                }])
                .select();

            if (error) {
                console.error('Napaka pri dodajanju termina:', error);
                alert('Napaka pri dodajanju termina. Preverite konzolo.');
                return;
            }

            // Dodaj v lokalno stanje
            if (data && data.length > 0) {
                TERMS.push(data[0]);
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
        } catch (error) {
            console.error('Napaka pri dodajanju termina:', error);
            alert('Napaka pri dodajanju termina.');
        }
    });

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
        if (term) {
            try {
                // Generiraj nov ID, če se je spremenil dan ali ura
                const day = term.day; // Dan ostane enak
                const newId = `${DAY_SHORT_NAME[day].toLowerCase().replace('.', '')}-${startTime}-${endTime}`;
                const idChanged = newId !== termId;
                
                // Posodobi podatke v bazi
                const updateData = { 
                    date_from: dateFrom, 
                    date_to: dateTo,
                    start_time: startTime,
                    end_time: endTime
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
                        date_to: dateTo 
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
                    TERMS.push(newTerm);
                    
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
    window.editSwimmer = function(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            alert('Plavalec ne obstaja.');
            return;
        }

        // Polni polja v modalu s trenutnimi podatki
        elEditSwimmerFirst.value = swimmer.first_name || '';
        elEditSwimmerLast.value = swimmer.last_name || '';
        elEditSwimmerEmail.value = swimmer.email || '';
        elEditSwimmerPhone.value = swimmer.phone || '';
        elEditSwimmerAddress.value = swimmer.address || '';
        elEditSwimmerPostalCode.value = swimmer.postal_code || '';
        elEditSwimmerInfo.textContent = '';
        
        // Prikaži modal
        elEditSwimmerModal.style.display = 'flex';
        
        // Shrani ID plavalca za shranjevanje
        elEditSwimmerModal.setAttribute('data-swimmer-id', swimmerId);
    };

    elSaveEditSwimmerBtn.addEventListener('click', async () => {
        const swimmerId = elEditSwimmerModal.getAttribute('data-swimmer-id');
        if (!swimmerId) {
            alert('Napaka: ID plavalca ni najden.');
            return;
        }

        // Preberi vrednosti iz polj
        const first = elEditSwimmerFirst.value.trim();
        const last = elEditSwimmerLast.value.trim();
        const email = elEditSwimmerEmail.value.trim() || null;
        const phone = elEditSwimmerPhone.value.trim() || null;
        const address = elEditSwimmerAddress.value.trim() || null;
        const postalCode = elEditSwimmerPostalCode.value.trim() || null;

        // Validacija
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

        try {
            // Posodobi v bazi
            const updateData = {
                first_name: first,
                last_name: last,
                email: email,
                phone: phone,
                address: address,
                postal_code: postalCode
            };

            const { error } = await supabase
                .from('swimmers')
                .update(updateData)
                .eq('id', swimmerId);

            if (error) {
                console.error('Napaka pri shranjevanju plavalca:', error);
                elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + error.message;
                elEditSwimmerInfo.style.color = '#dc3545';
                return;
            }

            // Posodobi lokalno stanje
            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer) {
                swimmer.first_name = first;
                swimmer.last_name = last;
                swimmer.email = email;
                swimmer.phone = phone;
                swimmer.address = address;
                swimmer.postal_code = postalCode;
            }

            // Osveži seznam
            updateSwimmersList();

            // Zapri modal
            elEditSwimmerModal.style.display = 'none';
            elEditSwimmerInfo.textContent = '';

        } catch (error) {
            console.error('Napaka pri shranjevanju plavalca:', error);
            elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + error.message;
            elEditSwimmerInfo.style.color = '#dc3545';
        }
    });

    elCloseEditSwimmerModalBtn.addEventListener('click', () => {
        elEditSwimmerModal.style.display = 'none';
        elEditSwimmerInfo.textContent = '';
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
                                localSwimmer.terms = updateData.terms;
                                localSwimmer.email = updateData.email;
                                localSwimmer.phone = updateData.phone;
                                localSwimmer.address = updateData.address;
                                localSwimmer.postal_code = updateData.postal_code;
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
                                            if (currentSection === 'finance') {
                                                calculateFinanceData();
                                            }
                                            alert(`Uvoženih ${data.success} vadnin za prihodnje mesece (${data.errors} napak)`);
                                            return;
                                        }
                                    } else {
                                        // Vse vadnine so bile uspešno vstavljene
                                        if (currentSection === 'finance') {
                                            calculateFinanceData();
                                        }
                                        alert(`Uvoženih ${data.success} vadnin za prihodnje mesece`);
                                        return;
                                    }
                                } else {
                                    // Data je vrnil podatke, vendar brez success/errors - morda je uspešno
                                    if (data && Array.isArray(data) && data.length > 0) {
                                        console.log(`✅ Raw SQL: Vstavljenih ${data.length} vadnin`);
                                        if (currentSection === 'finance') {
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
                        
                        // Osveži finance sekcijo, če je prikazana
                        if (currentSection === 'finance') {
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
                        const feeData = swimmerFees[swimmer.id] || { fee: 80, discount: 0 };
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
        logoutBtn.addEventListener('click', () => {
            if (confirm('Ali se res želite odjaviti?')) {
                authManager.logoutAdmin();
                window.location.href = 'admin-login.html';
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
        elTrainerRatesMonthYearInput.addEventListener('change', async (e) => {
            const [year, month] = e.target.value.split('-');
            currentTrainerRatesMonth = parseInt(month, 10);
            currentTrainerRatesYear = parseInt(year, 10);
            updateTrainerRatesMonthDisplay();
            await renderTrainerRatesSettings();
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
                currentFinanceMonth = month;
                currentFinanceYear = year;
                updateFinanceMonthDisplay();
                calculateFinanceData();
            });
        });
    } else {
        console.error('❌ monthYearContainer ni najden');
    }
    if (elMonthYearInput) {
        elMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentFinanceYear = parseInt(year);
            currentFinanceMonth = parseInt(month);
            updateFinanceMonthDisplay();
            calculateFinanceData();
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
                currentSwimmerFeesMonth = month;
                currentSwimmerFeesYear = year;
                updateSwimmerFeesMonthDisplay();
                refreshSwimmerFees();
            });
        });
    }
    if (elSwimmerFeesMonthYearInput) {
        elSwimmerFeesMonthYearInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            currentSwimmerFeesYear = parseInt(year);
            currentSwimmerFeesMonth = parseInt(month);
            updateSwimmerFeesMonthDisplay();
            refreshSwimmerFees();
        });
    }
    
    // Event listener za izvoz vadnin
    const elExportFeesBtn = document.getElementById('exportFeesBtn');
    if (elExportFeesBtn) {
        elExportFeesBtn.addEventListener('click', () => {
            window.exportSwimmerFees();
        });
    }



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
    if (elSwimmerSelect) {
        elSwimmerSelect.addEventListener('change', () => {
            const selectedSwimmerId = elSwimmerSelect.value;
            updateTermSelectForSwimmer(selectedSwimmerId);
        });
    }

    // ===== Event listener za izbiro trenerja pri dodeljevanju terminov =====
    if (elTrainerSelect) {
        elTrainerSelect.addEventListener('change', () => {
            const selectedTrainerId = elTrainerSelect.value;
            updateTermSelectForTrainer(selectedTrainerId);
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
        
        // Pridobi samo aktivne termine (ne potekle)
        const activeTerms = getActiveTerms();
        const activeTermIds = new Set(activeTerms.map(t => t.id));
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
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
                                absent: 0
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
                                                    absent: 0
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
                                                absent: 0
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
                                                absent: 0
                                            };
                                        }
                                        
                                        trainerStats[key].total++;
                                        
                                        const trainerAtt = trainerAttendance[date][termId][trainerId];
                                        if (trainerAtt) {
                                            if (trainerAtt.present === true) {
                                                trainerStats[key].present++;
                                            } else if (trainerAtt.present === false) {
                                                trainerStats[key].absent++;
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
        
        // Prikaži rezultate (samo aktivni trenerji)
        sortedTrainerStats.forEach(stat => {
            summary += `
                <tr>
                    <td>${stat.trainer.first_name} ${stat.trainer.last_name}</td>
                    <td>${stat.total}</td>
                    <td class="ok">${stat.present}</td>
                    <td class="warn">${stat.absent}</td>
                </tr>
            `;
        });
        
        summary += '</tbody></table>';
        
        // Preveri, ali so vsi trenerji deaktivirani
        if (sortedTrainerStats.length === 0) {
            summary = '<p class="muted">Ni podatkov o prisotnosti trenerjev za izbrani mesec</p>';
        }
        
        elTrainerSummaryBox.innerHTML = summary;
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
        
        // Pridobi samo aktivne termine (ne potekle)
        const activeTerms = getActiveTerms();
        const activeTermIds = new Set(activeTerms.map(t => t.id));
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
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
            const trainerHourlyRate = trainerRates[stat.trainer.id] || 25; // Default 25€/uro
            stat.cost = stat.totalHours * trainerHourlyRate;
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
            const trainerHourlyRate = trainerRates[stat.trainer.id] || 25;
            summary += `
                <tr>
                    <td>${stat.trainer.first_name} ${stat.trainer.last_name}</td>
                    <td class="trainer-hours-hours">${stat.sessions}</td>
                    <td class="trainer-hours-hours"><span class="trainer-hours-clickable" data-trainer-id="${stat.trainer.id}" style="cursor: pointer; text-decoration: underline; color: #007bff;" title="Klikni za prikaz detajlov">${stat.totalHours.toFixed(2)}h</span></td>
                    <td>${trainerHourlyRate.toFixed(2)}€/h</td>
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
        
        // Iteriraj po vseh dnevih v mesecu
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
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

        // Inicializacija podatkov za aktivne plavalce z dodeljenimi termini
        // PLUS plavalci z prisotnostjo, tudi če niso več dodeljeni terminu
        swimmers.forEach(s => {
            // Izključi izbrisane plavalce (is_deleted)
            if (s.is_deleted) return;
            
            // Dodaj plavalca v rezultate, če ima dodeljene termine
            if (s.terms && s.terms.length > 0) {
            res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
            }
        });

        // Zanka za izračun prisotnosti (att)
        const allAttendance = Object.entries(attendance);
        for (const [date, termData] of allAttendance) {
            const d = new Date(date);
            d.setHours(0,0,0,0);
            if (d >= monthStart && d <= monthEnd) {
                for (const termId in termData) {
                    for (const swimmerId in termData[termId]) {
                        // Preverimo, ali je prisotnost vnesena (status === true)
                        if (termData[termId][swimmerId] === true) {
                            const swimmer = swimmers.find(s => s.id === swimmerId);
                            // DODANO: Vključi plavalce z prisotnostjo, tudi če niso več dodeljeni terminu
                            // Izključi le izbrisane plavalce
                            if (swimmer && !swimmer.is_deleted) {
                                // Če plavalec še ni v rezultatih (nima več dodeljenih terminov), ga dodaj
                                if (!res[swimmerId]) {
                                    res[swimmerId] = { first: swimmer.first_name, last: swimmer.last_name, att: 0, pos: 0 };
                                }
                            res[swimmerId].att += 1;
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
                const termIsActive = getTermStatus(currentDate, term.id).status === "active";
                
                if (termIsActive) {
                    swimmers.forEach(s => {
                        // Izključi izbrisane plavalce
                        if (s.is_deleted) return;
                            
                        // Preveri, ali plavalec ima ta termin dodeljen in ali je v rezultatih
                        if (res[s.id] && s.terms && s.terms.includes(term.id)) {
                                    res[s.id].pos += 1;
                                }
                        
                        // DODANO: Preveri tudi, ali je plavalec v rezultatih (z prisotnostjo) in ali ima prisotnost za ta termin
                        // Če plavalec nima več dodeljenega termina, vendar ima prisotnost, dodaj možni obisk
                        if (res[s.id] && (!s.terms || !s.terms.includes(term.id))) {
                            const termAtt = attendance[ymd]?.[term.id] || {};
                            // Če plavalec ima prisotnost za ta termin, dodaj možni obisk
                            if (termAtt[s.id] !== undefined) {
                                res[s.id].pos += 1;
                            }
                        }
                    });
                }
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return res;
    }





    // Funkcija za prikaz povzetka udeležbe plavalcev
    function renderSwimmerSummary(summaryData) {
        let html = `<table><thead><tr><th>Plavalec</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
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
            .map(([swimmerId, r]) => r)
            .sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
        if(rows.length===0) html += `<tr><td colspan="4" class="muted">Ni plavalcev.</td></tr>`;
        rows.forEach(r=>{
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            html += `<tr><td>${r.first} ${r.last}</td><td>${r.att}</td><td>${r.pos}</td><td>${pct}</td></tr>`;
        });
        html += `</tbody></table>`;
        elSwimmerSummaryBox.innerHTML = html;
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
        
        let html = `<table><thead><tr><th>Plavalec</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
        
        const rows = Object.entries(summaryData)
            .filter(([swimmerId, r]) => {
                const swimmer = swimmers.find(s => s.id === swimmerId);
                if (swimmer && swimmer.is_deleted) return false;
                return r.pos > 0 || r.att > 0;
            })
            .map(([swimmerId, r]) => r)
            .sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
            
        if (rows.length === 0) {
            html += `<tr><td colspan="4" class="muted">Ni OLY plavalcev za ta mesec.</td></tr>`;
        }
        
        rows.forEach(r => {
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            html += `<tr><td>${r.first} ${r.last}</td><td>${r.att}</td><td>${r.pos}</td><td>${pct}</td></tr>`;
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
            const activeSwimmers = swimmers.filter(s => !s.is_deleted);
// console.log('🔍 calculateFinanceData - activeSwimmers:', activeSwimmers.length);

            
            // Pridobi pristojbine plavalcev iz baze
            const swimmerFees = await getSwimmerFeesFromDB(month, year);
// console.log('🔍 calculateFinanceData - swimmerFees:', swimmerFees.length);
// console.log('🔍 calculateFinanceData - swimmerFees za mesec:', month, 'leto:', year);

            
            let totalRevenue = 0;
// console.log('🔍 calculateFinanceData - začenjam izračun prihodkov...');
            
            // Preštej OLY plavalce in dodaj njihove prispevke
            let olyContributions = 0;
            activeSwimmers.forEach(swimmer => {
                const feeData = swimmerFees[swimmer.id] || { fee: 80, discount: 0, is_oly: false };
                
                // Če je OLY plavalec, dodaj 40€ prispevek
                if (feeData.is_oly) {
                    olyContributions += 40;
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

            // Iteriraj po vseh dnevih v mesecu
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                const isoDate = iso(d);
                
                TERMS.forEach(term => {
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
            
            // Izračunaj stroške trenerjev - na podlagi ur
            for (const trainerCost of Object.values(trainerCosts)) {
                const trainerHourlyRate = trainerRates[trainerCost.trainer.id] || 25; // Default 25€/uro
                trainerCost.cost = trainerCost.totalHours * trainerHourlyRate;
            }
            
            const totalTrainerCost = Object.values(trainerCosts).reduce((sum, tc) => sum + tc.cost, 0);

            
            // Izračunaj stroške prog po terminih - za vsak izveden termin v mesecu
            let totalFacilityCost = 0;
            
            // Pridobi stroške prog iz baze
            const termCosts = await getTermCostsFromDB();

            
            // Filtriraj samo aktivne termine (ki še niso potekli)
            const activeTerms = TERMS.filter(term => {
                const termEndDate = new Date(term.date_to);
                const today = new Date();
                const isActive = termEndDate >= today;

                return isActive;
            });
            

            
            // Prikaži seznam neaktivnih terminov za debug
            const inactiveTerms = TERMS.filter(term => {
                const termEndDate = new Date(term.date_to);
                const today = new Date();
                return termEndDate < today;
            });

            
            for (const term of activeTerms) {
                const termHourlyCost = termCosts[term.id] || 50; // Default 50€/uro

                if (termHourlyCost > 0) {
                    // Preveri, ali je termin aktiven v izbranem mesecu
                    const termStartDate = new Date(term.date_from);
                    const termEndDate = new Date(term.date_to);
                    
                    if (startDate <= termEndDate && endDate >= termStartDate) {
                        // Izračunaj trajanje termina v urah
                        const startTime = new Date(`2000-01-01T${term.start_time}`);
                        const endTime = new Date(`2000-01-01T${term.end_time}`);
                        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                        
                        // Preštej vse dni v mesecu, ko se termin izvaja
                        let termExecutionsInMonth = 0;
                        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                            const isoDate = iso(d);
                            
                            // Preveri, ali je termin na ta dan in ali je aktiven
                            if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                                // Preveri, ali je termin deaktiviran za ta dan
                                const termStatus = getTermStatus(d, term.id);
                                if (termStatus.status !== "inactive") {
                                    // Termin je aktiven na ta dan
                                    termExecutionsInMonth += 1;
                                }
                            }
                        }
                        
                        // Strošek prog = število izvedenih terminov × trajanje v urah × urni strošek
                        const termMonthlyCost = termExecutionsInMonth * durationHours * termHourlyCost;
                        totalFacilityCost += termMonthlyCost;
                    }
                }
            }
            

            
            // Naloži ročno vnesene vrednosti za summary (če obstajajo) - najprej iz baze
            const summaryDbManualCosts = await getManualCostsFromDB(currentFinanceMonth, currentFinanceYear);
            const summaryManualCostsKey = `manualCosts_${currentFinanceYear}_${currentFinanceMonth}`;
            const summaryLocalStorageCosts = JSON.parse(localStorage.getItem(summaryManualCostsKey) || '{}');
            const summaryMembershipFee = (summaryDbManualCosts?.membershipFee !== undefined ? summaryDbManualCosts.membershipFee : summaryLocalStorageCosts.membershipFee) || 0;
            
            // Skupni stroški
            const totalCosts = totalTrainerCost + managementCostPerMonth + totalFacilityCost;
            
            // Prihodki vključujejo članarino
            const totalRevenueWithMembership = totalRevenue + summaryMembershipFee;
            
            // Dobiček/izguba
            const profit = totalRevenueWithMembership - totalCosts;
            

            
    
            
            // Prikaži povzetek
            let summary = `
                <div class="finance-summary">
                    <div class="finance-card revenue">
                        <h4>Prihodki</h4>
                        <div class="amount">${totalRevenueWithMembership.toFixed(2)} €</div>
                        <div class="details">${activeSwimmers.length} plavalcev (individualne pristojbine${olyContributions > 0 ? ` + ${olyContributions}€ OLY prispevkov` : ''}${summaryMembershipFee > 0 ? ` + ${summaryMembershipFee.toFixed(2)}€ članarina` : ''})</div>
                    </div>
                    <div class="finance-card costs">
                        <h4>Stroški</h4>
                        <div class="amount">${totalCosts.toFixed(2)} €</div>
                        <div class="details">
                            Trenerji: ${totalTrainerCost.toFixed(2)} €<br>
                            Vodenje: ${managementCostPerMonth.toFixed(2)} €<br>
                            Objekti: ${totalFacilityCost.toFixed(2)} €
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
            
            // Članarina - vedno ročno vnesena (privzeto 0) - je prihodek
            const membershipFee = savedManualCosts.membershipFee !== undefined ? savedManualCosts.membershipFee : 0;
            
            // Ponovno izračunaj skupne vrednosti z ročno vnesenimi vrednostmi
            const manualTotalRevenue = monthlyFee + olyContributions + membershipFee;
            const manualTotalCosts = trainerCost + managementCost + facilityCost;
            const manualProfit = manualTotalRevenue - manualTotalCosts;
            
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
                            <td>${activeSwimmers.length - Math.round(olyContributions / 40)} aktivnih plavalcev (individualne pristojbine)</td>
                        </tr>
                        <tr>
                            <td>Članarina</td>
                            <td>
                                <input type="number" 
                                       id="manual-membership-fee" 
                                       value="${membershipFee.toFixed(2)}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 120px; text-align: right;"
                                       onchange="saveManualCost('membershipFee', this.value, ${currentFinanceMonth}, ${currentFinanceYear})">
                                <span> €</span>
                            </td>
                            <td>Ročno vnesena članarina</td>
                        </tr>
                        ${olyContributions > 0 ? `
                        <tr>
                            <td>OLY prispevki</td>
                            <td>${olyContributions.toFixed(2)} €</td>
                            <td>${Math.round(olyContributions / 40)} OLY plavalcev (40€ na plavalca)</td>
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
                            <td>${totalTrainerHours.toFixed(2)}h opravljenih ur (individualne postavke na uro)</td>
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
    
    // Funkcija za shranjevanje nastavitev cen
    function saveCostSettings() {
        const managementCostPerMonth = parseFloat(elManagementCostPerMonth.value);
        
        // Shrani v localStorage
        localStorage.setItem('managementCostPerMonth', managementCostPerMonth);
        
        alert('Nastavitve cen so bile shranjene!');
    }
    
    // Funkcija za nalaganje nastavitev cen
    function loadCostSettings() {
        const managementCostPerMonth = localStorage.getItem('managementCostPerMonth') || 500;
        
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
    
    // Funkcija za osvežitev prikaza pristojbin plavalcev
    async function refreshSwimmerFees() {
        const month = currentSwimmerFeesMonth;
        const year = currentSwimmerFeesYear;
// console.log('🔍 refreshSwimmerFees - mesec:', month, 'leto:', year);
        
        if (month === undefined || year === undefined) {
            elSwimmerFeesBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }
        
        const swimmerFees = await getSwimmerFees(month, year);
        const activeSwimmers = swimmers.filter(s => !s.is_deleted);
        
        let html = `
            <div class="swimmer-fees-table">
                <table>
                    <thead>
                        <tr>
                            <th>Plavalec</th>
                            <th>Dodeljeni termini</th>
                            <th>Mesečna pristojbina (€)</th>
                            <th>Dodatni popust za ${new Date(year, month - 1, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })} (€)</th>
                            <th>OLY</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Sortiraj plavalce po abecedi po priimku, nato po imenu
        const sortedActiveSwimmers = activeSwimmers.sort((a, b) => {
            const aName = `${a.last_name} ${a.first_name}`;
            const bName = `${b.last_name} ${b.first_name}`;
            return aName.localeCompare(bName, 'sl');
        });
        
        // Preštej trenutno število OLY plavalcev za ta mesec
        let olyCount = 0;
        sortedActiveSwimmers.forEach(swimmer => {
            const feeData = swimmerFees[swimmer.id];
            if (feeData && feeData.is_oly) {
                olyCount++;
            }
        });
        
        sortedActiveSwimmers.forEach(swimmer => {
            // Poišči dodeljene termine iz swimmer_terms
            const assignedTerms = [];
            if (swimmer.terms && Array.isArray(swimmer.terms)) {
                swimmer.terms.forEach(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    if (term) {
                        assignedTerms.push(term.label);
                    }
                });
            }
            
            const numberOfTerms = assignedTerms.length;
            
            // Določi default vadnino glede na število terminov
            // Če vadnina že obstaja, jo pustimo pri miru
            let defaultFee;
            if (numberOfTerms === 0) {
                defaultFee = 0; // Brez terminov = 0€
            } else if (numberOfTerms === 1) {
                defaultFee = 55; // 1 termin = 55€
            } else if (numberOfTerms === 2) {
                defaultFee = 75; // 2 termina = 75€
            } else {
                defaultFee = 90; // 3+ termini = 90€
            }
            
            // Če vadnina že obstaja v bazi, uporabi to vrednost, sicer uporabi default
            const feeData = swimmerFees[swimmer.id];
            let currentFee;
            let discount = 0;
            let isOly = false;
            
            if (feeData && feeData.fee !== undefined) {
                // Vadnina že obstaja - pusti pri miru
                currentFee = feeData.fee;
                discount = feeData.discount || 0;
                isOly = feeData.is_oly || false;
            } else {
                // Vadnina še ne obstaja - uporabi default
                currentFee = defaultFee;
                discount = 0;
                isOly = false;
            }
            
            // Če je OLY obkljukljeno, nastavi znesek vadnine na 0
            if (isOly) {
                currentFee = 0;
            }
            
            // Formatiraj termine - odstrani vejico na začetku, če obstaja
            let termsDisplay = '';
            if (assignedTerms.length > 0) {
                // Filtrirati prazne stringe in odstraniti vejice na začetku
                const cleanTerms = assignedTerms
                    .filter(t => t && t.trim() !== '')
                    .map(t => t.trim().replace(/^,\s*/, '')) // Odstrani vejico na začetku
                    .filter(t => t !== '');
                termsDisplay = cleanTerms.length > 0 ? cleanTerms.join(', ') : 'Brez terminov';
            } else {
                termsDisplay = 'Brez terminov';
            }
            
            // Preveri, ali je checkbox OLY omogočen (maksimalno 15, ali če je že obkljukljen)
            const canCheckOly = olyCount < 15 || isOly;
            
            // Debug: izpis za prvega plavalca
            if (swimmer.id === activeSwimmers[0]?.id) {
                console.log('🔍 Debug OLY:', {
                    swimmer: `${swimmer.first_name} ${swimmer.last_name}`,
                    feeData: swimmerFees[swimmer.id],
                    isOly: isOly,
                    olyCount: olyCount,
                    canCheckOly: canCheckOly
                });
            }
            
            html += `
                <tr>
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td>${termsDisplay}</td>
                    <td>
                        <input type="number" id="fee-${swimmer.id}" value="${currentFee}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})" ${isOly ? 'disabled' : ''}>
                    </td>
                    <td>
                        <input type="number" id="discount-${swimmer.id}" value="${discount}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})" ${isOly ? 'disabled' : ''}>
                    </td>
                    <td style="text-align: center;">
                        <input type="checkbox" id="oly-${swimmer.id}" ${isOly ? 'checked' : ''} ${canCheckOly ? '' : 'disabled'} onchange="updateSwimmerOly('${swimmer.id}', this.checked, ${month}, ${year})" style="cursor: pointer; width: 20px; height: 20px;">
                        ${!canCheckOly && !isOly ? '<span style="font-size: 10px; color: #999; display: block;">Max 15</span>' : ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 6px;">
                <strong>OLY opcija:</strong> Maksimalno 15 plavalcev lahko ima obkljukljeno OLY opcijo. 
                Plavalci z OLY imajo znesek vadnine 0€, vendar mesečno prispevajo 40€. 
                Trenutno: <strong>${olyCount}/15</strong> OLY plavalcev.
            </div>
        `;
        
        elSwimmerFeesBox.innerHTML = html;
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
            const activeSwimmers = swimmers.filter(s => !s.is_deleted);
            
            // Ustvari CSV vsebino samo z imenom, priimkom in zneskom vadnine
            let csv = 'first_name,last_name,monthly_fee\n';
            
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
                
                csv += `${formatCSVField(swimmer.first_name)},${formatCSVField(swimmer.last_name)},${fee.toFixed(2)}\n`;
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
            alert(`Izvoženih ${sortedActiveSwimmers.length} vadnin za ${monthName}`);
            
        } catch (error) {
            console.error('❌ Napaka pri izvozu vadnin:', error);
            alert('Napaka pri izvozu vadnin: ' + error.message);
        }
    };
    
    // Funkcija za posodobitev pristojbine plavalca
    async function updateSwimmerFee(swimmerId, fee, month, year) {
        const success = await updateSwimmerFeeInDB(swimmerId, fee, month, year);
        
        if (success) {
            if (currentSection === 'finance') {
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
            if (currentSection === 'finance') {
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
                return;
            }
            
            // Osveži prikaz
            if (currentSection === 'finance') {
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
        
        let html = '<div class="term-costs-grid">';
        
        // Prikaži vse termine, sortirane po dnevu in času
        // Ne filtriramo po datumu, ker lahko želimo nastaviti stroške tudi za pretekle termine
        const sortedTerms = [...TERMS].sort((a, b) => {
            if (a.day !== b.day) {
                return a.day - b.day;
            }
            return a.start_time.localeCompare(b.start_time);
        });
        
// console.log(`Term costs settings: showing ${sortedTerms.length} terms out of ${TERMS.length} total terms`);
        
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
        
        let html = '<div class="trainer-rates-list" style="display: flex; flex-direction: column; gap: 12px;">';
        
        for (const trainer of sortedTrainers) {
            const rate = trainerRates[trainer.id] || 25; // Default to 25€/termin
            
            // Preštej število terminov, ki jih ima trener na teden
            const trainerTerms = trainer.terms || [];
            const termCount = trainerTerms.length;
            
            html += `
                <div class="trainer-rate-row" style="display: flex; align-items: center; gap: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                    <div style="flex: 1; min-width: 200px;">
                        <label for="trainer-rate-${trainer.id}" style="font-weight: 500; display: block; margin-bottom: 4px;">
                            ${trainer.first_name} ${trainer.last_name}
                        </label>
                        <span style="font-size: 12px; color: #6c757d;">
                            ${termCount} termin${termCount === 1 ? '' : termCount === 2 ? 'a' : 'ov'} na teden
                        </span>
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
        
        // Filtriraj samo aktivne termine za shranjevanje
        const activeTermsForSaving = TERMS.filter(term => {
            const termEndDate = new Date(term.date_to);
            const today = new Date();
            return termEndDate >= today;
        });
        
// console.log(`Saving term costs: processing ${activeTermsForSaving.length} active terms out of ${TERMS.length} total terms`);
        
        for (const term of activeTermsForSaving) {
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

    // Posodobljena funkcija za osvežitev pristojbin plavalcev
    async function refreshSwimmerFees() {
        if (!elSwimmerFeesBox) return;
        
        const month = currentSwimmerFeesMonth;
        const year = currentSwimmerFeesYear;
        
        if (!month || !year) {
            elSwimmerFeesBox.innerHTML = '<p class="muted">Izberite mesec in leto za upravljanje pristojbin...</p>';
            return;
        }
        
        const swimmerFees = await getSwimmerFeesFromDB(month, year);
        
        // Preštej trenutno število OLY plavalcev za ta mesec
        const activeSwimmers = swimmers.filter(s => !s.is_deleted);
        let olyCount = 0;
        activeSwimmers.forEach(swimmer => {
            const feeData = swimmerFees[swimmer.id];
            if (feeData && feeData.is_oly) {
                olyCount++;
            }
        });
        
        let html = `
            <table class="swimmer-fees-table">
                <thead>
                    <tr>
                        <th>Plavalec</th>
                        <th>Termini</th>
                        <th>Mesečna vadnina (€)</th>
                        <th>Popust (€)</th>
                        <th>Končna vadnina (€)</th>
                        <th>OLY</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Sortiraj plavalce po abecedi po priimku, nato po imenu
        const sortedSwimmers = swimmers
            .filter(swimmer => !swimmer.is_deleted)
            .sort((a, b) => {
                const aName = `${a.last_name} ${a.first_name}`;
                const bName = `${b.last_name} ${b.first_name}`;
                return aName.localeCompare(bName, 'sl');
            });
        
        // Preveri, ali je iskan mesec v preteklosti
        const requestedDate = new Date(year, month - 1, 1);
        const currentDate = new Date();
        currentDate.setDate(1);
        currentDate.setHours(0, 0, 0, 0);
        const isPastMonth = requestedDate < currentDate;
        
        for (const swimmer of sortedSwimmers) {
            
            const feeData = swimmerFees[swimmer.id];
            
            // Če ni vadnine za tega plavalca
            if (!feeData) {
                // Za pretekle mesece: če ni vadnine, plavalec verjetno še ni bil dodan - ne prikaži
                if (isPastMonth) {
                    continue; // Preskoči tega plavalca - ne prikaži ga v tabeli
                }
                // Za sedanji/prihodnji mesec: uporabi privzeto vadnino
                const defaultFeeData = { fee: 80, discount: 0, is_oly: false };
                const effectiveFee = defaultFeeData.fee;
                const finalFee = Math.max(0, effectiveFee - defaultFeeData.discount);
                
                // Uporabi defaultFeeData za prikaz...
                const termLabels = (swimmer.terms || []).map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    return term ? term.label : termId;
                }).join(', ');
                
                const termsDisplay = termLabels.trim() || 'Brez terminov';
                
                // Preveri OLY limit
                const canCheckOly = olyCount < 15;
                
                // Obarvaj vrstice z 0€ vadnino z nežno pastelno rdečo barvo (razen če je OLY obkljukano)
                // Vendar v tem primeru nimamo isOly, ker nimamo feeData, zato obarvaj samo če ni default fee 0
                const rowStyle = (finalFee === 0 && effectiveFee !== 0) ? 'style="background-color: #ffe0e0;"' : '';
                
                html += `
                    <tr ${rowStyle}>
                        <td>${swimmer.first_name} ${swimmer.last_name}</td>
                        <td>${termsDisplay}</td>
                        <td>
                            <input type="number" id="fee-${swimmer.id}" value="${effectiveFee}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})">
                        </td>
                        <td>
                            <input type="number" id="discount-${swimmer.id}" value="${defaultFeeData.discount}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})">
                        </td>
                        <td><strong>${finalFee.toFixed(2)}€</strong></td>
                        <td style="text-align: center;">
                            <input type="checkbox" id="oly-${swimmer.id}" ${canCheckOly ? '' : 'disabled'} onchange="updateSwimmerOly('${swimmer.id}', this.checked, ${month}, ${year})" style="cursor: pointer; width: 20px; height: 20px;">
                            ${!canCheckOly ? '<span style="font-size: 10px; color: #999; display: block;">Max 15</span>' : ''}
                        </td>
                    </tr>
                `;
                continue;
            }
            
            const isOly = feeData.is_oly || false;
            
            // Če je OLY obkljukljeno, nastavi znesek vadnine na 0
            const effectiveFee = isOly ? 0 : feeData.fee;
            const finalFee = Math.max(0, effectiveFee - feeData.discount);
            
            const termLabels = (swimmer.terms || []).map(termId => {
                const term = TERMS.find(t => t.id === termId);
                return term ? term.label : termId;
            }).join(', ');
            
            // Preveri, ali je checkbox OLY omogočen (maksimalno 15, ali če je že obkljukljen)
            const canCheckOly = olyCount < 15 || isOly;
            
            // Obarvaj vrstice z 0€ vadnino z nežno pastelno rdečo barvo (razen če je OLY obkljukano)
            const rowStyle = (finalFee === 0 && !isOly) ? 'style="background-color: #ffe0e0;"' : '';
            
            html += `
                <tr ${rowStyle}>
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td>${termLabels || 'Brez terminov'}</td>
                    <td>
                        <input type="number" 
                               value="${effectiveFee}" 
                               min="0" 
                               step="0.01" 
                               style="width: 80px;"
                               onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})"
                               ${isOly ? 'disabled' : ''}>
                    </td>
                    <td>
                        <input type="number" 
                               value="${feeData.discount}" 
                               min="0" 
                               step="0.01" 
                               style="width: 80px;"
                               onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})"
                               ${isOly ? 'disabled' : ''}>
                    </td>
                    <td><strong>${finalFee.toFixed(2)}€</strong></td>
                    <td style="text-align: center;">
                        <input type="checkbox" id="oly-${swimmer.id}" ${isOly ? 'checked' : ''} ${canCheckOly ? '' : 'disabled'} onchange="updateSwimmerOly('${swimmer.id}', this.checked, ${month}, ${year})" style="cursor: pointer; width: 20px; height: 20px;">
                        ${!canCheckOly && !isOly ? '<span style="font-size: 10px; color: #999; display: block;">Max 15</span>' : ''}
                    </td>
                </tr>
            `;
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

    // Posodobljena funkcija za posodobitev pristojbine plavalca
    async function updateSwimmerFee(swimmerId, fee, month, year) {
        const success = await updateSwimmerFeeInDB(swimmerId, fee, month, year);
        
        if (success) {
            if (currentSection === 'finance') {
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
            if (currentSection === 'finance') {
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
            // Ustvari CSV vsebino z vsemi plavalci
            let csv = 'first_name,last_name,email,phone,address,postal_code,terms\n';
            
            // Filtriraj samo aktivne plavalce
            const activeSwimmers = swimmers.filter(s => !s.is_deleted);
            
            if (activeSwimmers.length === 0) {
                alert('Ni plavalcev za izvoz');
                return;
            }
            
            activeSwimmers.forEach(swimmer => {
                const termsStr = swimmer.terms && swimmer.terms.length > 0 
                    ? swimmer.terms.map(termId => {
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
            link.setAttribute('download', `seznam_plavalcev_${new Date().toISOString().split('T')[0]}.csv`);
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
            
            // Sortiraj termine po dnevu in času (filtrirati samo aktivne, če je property na voljo)
            const sortedTerms = TERMS.filter(t => t.is_deleted !== true).sort((a, b) => {
                if (a.day !== b.day) {
                    return a.day - b.day;
                }
                return a.start_time.localeCompare(b.start_time);
            });
            
            if (sortedTerms.length === 0) {
                alert('Ni terminov za izvoz');
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
    async function copyPreviousMonthFees() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Dodatna validacija meseca
            if (currentMonth < 0 || currentMonth > 11) {
                console.error(`❌ Neveljaven trenutni mesec: ${currentMonth}`);
                showMessage('Napaka: Neveljaven trenutni mesec!', 'error');
                return false;
            }
            
            // Izračunaj prejšnji mesec
            let previousMonth = currentMonth - 1;
            let previousYear = currentYear;
            if (previousMonth < 0) {
                previousMonth = 11; // December
                previousYear = currentYear - 1;
            }
            
            // Dodatna validacija prejšnjega meseca
            if (previousMonth < 0 || previousMonth > 11) {
                console.error(`❌ Neveljaven prejšnji mesec: ${previousMonth}`);
                showMessage('Napaka: Neveljaven prejšnji mesec!', 'error');
                return false;
            }
            
// console.log(`🔄 Začenjam kopiranje vadnin iz ${previousMonth + 1}/${previousYear} v ${currentMonth + 1}/${currentYear}...`);
            
            // Pridobi vse vadnine iz prejšnega meseca
            const { data: previousMonthFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', previousMonth)
                .eq('year', previousYear);
            
            if (fetchError) {
                console.error('Napaka pri pridobivanju vadnin iz prejšnega meseca:', fetchError);
                showMessage('Napaka pri pridobivanju vadnin iz prejšnega meseca!', 'error');
                return false;
            }
            
            if (!previousMonthFees || previousMonthFees.length === 0) {
// console.log(`Ni vadnin za prejšnji mesec ${previousMonth + 1}/${previousYear}`);
                showMessage(`Ni vadnin za prejšnji mesec ${previousMonth + 1}/${previousYear}!`, 'info');
                return false;
            }
            
// console.log(`Najdenih ${previousMonthFees.length} vadnin iz prejšnega meseca za kopiranje`);
            
            // Preveri, ali vadnine za trenutni mesec že obstajajo
            const { data: currentMonthFees, error: currentError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', currentMonth)
                .eq('year', currentYear);
            
            if (currentError) {
                console.error('Napaka pri preverjanju trenutnih vadnin:', currentError);
                showMessage('Napaka pri preverjanju trenutnih vadnin!', 'error');
                return false;
            }
            
            // Ustvari seznam obstoječih vadnin za trenutni mesec
            const existingFees = currentMonthFees || [];
            const existingSwimmerIds = existingFees.map(fee => fee.swimmer_id);
            
            // Ustvari nove vadnine samo za plavalce, ki še nimajo vadnin za trenutni mesec
            const newFees = [];
            previousMonthFees.forEach(previousFee => {
                if (!existingSwimmerIds.includes(previousFee.swimmer_id)) {
                    newFees.push({
                        swimmer_id: previousFee.swimmer_id,
                        month: currentMonth,
                        year: currentYear,
                        monthly_fee: previousFee.monthly_fee,
                        discount: 0 // Brez popusta za nov mesec
                    });
                }
            });
            
            if (newFees.length === 0) {
// console.log('Vse vadnine za trenutni mesec že obstajajo');
                showMessage('Vse vadnine za trenutni mesec že obstajajo!', 'info');
                return true;
            }
            
// console.log(`Ustvarjam ${newFees.length} novih vadnin za trenutni mesec`);
            
            // Uvozi nove vadnine v bazo
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
            showMessage(`Uspešno kopiranih ${insertedFees.length} vadnin iz ${previousMonth + 1}/${previousYear} v ${currentMonth + 1}/${currentYear}!`, 'success');
            
            // Osveži finance sekcijo, če je prikazana
            if (currentSection === 'finance') {
                calculateFinanceData();
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
            
            // Preveri, ali obstajajo vadnine za trenutni mesec
            const { data: currentMonthFees, error: fetchError } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', currentMonth)
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
            copyButton.onclick = copyPreviousMonthFees;
// console.log('✅ Gumb za kopiranje vadnin je povezan');
        } else {
            console.warn('⚠️ Gumb za kopiranje vadnin ni bil najden');
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
            
            // Preveri vadnine za trenutni mesec
            const { data: currentMonthFees, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .eq('month', currentMonth)
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
    
    // ===== Inicializacija =====
    try {
        loadData();
        loadCostSettings(); // Naloži nastavitve cen
        
        // Po nalaganju podatkov nastavi gumb za kopiranje vadnin in preveri avtomatsko kopiranje
        setTimeout(() => {
            try {
                setupCopyFeesButton();
                // Dodaj dodatno zakasnitev za avtomatsko kopiranje, da se izognemo konfliktom
                setTimeout(() => {
                    try {
// console.log('🚀 Začenjam avtomatsko kopiranje vadnin...');
                        autoCopyFeesIfNeeded();
                    } catch (error) {
                        console.error('❌ Napaka pri avtomatskem kopiranju vadnin:', error);
                    }
                }, 3000); // Počakaj dodatne 3 sekunde (skupaj 5 sekund)
            } catch (error) {
                console.error('❌ Napaka pri nastavljanju gumbov za kopiranje vadnin:', error);
            }
        }, 2000); // Počakaj 2 sekundi, da se podatki naložijo
    } catch (error) {
        console.error('❌ Napaka pri inicializaciji:', error);
    }




    


});
