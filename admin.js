// Admin stran za upravljanje plavalne šole
document.addEventListener('DOMContentLoaded', () => {
    // Preveri, če je uporabnik prijavljen
    const session = authManager.isAdminLoggedIn();
    if (!session) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Prikaži informacije o sessiona
    const adminInfo = document.getElementById('adminInfo');
    if (adminInfo) {
        const remainingDays = authManager.getSessionDaysRemaining();
        adminInfo.textContent = `Pozdravljeni, ${session.email} (login velja še ${remainingDays} dni)`;
    }

    // Uporabi centralizirano konfiguracijo
    const supabase = createSupabaseClient();
    if (!supabase) {
        alert('Napaka: Ne morem vzpostaviti povezave z bazo podatkov.');
        return;
    }
    
    debugLog('Supabase client uspešno ustvarjen');

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

    const DAYNAME = ["","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota","Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];

    // ===== UI elementi =====
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
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
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");

    // UI elementi za povzetek udeležbe plavalcev
    const elSwimmerSummaryMonthSelect = document.getElementById("swimmerSummaryMonthSelect");
    const elSwimmerSummaryYearSelect = document.getElementById("swimmerSummaryYearSelect");
    const elRefreshSwimmerSummaryBtn = document.getElementById("refreshSwimmerSummaryBtn");
    const elSwimmerSummaryBox = document.getElementById("swimmerSummaryBox");

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
    const elAddTrainerBtn = document.getElementById("addTrainerBtn");
    const elTrainerSelect = document.getElementById("trainerSelect");
    const elTrainerTermSelect = document.getElementById("trainerTermSelect");
    const elAssignTrainerTermBtn = document.getElementById("assignTrainerTermBtn");
    const elDeleteTrainerBtn = document.getElementById("deleteTrainerBtn");
    const elTrainerInfo = document.getElementById("trainerInfo");
    const elTrainersList = document.getElementById("trainersList");
    const elTrainerSummaryMonthSelect = document.getElementById("trainerSummaryMonthSelect");
    const elTrainerSummaryYearSelect = document.getElementById("trainerSummaryYearSelect");
    const elRefreshTrainerSummaryBtn = document.getElementById("refreshTrainerSummaryBtn");
    const elTrainerSummaryBox = document.getElementById("trainerSummaryBox");
    
    // UI elementi za Finance sekcijo
    const elFinanceMonthSelect = document.getElementById("financeMonthSelect");
    const elFinanceYearSelect = document.getElementById("financeYearSelect");
    const elRefreshFinanceBtn = document.getElementById("refreshFinanceBtn");
    const elFinanceSummaryBox = document.getElementById("financeSummaryBox");
    const elDetailedCostsBox = document.getElementById("detailedCostsBox");
    const elManagementCostPerMonth = document.getElementById("managementCostPerMonth");
    const elSaveCostsBtn = document.getElementById("saveCostsBtn");
    
    // UI elementi za nastavitve stroškov prog in urnih postavk
    const elTermCostsSettings = document.getElementById("termCostsSettings");
    const elSaveTermCostsBtn = document.getElementById("saveTermCostsBtn");
    const elTrainerRatesSettings = document.getElementById("trainerRatesSettings");
    const elSaveTrainerRatesBtn = document.getElementById("saveTrainerRatesBtn");
    
    // UI elementi za upravljanje pristojbin plavalcev
    const elSwimmerFeesMonthSelect = document.getElementById("swimmerFeesMonthSelect");
    const elSwimmerFeesYearSelect = document.getElementById("swimmerFeesYearSelect");
    const elRefreshSwimmerFeesBtn = document.getElementById("refreshSwimmerFeesBtn");
    const elSwimmerFeesBox = document.getElementById("swimmerFeesBox");
    
    const elEditTermModal = document.getElementById("editTermModal");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
    const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");

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
                
                if (elSwimmerFeesMonthSelect && elSwimmerFeesYearSelect) {
                    elSwimmerFeesMonthSelect.value = currentMonth;
                    elSwimmerFeesYearSelect.value = currentYear;
                }
                
                // Osveži pristojbine plavalcev
                setTimeout(() => {
                    refreshSwimmerFees();
                }, 100);
                
                // Preveri stanje vadnin in avtomatsko kopiraj, če je potrebno
                setTimeout(async () => {
                    console.log('🔍 Preverjam stanje vadnin ob prehodu v finance sekcijo...');
                    const status = await checkFeesStatus();
                    if (status.status === 'incomplete' && status.missingMonths.length > 0) {
                        console.log('🔄 Manjkajo vadnine - avtomatsko kopiram iz prejšnega meseca...');
                        await copyPreviousMonthFees();
                    }
                }, 500);
            }
        });
    });

    // ===== Nalaganje podatkov =====
    async function loadData() {
        try {
            // Naloži termine iz Supabase
            console.log('Nalaganje terminov...');
            const { data: termsData, error: termsError } = await supabase
                .from('terms')
                .select('*');
            
            if (termsError) {
                console.error('Napaka pri nalaganju terminov:', termsError);
            } else {
                TERMS = termsData || [];
                console.log('Termini naloženi:', TERMS.length);
            }

            // Naloži plavalce iz Supabase
            console.log('Nalaganje plavalcev...');
            const { data: swimmersData, error: swimmersError } = await supabase
                .from('swimmers')
                .select('*');
            
            if (swimmersError) {
                console.error('Napaka pri nalaganju plavalcev:', swimmersError);
            } else {
                swimmers = swimmersData || [];
                console.log('Plavalci naloženi:', swimmers.length);
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
            console.log('Nalaganje trenerjev...');
            const { data: trainersData, error: trainersError } = await supabase
                .from('trainers')
                .select('*');
            
            if (trainersError) {
                console.error('Napaka pri nalaganju trenerjev:', trainersError);
            } else {
                trainers = trainersData || [];
                console.log('Trenerji naloženi:', trainers.length);
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
            console.log('Nalaganje terminov trenerjev...');
            const { data: trainerTermsData, error: trainerTermsError } = await supabase
                .from('trainer_terms')
                .select('*');
            
            if (trainerTermsError) {
                console.error('Napaka pri nalaganju terminov trenerjev:', trainerTermsError);
            } else {
                // Dodaj termine k trenerjem
                if (trainerTermsData) {
                    console.log('Termini trenerjev naloženi:', trainerTermsData.length);
                    trainerTermsData.forEach(row => {
                        const trainer = trainers.find(t => t.id === row.trainer_id);
                        if (trainer) {
                            if (!trainer.terms) trainer.terms = [];
                            trainer.terms.push(row.term_id);
                        }
                    });
                    console.log('Trenerji z termini:', trainers.filter(t => t.terms && t.terms.length > 0).length);
                }
            }

            // Posodobi UI
            console.log('Posodabljanje UI...');
            updateSwimmerSelects();
            updateTermSelects();
            updateTrainerSelects();
            updateSwimmersList();
            updateTermList();
            updateTrainersList();
            updateExportSelects();
            updateTrainerSummaryControls();
            calculateTrainerNotesData(); // Prikaži opombe trenerjev
            
            // Osveži povzetek udeležbe plavalcev
            await refreshSwimmerSummary();
            
            // Prikaži nastavitve stroškov prog in urnih postavk trenerjev
            renderTermCostsSettings();
            renderTrainerRatesSettings();
            

            
            console.log('UI posodobljen');
            
            // Debug informacije
            console.log('Naloženi podatki:', {
                terms: TERMS.length,
                swimmers: swimmers.length,
                trainers: trainers.length,
                attendance: Object.keys(attendance).length,
                trainerAttendance: Object.keys(trainerAttendance).length
            });

        } catch (error) {
            console.error('Napaka pri nalaganju podatkov:', error);
        }
    }

    // ===== Upravljanje plavalcev =====
    function updateSwimmerSelects() {
        // Posodobi select za plavalce
        elSwimmerSelect.innerHTML = '<option value="">Izberi plavalca</option>';
        swimmers.forEach(s => {
            if (!s.is_deleted) {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = `${s.first_name} ${s.last_name}`;
                elSwimmerSelect.appendChild(option);
            }
        });

        // Počisti select za termine
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';

        // Posodobi select v modalnem oknu
        const modalSwimmerSelect = document.getElementById('modalSwimmerSelect');
        if (modalSwimmerSelect) {
            modalSwimmerSelect.innerHTML = '<option value="">Izberi plavalca</option>';
            swimmers.forEach(s => {
                if (!s.is_deleted) {
                    const option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = `${s.first_name} ${s.last_name}`;
                    modalSwimmerSelect.appendChild(option);
                }
            });
        }
    }

    function updateTermSelects() {
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        
        // Prikaži samo aktivne termine
        const activeTerms = getActiveTerms();
        
        activeTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time}-${t.end_time}`;
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
        
        availableTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time}-${t.end_time}`;
            elTermSelect.appendChild(option);
        });
    }

    function updateTrainerSelects() {
        console.log('updateTrainerSelects - trenerji:', trainers);
        
        // Posodobi select za trenerje
        elTrainerSelect.innerHTML = '<option value="">Izberi trenerja</option>';
        trainers.forEach(t => {
            // Prikaži samo trenerje, ki niso označeni kot izbrisani (lokalno)
            if (!t.is_deleted) {
                const option = document.createElement('option');
                option.value = t.id;
                option.textContent = `${t.first_name} ${t.last_name}`;
                elTrainerSelect.appendChild(option);
            }
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
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time}-${t.end_time}`;
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
        elSwimmersList.innerHTML = '';
        
        if (swimmers.length === 0) {
            elSwimmersList.innerHTML = '<p class="muted">Ni plavalcev</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Ime</th>
                    <th>Priimek</th>
                    <th>Termini</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        swimmers.forEach(swimmer => {
            if (!swimmer.is_deleted) {
                const row = document.createElement('tr');
                
                // Ustvari termine kot "chips" z možnostjo brisanja
                const termsChips = swimmer.terms.map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    if (term) {
                        return `
                            <span class="chip" data-term-id="${termId}" data-swimmer-id="${swimmer.id}">
                                ${DAY_SHORT_NAME[term.day]} ${term.start_time}-${term.end_time}
                                <button class="remove-term-btn" onclick="removeTermFromSwimmer('${swimmer.id}', '${termId}')" title="Odstrani termin">✖</button>
                            </span>
                        `;
                    }
                    return `<span class="chip" data-term-id="${termId}">${termId}</span>`;
                }).join(' ');

                row.innerHTML = `
                    <td>${swimmer.first_name}</td>
                    <td>${swimmer.last_name}</td>
                    <td class="terms-cell">${termsChips || '<span class="muted">Brez terminov</span>'}</td>
                    <td>
                        <button class="btn warn" onclick="deleteSwimmer('${swimmer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši plavalca
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });

        elSwimmersList.appendChild(table);
    }

    function updateTrainersList() {
        elTrainersList.innerHTML = '';
        
        console.log('updateTrainersList - trenerji:', trainers);
        
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
                    <th>Termini</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        trainers.forEach(trainer => {
            // Prikaži samo trenerje, ki niso označeni kot izbrisani (lokalno)
            if (!trainer.is_deleted) {
                const row = document.createElement('tr');
                
                // Ustvari termine kot "chips" z možnostjo brisanja
                const termsChips = trainer.terms ? trainer.terms.map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    if (term) {
                        return `
                            <span class="chip" data-term-id="${termId}" data-trainer-id="${trainer.id}">
                                ${DAY_SHORT_NAME[term.day]} ${term.start_time}-${term.end_time}
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
                    <td class="terms-cell">${termsChips || '<span class="muted">Brez terminov</span>'}</td>
                    <td>
                        <button class="btn warn" onclick="deleteTrainer('${trainer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši trenerja
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });

        elTrainersList.appendChild(table);
    }

    // ===== Dodajanje plavalcev =====
    elAddSwimmerBtn.addEventListener('click', async () => {
        const first = elNewFirst.value.trim();
        const last = elNewLast.value.trim();
        
        if (!first || !last) {
            alert('Prosim vnesite ime in priimek');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('swimmers')
                .insert([{
                    first_name: first,
                    last_name: last,
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
            
            updateSwimmerSelects();
            updateSwimmersList();
            elSwimmerInfo.textContent = `Dodan plavalec: ${first} ${last}`;
            
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
        
        if (!first || !last) {
            alert('Prosim vnesite ime in priimek');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('trainers')
                .insert([{
                    first_name: first,
                    last_name: last,
                    email: email
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

    // ===== Upravljanje terminov =====
    window.editTerm = async function(termId) {
        const term = TERMS.find(t => t.id === termId);
        if (term) {
            // Popolni modal za urejanje
            elEditTermDateFrom.value = term.date_from;
            elEditTermDateTo.value = term.date_to;
            
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

    // ===== Brisanje plavalcev =====
    window.deleteSwimmer = async function(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (swimmer) {
            try {
                const { error } = await supabase
                    .from('swimmers')
                    .update({ is_deleted: true })
                    .eq('id', swimmerId);

                if (error) {
                    console.error('Napaka pri brisanju plavalca:', error);
                    alert('Napaka pri brisanju plavalca. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                swimmer.is_deleted = true;
                updateSwimmerSelects();
                updateSwimmersList();
                alert('Plavalec uspešno izbrisan.');
            } catch (error) {
                console.error('Napaka pri brisanju plavalca:', error);
                alert('Napaka pri brisanju plavalca.');
            }
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
            
            dayTerms.forEach(term => {
                const termCard = document.createElement('div');
                termCard.className = 'term-card';
                
                // Poišči plavalce za ta termin
                const assignedSwimmers = swimmers.filter(s => 
                    s.terms && s.terms.includes(term.id) && !s.is_deleted
                );
                
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
                
                termCard.innerHTML = `
                    <div class="term-header">
                        <span class="term-time">${term.start_time} - ${term.end_time}</span>
                        <span class="term-period">${formatDate(term.date_from)} - ${formatDate(term.date_to)}</span>
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
            elEditTermModal.style.display = 'flex';
            
            // Shrani ID termina za shranjevanje
            elEditTermModal.setAttribute('data-term-id', termId);
        }
    };

    elSaveEditTermBtn.addEventListener('click', async () => {
        const termId = elEditTermModal.getAttribute('data-term-id');
        const dateFrom = parseDate(elEditTermDateFrom.value);
        const dateTo = parseDate(elEditTermDateTo.value);
        
        if (!dateFrom || !dateTo) {
            alert('Prosim vnesite veljavna datuma');
            return;
        }

        const term = TERMS.find(t => t.id === termId);
        if (term) {
            try {
                const { error } = await supabase
                    .from('terms')
                    .update({ 
                        date_from: dateFrom, 
                        date_to: dateTo 
                    })
                    .eq('id', termId);

                if (error) {
                    console.error('Napaka pri shranjevanju termina:', error);
                    alert('Napaka pri shranjevanju termina. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                term.date_from = dateFrom;
                term.date_to = dateTo;
                updateTermList();
                updateSwimmersList();

                elEditTermModal.style.display = 'none';
            } catch (error) {
                console.error('Napaka pri shranjevanju termina:', error);
                alert('Napaka pri shranjevanju termina.');
            }
        }
    });

    elCloseEditTermModalBtn.addEventListener('click', () => {
        elEditTermModal.style.display = 'none';
    });

    // Zapri modal ob kliku zunaj
    window.addEventListener('click', (e) => {
        if (e.target === elEditTermModal) {
            elEditTermModal.style.display = 'none';
        }
    });

    // ===== CSV uvoz/izvoz =====
    function updateExportSelects() {
        // Mesec
        elExportMonthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i - 1;
            option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
            elExportMonthSelect.appendChild(option);
        }
        elExportMonthSelect.value = new Date().getMonth();

        // Leto
        elExportYearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = 2025; i <= 2028; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elExportYearSelect.appendChild(option);
        }
        elExportYearSelect.value = currentYear;
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
                function parseCSVLine(line) {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
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
                const headers = parseCSVLine(lines[0]);
                
                if (!headers.includes('first_name') || !headers.includes('last_name') || !headers.includes('terms')) {
                    alert('CSV mora vsebovati stolpce: first_name, last_name, terms');
                    return;
                }

                const newSwimmers = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = parseCSVLine(lines[i]);
                        const first = values[headers.indexOf('first_name')];
                        const last = values[headers.indexOf('last_name')];
                        const termsStr = values[headers.indexOf('terms')];
                        
                        if (first && last) {
                            // Razčleni termine, ločene z vejico, vendar znotraj istega polja
                            const terms = termsStr ? termsStr.split(',').map(t => t.trim()) : [];
                            
                            // Preveri, ali vsi termini obstajajo v bazi
                            const validTerms = [];
                            const invalidTerms = [];
                            
                            for (const term of terms) {
                                if (TERMS.find(t => t.id === term)) {
                                    validTerms.push(term);
                                } else {
                                    invalidTerms.push(term);
                                }
                            }
                            
                            if (invalidTerms.length > 0) {
                                console.warn(`Invalid terms for ${first} ${last}: [${invalidTerms.join(', ')}]`);
                            }
                            
                            console.log(`Parsed swimmer: ${first} ${last}, valid terms: [${validTerms.join(', ')}]`);
                            
                            newSwimmers.push({
                                first_name: first,
                                last_name: last,
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
                            // Posodobi obstoječega plavalca z novimi termini
                            existingSwimmersToUpdate.push({
                                id: existingSwimmer.id,
                                terms: swimmer.terms
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
                            console.log(`Updating swimmer ${updateData.id} with terms: [${updateData.terms.join(', ')}]`);
                            console.log('Terms array type:', typeof updateData.terms, 'Length:', updateData.terms.length);
                            console.log('Terms array content:', JSON.stringify(updateData.terms));
                            console.log('Terms array isArray:', Array.isArray(updateData.terms));
                            console.log('Terms array constructor:', updateData.terms.constructor.name);
                            
                            const { data: updateResult, error: updateError } = await supabase
                                .from('swimmers')
                                .update({ terms: updateData.terms })
                                .eq('id', updateData.id)
                                .select();

                            if (updateError) {
                                console.error('Napaka pri posodobitvi plavalca:', updateError);
                                continue;
                            }
                            
                            if (updateResult && updateResult.length > 0) {
                                console.log(`Database update successful for swimmer ${updateData.id}:`, updateResult[0]);
                                console.log(`Database returned terms:`, updateResult[0].terms);
                                console.log(`Database terms type:`, typeof updateResult[0].terms);
                                console.log(`Database terms isArray:`, Array.isArray(updateResult[0].terms));
                            }
                            
                            // Posodobi lokalno stanje
                            const localSwimmer = swimmers.find(s => s.id === updateData.id);
                            if (localSwimmer) {
                                localSwimmer.terms = updateData.terms;
                                console.log(`Updated local swimmer ${localSwimmer.first_name} ${localSwimmer.last_name} with terms: [${localSwimmer.terms.join(', ')}]`);
                            }

                            updatedCount++;
                        }
                    }
                    
                    // Osveži podatke iz baze za posodobljene plavalce
                    if (existingSwimmersToUpdate.length > 0) {
                        console.log('Refreshing swimmers data from database...');
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
                                    console.log(`Refreshed swimmer ${refreshedSwimmer.first_name} ${refreshedSwimmer.last_name} with terms: [${refreshedSwimmer.terms.join(', ')}]`);
                                    console.log(`Refreshed terms type:`, typeof refreshedSwimmer.terms);
                                    console.log(`Refreshed terms isArray:`, Array.isArray(refreshedSwimmer.terms));
                                    console.log(`Refreshed terms content:`, JSON.stringify(refreshedSwimmer.terms));
                                }
                            });
                        }
                    }
                    
                    updateSwimmerSelects();
                    updateSwimmersList();
                    
                    // Dodaj dodatno debugiranje
                    console.log('After update - checking local swimmers:');
                    for (const updateData of existingSwimmersToUpdate) {
                        const localSwimmer = swimmers.find(s => s.id === updateData.id);
                        if (localSwimmer) {
                            console.log(`Local swimmer ${localSwimmer.first_name} ${localSwimmer.last_name} has terms: [${localSwimmer.terms.join(', ')}]`);
                        }
                    }
                    
                    let message = '';
                    if (insertedCount > 0) message += `Uvoženih ${insertedCount} novih plavalcev. `;
                    if (updatedCount > 0) message += `Posodobljenih ${updatedCount} obstoječih plavalcev.`;
                    
                    // Dodaj informacijo o validaciji terminov
                    const totalSwimmers = newSwimmers.length;
                    const totalTerms = newSwimmers.reduce((sum, swimmer) => sum + swimmer.terms.length, 0);
                    message += `\n\nSkupaj uvoženih ${totalTerms} terminov za ${totalSwimmers} plavalcev.`;
                    
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
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                const requiredHeaders = ['id', 'day', 'start_time', 'end_time', 'date_from', 'date_to'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    alert('CSV mora vsebovati vse zahtevane stolpce');
                    return;
                }

                const newTerms = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
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
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    
                    const requiredHeaders = ['first_name', 'last_name', 'monthly_fee'];
                    if (!requiredHeaders.every(h => headers.includes(h))) {
                        alert('CSV mora vsebovati stolpce: first_name, last_name, monthly_fee');
                        return;
                    }
                    
                    // Preveri, ali CSV vsebuje opcijski stolpec za popust
                    const hasDiscountColumn = headers.includes('discount');

                    const month = parseInt(elFinanceMonthSelect.value);
                    const year = parseInt(elFinanceYearSelect.value);
                    
                    if (month === undefined || year === undefined) {
                        alert('Prosim izberite mesec in leto za uvoz vadnin');
                        return;
                    }
                    
                    // Validacija meseca
                    if (month < 0 || month > 11) {
                        alert(`Napaka: Neveljaven mesec: ${month}. Mesec mora biti med 0 in 11.`);
                        return;
                    }

                    const importedFees = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) {
                            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                            const firstName = values[headers.indexOf('first_name')];
                            const lastName = values[headers.indexOf('last_name')];
                            const amount = parseFloat(values[headers.indexOf('monthly_fee')]);
                            
                            // Preberi popust, če obstaja stolpec
                            let discount = 0;
                            if (hasDiscountColumn) {
                                const discountValue = values[headers.indexOf('discount')];
                                discount = discountValue ? parseFloat(discountValue) || 0 : 0;
                            }
                            
                            if (firstName && lastName && !isNaN(amount)) {
                                // Poišči plavalca po imenu in priimku
                                const swimmer = swimmers.find(s => 
                                    !s.is_deleted && 
                                    s.first_name.toLowerCase() === firstName.toLowerCase() && 
                                    s.last_name.toLowerCase() === lastName.toLowerCase()
                                );
                                
                                if (swimmer) {
                                    importedFees.push({
                                        swimmer_id: swimmer.id,
                                        month: month,
                                        year: year,
                                        monthly_fee: amount,
                                        discount: discount
                                    });
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
                        let startMonth, startYear;
                        if (year > currentYear || (year === currentYear && month >= currentMonth)) {
                            // Če je izbran mesec v prihodnosti ali sedanjosti, začni od tam
                            startMonth = month;
                            startYear = year;
                        } else {
                            // Če je izbran mesec v preteklosti, začni od trenutnega meseca
                            startMonth = currentMonth;
                            startYear = currentYear;
                        }
                        
                        // Ustvari vadnine za vse mesece od startMonth do konca leta
                        console.log(`Creating fees for months ${startMonth} to ${11} (${startMonth + 1} to ${12} in human-readable) in year ${startYear}`);
                        
                        // Validacija startMonth
                        if (startMonth < 0 || startMonth > 11) {
                            console.error(`❌ Neveljaven startMonth: ${startMonth}`);
                            alert(`Napaka: Neveljaven začetni mesec: ${startMonth}`);
                            return;
                        }
                        
                        for (let m = startMonth; m < 12; m++) {
                            // Dodatna validacija v zanki
                            if (m < 0 || m > 11) {
                                console.error(`❌ Neveljaven mesec v zanki: ${m}`);
                                alert(`Napaka: Neveljaven mesec v zanki: ${m}`);
                                return;
                            }
                            
                            console.log(`📅 Ustvarjam vadnine za mesec ${m} (${m + 1} v človeškem formatu) v letu ${startYear}`);
                            
                            for (const fee of importedFees) {
                                const newFee = {
                                    swimmer_id: fee.swimmer_id,
                                    month: m,
                                    year: startYear,
                                    monthly_fee: fee.monthly_fee,
                                    discount: m === startMonth ? fee.discount : 0 // Popust samo za začetni mesec
                                };
                                
                                // Dvojna validacija pred dodajanjem
                                if (newFee.month < 0 || newFee.month > 11) {
                                    console.error(`❌ KRITIČNA NAPAKA: Poskus dodajanja vadnine z neveljavnim mesecem ${newFee.month}`);
                                } else {
                                    futureFees.push(newFee);
                                }
                            }
                        }
                        
                        // Če je startYear trenutno leto, dodaj tudi za naslednje leto
                        if (startYear === currentYear) {
                            console.log(`Creating fees for months 0 to 11 (1 to 12 in human-readable) in year ${startYear + 1}`);
                            for (let m = 0; m < 12; m++) {
                                // Validacija meseca v zanki za naslednje leto
                                if (m < 0 || m > 11) {
                                    console.error(`❌ Neveljaven mesec za naslednje leto: ${m}`);
                                    alert(`Napaka: Neveljaven mesec za naslednje leto: ${m}`);
                                    return;
                                }
                                
                                console.log(`📅 Ustvarjam vadnine za mesec ${m} (${m + 1} v človeškem formatu) v letu ${startYear + 1}`);
                                
                                for (const fee of importedFees) {
                                    const newFee = {
                                        swimmer_id: fee.swimmer_id,
                                        month: m,
                                        year: startYear + 1,
                                        monthly_fee: fee.monthly_fee,
                                        discount: 0 // Brez popusta za prihodnje mesece
                                    };
                                    
                                    // Dvojna validacija pred dodajanjem
                                    if (newFee.month < 0 || newFee.month > 11) {
                                        console.error(`❌ KRITIČNA NAPAKA: Poskus dodajanja vadnine z neveljavnim mesecom ${newFee.month} za naslednje leto`);
                                    } else {
                                        futureFees.push(newFee);
                                    }
                                }
                            }
                        }
                        
                        // Validacija vseh vadnin pred uvozom
                        const validFees = futureFees.filter(fee => {
                            if (fee.month < 0 || fee.month > 11) {
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
                        console.log('Importing future fees:', validFees);
                        
                        const { data, error } = await supabase
                            .from('swimmer_monthly_fees')
                            .upsert(validFees, { 
                                onConflict: 'swimmer_id,month,year' 
                            })
                            .select();

                        if (error) {
                            console.error('Napaka pri uvažanju vadnin:', error);
                            
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

                        console.log('Successfully imported fees:', data);
                        const totalMonths = validFees.length / importedFees.length;
                        alert(`Uvoženih ${importedFees.length} vadnin za ${totalMonths} prihodnjih mesecev (od ${startMonth + 1}/${startYear} naprej)`);
                        
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

    // CSV izvoz
    elExportCsvBtn.addEventListener('click', () => {
        const month = parseInt(elExportMonthSelect.value);
        const year = parseInt(elExportYearSelect.value);
        
        if (month === undefined || year === undefined) {
            alert('Prosim izberite mesec in leto');
            return;
        }

        // Ustvari CSV vsebino
        let csv = 'Datum,Termin,Plavalci,Prisotnost,Opombe\n';
        
        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        

        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const isoDate = iso(d);
            
            TERMS.forEach(term => {
                if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                    const dateStr = formatDate(isoDate);
                    const timeStr = `${term.start_time}-${term.end_time}`;
                    
                    // Poišči plavalce za ta termin
                    const assignedSwimmers = swimmers.filter(s => 
                        s.terms.includes(term.id) && !s.is_deleted
                    );
                    
                    const swimmerNames = assignedSwimmers.map(s => `${s.first_name} ${s.last_name}`).join('; ');
                    
                    // Poišči prisotnost
                    const termAtt = attendance[isoDate]?.[term.id] || {};
                    const attendanceList = assignedSwimmers.map(s => {
                        const status = termAtt[s.id];
                        return status === 'present' ? 'Prisoten' : 
                               status === 'absent' ? 'Odstoten' : 
                               status === 'late' ? 'Pozno' : 'Ni vneseno';
                    }).join('; ');
                    
                    // Poišči opombe
                    const status = termStatus[isoDate]?.[term.id];
                    const notes = status?.notes || '';
                    
                    csv += `"${dateStr}","${timeStr}","${swimmerNames}","${attendanceList}","${notes}"\n`;
                }
            });
        }
        
        // Prenesi CSV datoteko
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `prisotnost_${year}_${month + 1}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
    elRefreshTrainerSummaryBtn.addEventListener('click', () => {
        calculateTrainerSummaryData();
    });

    // ===== Event listener za osvežitev opomb trenerjev =====
    const elRefreshTrainerNotesBtn = document.getElementById('refreshTrainerNotesBtn');
    if (elRefreshTrainerNotesBtn) {
        elRefreshTrainerNotesBtn.addEventListener('click', () => {
            calculateTrainerNotesData();
        });
    }

    // ===== Event listener za osvežitev povzetka udeležbe plavalcev =====
    if (elRefreshSwimmerSummaryBtn) {
        elRefreshSwimmerSummaryBtn.addEventListener('click', () => {
            refreshSwimmerSummary();
        });
    }

    // ===== Event listener za Finance sekcijo =====
    if (elRefreshFinanceBtn) {
        elRefreshFinanceBtn.addEventListener('click', () => {
            calculateFinanceData();
        });
    }

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

    if (elRefreshSwimmerFeesBtn) {
        elRefreshSwimmerFeesBtn.addEventListener('click', () => {
            refreshSwimmerFees();
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
        const month = parseInt(elTrainerSummaryMonthSelect.value);
        const year = parseInt(elTrainerSummaryYearSelect.value);
        
        if (month === undefined || year === undefined) {
            elTrainerSummaryBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        

        
        let summary = '<table><thead><tr><th>Trener</th><th>Skupaj</th><th>Prisoten</th><th>Odsoten</th></tr></thead><tbody>';
        
        const trainerStats = {};
        const processedTrainers = new Set(); // Set za sledenje trenerjem, ki so že bili obravnavani
        
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
                    
                    // Dodaj redno dodeljene trenerje
                    trainersForTerm.forEach(trainer => {
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
                                
                                // Preveri, če je v opombi omenjen nadomestni trener (ID v oklepajih)
                                if (trainerAtt.note) {
                                    const substituteIdMatch = trainerAtt.note.match(/\(([a-f0-9-]{36})\)/);
                                    if (substituteIdMatch) {
                                        const substituteTrainerId = substituteIdMatch[1];
                                        const substituteTrainer = trainers.find(t => t.id === substituteTrainerId && !t.is_deleted);
                                        
                                        if (substituteTrainer) {
                                            const substituteKey = `${substituteTrainer.id}`;
                                            console.log('🔍 DEBUG: Najden nadomestni trener v opombi:', substituteTrainer.first_name, substituteTrainer.last_name);
                                            
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
                    if (trainerAttendance[isoDate]?.[term.id]) {
                        Object.keys(trainerAttendance[isoDate][term.id]).forEach(trainerId => {
                            // Preveri, če trener ni že vključen kot redno dodeljen
                            const isRegularlyAssigned = trainersForTerm.some(t => t.id === trainerId);
                            if (!isRegularlyAssigned) {
                                const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                                if (trainer) {
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
                        });
                    }
                }
            });
        }
        
        // Dodaj debug informacije
        console.log('🔍 DEBUG: trainerStats:', trainerStats);
        console.log('🔍 DEBUG: trainerAttendance za september 2025:', trainerAttendance);
        
        // Dodatno: preveri vse trenerje iz trainer_attendance za ta mesec
        // in dodaj tiste, ki morda niso bili vključeni v zgornji logiki
        
        Object.keys(trainerAttendance).forEach(date => {
            const currentDate = new Date(date);
            if (currentDate >= startDate && currentDate <= endDate) {
                Object.keys(trainerAttendance[date]).forEach(termId => {
                    Object.keys(trainerAttendance[date][termId]).forEach(trainerId => {
                        // Preveri, ali trener ni že bil obravnavan v prvi zanki
                        if (!processedTrainers.has(trainerId)) {
                            const trainer = trainers.find(t => t.id === trainerId && !t.is_deleted);
                            if (trainer) {
                                const key = `${trainer.id}`;
                                if (!trainerStats[key]) {
                                    trainerStats[key] = {
                                        trainer: trainer,
                                        total: 0,
                                        present: 0,
                                        absent: 0
                                    };
                                }
                                
                                // Preveri, ali je ta termin veljaven
                                const term = TERMS.find(t => t.id === termId);
                                if (term) {
                                    const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
                                    if (term.day === dayOfWeek && date >= term.date_from && date <= term.date_to) {
                                        // Termin je veljaven, dodaj prisotnost
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
        
        // Prikaži rezultate
        Object.values(trainerStats).forEach(stat => {
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
        
        if (Object.keys(trainerStats).length === 0) {
            summary = '<p class="muted">Ni podatkov o prisotnosti trenerjev za izbrani mesec</p>';
        }
        
        elTrainerSummaryBox.innerHTML = summary;
    }

    // ===== Funkcije za opombe trenerjev =====
    function calculateTrainerNotesData() {
        const month = parseInt(document.getElementById('trainerNotesMonthSelect').value);
        const year = parseInt(document.getElementById('trainerNotesYearSelect').value);
        
        if (month === undefined || year === undefined) {
            document.getElementById('trainerNotesBox').innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
            return;
        }

        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        

        
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
                const timeStr = `${DAY_SHORT_NAME[note.term.day]} ${note.term.start_time}-${note.term.end_time}`;
                
                notes += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${timeStr}</td>
                        <td>${note.trainer.first_name} ${note.trainer.last_name}</td>
                        <td>${note.note}</td>
                    </tr>
                `;
            });
            notes += '</tbody></table>';
        }
        
        document.getElementById('trainerNotesBox').innerHTML = notes;
    }

    function updateTrainerSummaryControls() {
        // Mesec
        elTrainerSummaryMonthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i - 1;
            option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
            elTrainerSummaryMonthSelect.appendChild(option);
        }
        elTrainerSummaryMonthSelect.value = new Date().getMonth();

        // Leto
        elTrainerSummaryYearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elTrainerSummaryYearSelect.appendChild(option);
        }
        elTrainerSummaryYearSelect.value = currentYear;

        // Kontrole za opombe trenerjev
        const elTrainerNotesMonthSelect = document.getElementById('trainerNotesMonthSelect');
        const elTrainerNotesYearSelect = document.getElementById('trainerNotesYearSelect');
        
        if (elTrainerNotesMonthSelect) {
            elTrainerNotesMonthSelect.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i - 1;
                option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
                elTrainerNotesMonthSelect.appendChild(option);
            }
            elTrainerNotesMonthSelect.value = new Date().getMonth();
        }

        if (elTrainerNotesYearSelect) {
            elTrainerNotesYearSelect.innerHTML = '';
            for (let i = currentYear - 2; i <= currentYear + 1; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                elTrainerNotesYearSelect.appendChild(option);
            }
            elTrainerNotesYearSelect.value = currentYear;
        }

        // Kontrole za povzetek udeležbe plavalcev
        if (elSwimmerSummaryMonthSelect) {
            elSwimmerSummaryMonthSelect.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i - 1;
                option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
                elSwimmerSummaryMonthSelect.appendChild(option);
            }
            elSwimmerSummaryMonthSelect.value = new Date().getMonth();
        }

        if (elSwimmerSummaryYearSelect) {
            elSwimmerSummaryYearSelect.innerHTML = '';
            for (let i = currentYear - 2; i <= currentYear + 1; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                elSwimmerSummaryYearSelect.appendChild(option);
            }
            elSwimmerSummaryYearSelect.value = currentYear;
        }

        // Kontrole za Finance sekcijo
        if (elFinanceMonthSelect) {
            elFinanceMonthSelect.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i - 1;
                option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
                elFinanceMonthSelect.appendChild(option);
            }
            elFinanceMonthSelect.value = new Date().getMonth();
        }

        if (elFinanceYearSelect) {
            elFinanceYearSelect.innerHTML = '';
            for (let i = 2025; i <= 2028; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                elFinanceYearSelect.appendChild(option);
            }
            elFinanceYearSelect.value = currentYear;
        }

        // Kontrole za upravljanje pristojbin plavalcev
        if (elSwimmerFeesMonthSelect) {
            elSwimmerFeesMonthSelect.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i - 1;
                option.textContent = new Date(2024, i - 1, 1).toLocaleDateString('sl-SI', { month: 'long' });
                elSwimmerFeesMonthSelect.appendChild(option);
            }
            elSwimmerFeesMonthSelect.value = new Date().getMonth();
        }

        if (elSwimmerFeesYearSelect) {
            elSwimmerFeesYearSelect.innerHTML = '';
            for (let i = 2025; i <= 2028; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                elSwimmerFeesYearSelect.appendChild(option);
            }
            elSwimmerFeesYearSelect.value = currentYear;
        }
    }

    // ===== FUNKCIJE ZA POVZETEK UDELEŽBE PLAVALCEV =====
    
    // Funkcija za izračun povzetka udeležbe plavalcev
    function calculateSwimmerSummaryData(year, month) {
        const res = {};
        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        

        
        const today = new Date();
        today.setHours(0,0,0,0);

        // Inicializacija podatkov za vse plavalce (aktivne in izbrisane)
        swimmers.forEach(s => {
            res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
        });

        // Zanka za izračun prisotnosti (att)
        const allAttendance = Object.entries(attendance);
        for (const [date, termData] of allAttendance) {
            const d = new Date(date);
            d.setHours(0,0,0,0);
            if (d >= monthStart && d <= monthEnd) {
                for (const termId in termData) {
                    for (const swimmerId in termData[termId]) {
                        // Preverimo, ali je bil ta termin aktiven, ko je bila prisotnost vnesena
                        if (termData[termId][swimmerId] === true && res[swimmerId]) {
                            res[swimmerId].att += 1;
                        }
                    }
                }
            }
        }

        // Zanka za izračun možnih obiskov (pos)
        const currentDate = new Date(monthStart);
        while (currentDate <= monthEnd) {
            const ymd = iso(currentDate);
            const todaysTerms = getTermsForDate(currentDate);

            todaysTerms.forEach(term => {
                const termIsActive = getTermStatus(currentDate, term.id).status === "active";
                
                if (termIsActive) {
                    swimmers.forEach(s => {
                        if (res[s.id] && s.terms.includes(term.id)) {
                            
                            if (s.is_deleted) {
                                // Plavalec je izbrisan, štejemo samo, če je datum v preteklosti
                                if (currentDate <= today) {
                                    res[s.id].pos += 1;
                                }
                            } else {
                                // Plavalec je aktiven, štejemo vse možne obiske
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
        // Filtriramo plavalce, ki nimajo nobenega možnega obiska
        const rows = Object.values(summaryData).filter(r => r.pos > 0).sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
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
        const month = parseInt(elSwimmerSummaryMonthSelect.value);
        const year = parseInt(elSwimmerSummaryYearSelect.value);
        
        // Osveži podatke o prisotnosti za izbrani mesec
        await loadAttendanceForMonth(year, month);
        
        // Izračunaj in prikaži povzetek
        const summaryData = calculateSwimmerSummaryData(year, month);
        renderSwimmerSummary(summaryData);
    }

    // Funkcija za nalaganje podatkov o prisotnosti za določen mesec
    async function loadAttendanceForMonth(year, month) {
        // Ustvari datume za mesec (lokalni čas se obravnava v iso() funkciji)
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        

        
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
            
            console.log('Podatki o prisotnosti za mesec osveženi:', data);
        } catch (error) {
            console.error('Napaka pri nalaganju prisotnosti za mesec:', error);
        }
    }

    // ===== FUNKCIJE ZA FINANCE SEKCIJO =====
    
    // Funkcija za prikaz nastavitev stroškov prog po terminih
    function renderTermCostsSettings() {
        if (!elTermCostsSettings) return;
        
        let html = '<div class="term-costs-grid">';
        TERMS.forEach(term => {
            const termCost = getTermCost(term.id) || 0;
            html += `
                <div class="term-cost-row">
                    <label for="term-cost-${term.id}">${term.label}:</label>
                    <input type="number" id="term-cost-${term.id}" value="${termCost}" min="0" step="0.01" style="width: 100px;">
                    <span>€/mesec</span>
                </div>
            `;
        });
        html += '</div>';
        elTrainerRatesSettings.innerHTML = html;
    }
    
    // Funkcija za prikaz nastavitev postavk trenerjev
    function renderTrainerRatesSettings() {
        if (!elTrainerRatesSettings) return;
        
        let html = '<div class="trainer-rates-grid">';
        trainers.forEach(trainer => {
            if (!trainer.is_deleted) {
                const trainerRate = getTrainerRate(trainer.id) || 25;
                html += `
                    <div class="trainer-rate-row">
                        <label for="trainer-rate-${trainer.id}">${trainer.first_name} ${trainer.last_name}:</label>
                        <input type="number" id="trainer-rate-${trainer.id}" value="${trainerRate}" min="0" step="0.01" style="width: 100px;">
                        <span>€/termin</span>
                    </div>
                `;
            }
        });
        html += '</div>';
        elTrainerRatesSettings.innerHTML = html;
    }
    
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
    async function getTrainerRate(trainerId) {
        const trainerRates = await getTrainerRatesFromDB();
        return trainerRates[trainerId] || 25;
    }
    
    // Funkcija za izračun finančnih podatkov
    async function calculateFinanceData() {
        try {
            console.log('=== FINANCE DEBUG START ===');
            
            const month = parseInt(elFinanceMonthSelect.value);
            const year = parseInt(elFinanceYearSelect.value);
            
            console.log('Selected month/year:', month, year);
            
            if (month === undefined || year === undefined) {
                elFinanceSummaryBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
                elDetailedCostsBox.innerHTML = '<p class="muted">Prosim izberite mesec in leto</p>';
                return;
            }

            // Ustvari datume za mesec
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
            
            // Pridobi nastavitve cen
            const managementCostPerMonth = parseFloat(elManagementCostPerMonth.value) || 500;
            
            // Izračunaj prihodke - uporabi individualne pristojbine plavalcev
            const activeSwimmers = swimmers.filter(s => !s.is_deleted);
            console.log('Active swimmers:', activeSwimmers.length);
            
            // Pridobi pristojbine plavalcev iz baze
            const swimmerFees = await getSwimmerFeesFromDB(month, year);
            console.log('Swimmer fees from DB:', swimmerFees);
            
            let totalRevenue = 0;
            
            activeSwimmers.forEach(swimmer => {
                const feeData = swimmerFees[swimmer.id] || { fee: 80, discount: 0 };
                const finalFee = Math.max(0, feeData.fee - feeData.discount);
                totalRevenue += finalFee;
                
                if (swimmerFees[swimmer.id]) {
                    console.log(`Swimmer ${swimmer.first_name} ${swimmer.last_name}: using imported fee=${feeData.fee}, discount=${feeData.discount}, final=${finalFee}`);
                } else {
                    console.log(`Swimmer ${swimmer.first_name} ${swimmer.last_name}: using fallback fee=${feeData.fee}, discount=${feeData.discount}, final=${finalFee}`);
                }
            });
            
            console.log('Total revenue:', totalRevenue);
            
            // Izračunaj stroške trenerjev - za vsak izveden termin v mesecu
            let totalTrainerSessions = 0;
            let trainerCosts = {};
            
            // Pridobi postavke trenerjev iz baze
            const trainerRates = await getTrainerRatesFromDB();
            console.log('Trainer rates from DB:', trainerRates);
            
            // Filtriraj samo aktivne termine za izračun stroškov trenerjev
            const activeTermsForTrainers = TERMS.filter(term => {
                const termEndDate = new Date(term.date_to);
                const today = new Date();
                const isActive = termEndDate >= today;
                if (!isActive) {
                    console.log(`Skipping inactive term ${term.label} (${term.date_to}) for trainer costs`);
                }
                return termEndDate >= today;
            });
            
            if (activeTermsForTrainers.length !== TERMS.length) {
                console.log(`Using ${activeTermsForTrainers.length} active terms out of ${TERMS.length} total terms for trainer cost calculation`);
            }
            
            // Za vsak aktivni termin preštejemo vse dni v mesecu, ko se izvaja
            activeTermsForTrainers.forEach(term => {
                // Preveri, ali je termin aktiven v izbranem mesecu
                const termStartDate = new Date(term.date_from);
                const termEndDate = new Date(term.date_to);
                
                if (startDate <= termEndDate && endDate >= termStartDate) {
                    // Poišči trenerje za ta termin
                    const trainersForTerm = trainers.filter(t => 
                        t.terms && t.terms.includes(term.id) && !t.is_deleted
                    );
                    
                    // Preštej vse dni v mesecu, ko se termin izvaja
                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                        const isoDate = iso(d);
                        
                        // Preveri, ali je termin na ta dan in ali je aktiven
                        if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                            // Preveri, ali je termin deaktiviran za ta dan
                            const termStatus = getTermStatus(d, term.id);
                            if (termStatus.status !== "inactive") {
                                // Termin je aktiven, preveri prisotnost trenerjev
                                trainersForTerm.forEach(trainer => {
                                    if (!trainerCosts[trainer.id]) {
                                        trainerCosts[trainer.id] = {
                                            trainer: trainer,
                                            sessions: 0,
                                            cost: 0
                                        };
                                    }
                                    
                                    // Preveri, ali je trener prisoten na ta dan
                                    const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                                    if (!trainerAtt || trainerAtt.present !== false) {
                                        // Trener je prisoten (ali ni označen kot odsoten)
                                        trainerCosts[trainer.id].sessions += 1;
                                        totalTrainerSessions += 1;
                                        console.log(`Trainer ${trainer.first_name} ${trainer.last_name} present for term ${term.label} on ${isoDate}`);
                                    } else {
                                        console.log(`Trainer ${trainer.first_name} ${trainer.last_name} absent for term ${term.label} on ${isoDate}`);
                                    }
                                });
                            } else {
                                console.log(`Term ${term.label} is inactive on ${isoDate}`);
                            }
                        }
                    }
                }
            });
            
            console.log('Trainer costs before rate calculation:', trainerCosts);
            
            // Izračunaj stroške trenerjev - za vsak izveden termin v mesecu
            for (const trainerCost of Object.values(trainerCosts)) {
                const trainerRate = trainerRates[trainerCost.trainer.id] || 25; // Default 25€/termin
                trainerCost.cost = trainerCost.sessions * trainerRate;
                console.log(`Trainer ${trainerCost.trainer.first_name} ${trainerCost.trainer.last_name}: ${trainerCost.sessions} sessions × ${trainerRate}€ = ${trainerCost.cost}€`);
            }
            
            const totalTrainerCost = Object.values(trainerCosts).reduce((sum, tc) => sum + tc.cost, 0);
            console.log('Total trainer cost:', totalTrainerCost);
            
            // Izračunaj stroške prog po terminih
            let totalFacilityCost = 0;
            
            // Pridobi stroške prog iz baze
            const termCosts = await getTermCostsFromDB();
            console.log('Term costs from DB:', termCosts);
            
            // Filtriraj samo aktivne termine (ki še niso potekli)
            const activeTerms = TERMS.filter(term => {
                const termEndDate = new Date(term.date_to);
                const today = new Date();
                const isActive = termEndDate >= today;
                console.log(`Term ${term.label} (${term.date_to}): ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
                return isActive;
            });
            
            console.log('Active terms for finance calculation:', activeTerms.length, 'out of', TERMS.length);
            
            // Prikaži seznam neaktivnih terminov za debug
            const inactiveTerms = TERMS.filter(term => {
                const termEndDate = new Date(term.date_to);
                const today = new Date();
                return termEndDate < today;
            });
            if (inactiveTerms.length > 0) {
                console.log('Inactive terms (excluded from calculations):', inactiveTerms.map(t => `${t.label} (${t.date_to})`));
            }
            
            for (const term of activeTerms) {
                const termHourlyCost = termCosts[term.id] || 50; // Default 50€/uro
                console.log(`Term ${term.label}: hourly cost = ${termHourlyCost}€`);
                
                if (termHourlyCost > 0) {
                    // Preveri, ali je termin aktiven v izbranem mesecu
                    const termStartDate = new Date(term.date_from);
                    const termEndDate = new Date(term.date_to);
                    if (startDate <= termEndDate && endDate >= termStartDate) {
                        // Preštej, kolikokrat je bil termin načrtovan in aktiven v tem mesecu
                        let trainingSessionsCount = 0;
                        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                            const isoDate = iso(d);
                            
                            // Preveri, ali je termin na ta dan in ali je aktiven
                            if (term.day === dayOfWeek && isoDate >= term.date_from && isoDate <= term.date_to) {
                                // Preveri, ali je termin deaktiviran za ta dan
                                const termStatus = getTermStatus(d, term.id);
                                if (termStatus.status !== "inactive") {
                                    trainingSessionsCount++;
                                    console.log(`Term ${term.label} is active on ${isoDate} (status: ${termStatus.status})`);
                                } else {
                                    console.log(`Term ${term.label} is inactive on ${isoDate} (status: ${termStatus.status})`);
                                }
                            }
                        }
                        
                        // Izračunaj trajanje termina v urah
                        const startTime = new Date(`2000-01-01T${term.start_time}`);
                        const endTime = new Date(`2000-01-01T${term.end_time}`);
                        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                        
                        // Strošek prog = število načrtovanih in aktivnih treningov × trajanje v urah × urni strošek
                        const termMonthlyCost = trainingSessionsCount * durationHours * termHourlyCost;
                        totalFacilityCost += termMonthlyCost;
                        
                        console.log(`Term ${term.label}: ${trainingSessionsCount} scheduled active sessions × ${durationHours}h × ${termHourlyCost}€ = ${termMonthlyCost}€`);
                    }
                }
            }
            
            console.log('Total facility cost:', totalFacilityCost);
            
            // Skupni stroški
            const totalCosts = totalTrainerCost + managementCostPerMonth + totalFacilityCost;
            
            // Dobiček/izguba
            const profit = totalRevenue - totalCosts;
            
            console.log('Final calculation:', {
                revenue: totalRevenue,
                trainerCost: totalTrainerCost,
                managementCost: managementCostPerMonth,
                facilityCost: totalFacilityCost,
                totalCosts: totalCosts,
                profit: profit
            });
            
            console.log('=== FINANCE DEBUG END ===');
            
            // Prikaži povzetek
            let summary = `
                <div class="finance-summary">
                    <div class="finance-card revenue">
                        <h4>Prihodki</h4>
                        <div class="amount">${totalRevenue.toFixed(2)} €</div>
                        <div class="details">${activeSwimmers.length} plavalcev (individualne pristojbine)</div>
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
            
            // Prikaži podrobnosti stroškov
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
                            <td>${totalRevenue.toFixed(2)} €</td>
                            <td>${activeSwimmers.length} aktivnih plavalcev (individualne pristojbine)</td>
                        </tr>
                        <tr>
                            <td>Stroški trenerjev</td>
                            <td>${totalTrainerCost.toFixed(2)} €</td>
                            <td>${totalTrainerSessions} izvedenih terminov (individualne postavke na termin)</td>
                        </tr>
                        <tr>
                            <td>Stroški vodenja</td>
                            <td>${managementCostPerMonth.toFixed(2)} €</td>
                            <td>Fiksni mesečni strošek</td>
                        </tr>
                        <tr>
                            <td>Stroški objektov</td>
                            <td>${totalFacilityCost.toFixed(2)} €</td>
                            <td>Stroški prog po terminih</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>Skupaj stroški</strong></td>
                            <td><strong>${totalCosts.toFixed(2)} €</strong></td>
                            <td></td>
                        </tr>
                        <tr class="profit-row ${profit >= 0 ? 'positive' : 'negative'}">
                            <td><strong>${profit >= 0 ? 'Dobiček' : 'Izguba'}</strong></td>
                            <td><strong>${profit.toFixed(2)} €</strong></td>
                            <td>${profit >= 0 ? 'Pozitivno stanje' : 'Negativno stanje'}</td>
                        </td>
                    </tr>
                </tbody>
            </table>
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
        const month = parseInt(elSwimmerFeesMonthSelect.value);
        const year = parseInt(elSwimmerFeesYearSelect.value);
        
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
                            <th>Dodatni popust za ${new Date(year, month, 1).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })} (€)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        activeSwimmers.forEach(swimmer => {
            const feeData = swimmerFees[swimmer.id] || { fee: 80, discount: 0 };
            const currentFee = feeData.fee;
            const discount = feeData.discount;
            
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
            
            html += `
                <tr>
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td>${assignedTerms.length > 0 ? assignedTerms.join(', ') : 'Brez terminov'}</td>
                    <td>
                        <input type="number" id="fee-${swimmer.id}" value="${currentFee}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})">
                    </td>
                    <td>
                        <input type="number" id="discount-${swimmer.id}" value="${discount}" min="0" step="0.01" style="width: 80px;" onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})">
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        elSwimmerFeesBox.innerHTML = html;
    }
    
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
    
    // Globalne funkcije za onchange evente
    window.updateSwimmerFee = updateSwimmerFee;
    window.updateSwimmerDiscount = updateSwimmerDiscount;

    // ===== SUPABASE FUNKCIJE ZA FINANCE =====

    // Funkcija za pridobivanje stroškov prog po terminih iz baze
    async function getTermCostsFromDB() {
        try {
            const { data, error } = await supabase
                .from('term_costs')
                .select('*');
            
            if (error) throw error;
            
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
    async function getTrainerRatesFromDB() {
        try {
            const { data, error } = await supabase
                .from('trainer_rates')
                .select('*');
            
            if (error) throw error;
            
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
    async function saveTrainerRatesToDB(trainerRates) {
        try {
            const updates = Object.entries(trainerRates).map(([trainerId, rate]) => ({
                trainer_id: trainerId,
                rate_per_session: parseFloat(rate)
            }));

            const { error } = await supabase
                .from('trainer_rates')
                .upsert(updates, { onConflict: 'trainer_id' });

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
            
            if (error) throw error;
            
            // Pretvori v obliko, ki jo pričakuje aplikacija
            const swimmerFees = {};
            data.forEach(item => {
                swimmerFees[item.swimmer_id] = {
                    fee: item.monthly_fee,
                    discount: item.discount
                };
            });
            
            // Če nismo našli pristojbin za točen mesec/leto, poišči najnovejše pristojbine za vsakega plavalca
            if (data.length === 0) {
                console.log(`No fees found for ${month + 1}/${year}, looking for most recent fees...`);
                
                // Pridobi vse plavalce, ki nimajo pristojbin za ta mesec
                const activeSwimmers = swimmers.filter(s => !s.is_deleted);
                const swimmersWithoutFees = activeSwimmers.filter(s => !swimmerFees[s.id]);
                
                if (swimmersWithoutFees.length > 0) {
                    console.log(`Looking for recent fees for ${swimmersWithoutFees.length} swimmers...`);
                    
                    // Za vsakega plavalca poišči najnovejšo pristojbino
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
                            const feeDate = new Date(recentFee.year, recentFee.month, 1);
                            const currentDate = new Date(year, month, 1);
                            
                            if (feeDate <= currentDate) {
                                swimmerFees[swimmer.id] = {
                                    fee: recentFee.monthly_fee,
                                    discount: 0 // Popusti se ne prenašajo na prihodnje mesece
                                };
                                console.log(`Using recent fee for ${swimmer.first_name} ${swimmer.last_name}: ${recentFee.monthly_fee}€ (from ${recentFee.month + 1}/${recentFee.year})`);
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
            console.log('=== DEBUG: All swimmer fees in database ===');
            const { data, error } = await supabase
                .from('swimmer_monthly_fees')
                .select('*')
                .order('year', { ascending: true })
                .order('month', { ascending: true });
            
            if (error) throw error;
            
            console.log('Total fees in database:', data.length);
            data.forEach(fee => {
                const swimmer = swimmers.find(s => s.id === fee.swimmer_id);
                const swimmerName = swimmer ? `${swimmer.first_name} ${swimmer.last_name}` : `Unknown (${fee.swimmer_id})`;
                console.log(`${swimmerName}: ${fee.monthly_fee}€ for ${fee.month + 1}/${fee.year} (discount: ${fee.discount}€)`);
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
        
        // Filtriraj samo aktivne termine za prikaz v nastavitvah
        const activeTermsForSettings = TERMS.filter(term => {
            const termEndDate = new Date(term.date_to);
            const today = new Date();
            return termEndDate >= today;
        });
        
        console.log(`Term costs settings: showing ${activeTermsForSettings.length} active terms out of ${TERMS.length} total terms`);
        
        for (const term of activeTermsForSettings) {
            const cost = termCosts[term.id] || 50; // Default to 50€/uro
            html += `
                <div class="term-cost-row">
                    <label for="term-cost-${term.id}">${term.label}:</label>
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

    // Posodobljena funkcija za renderiranje nastavitev urnih postavk
    async function renderTrainerRatesSettings() {
        if (!elTrainerRatesSettings) return;
        
        const trainerRates = await getTrainerRatesFromDB();
        
        let html = '<div class="trainer-rates-grid">';
        
        for (const trainer of trainers) {
            if (trainer.is_deleted) continue;
            
            const rate = trainerRates[trainer.id] || 25; // Default to 25€/termin
            html += `
                <div class="trainer-rate-row">
                    <label for="trainer-rate-${trainer.id}">${trainer.first_name} ${trainer.last_name}:</label>
                    <input type="number" 
                           id="trainer-rate-${trainer.id}" 
                           value="${rate}" 
                           min="0" 
                           step="0.01" 
                           style="width: 120px;"
                           onchange="updateTrainerRate('${trainer.id}', this.value)">
                    <span>€/termin</span>
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
        
        console.log(`Saving term costs: processing ${activeTermsForSaving.length} active terms out of ${TERMS.length} total terms`);
        
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
        
        const month = parseInt(elSwimmerFeesMonthSelect.value);
        const year = parseInt(elSwimmerFeesYearSelect.value);
        
        if (!month || !year) {
            elSwimmerFeesBox.innerHTML = '<p class="muted">Izberite mesec in leto za upravljanje pristojbin...</p>';
            return;
        }
        
        const swimmerFees = await getSwimmerFeesFromDB(month, year);
        
        let html = `
            <table class="swimmer-fees-table">
                <thead>
                    <tr>
                        <th>Plavalec</th>
                        <th>Termini</th>
                        <th>Mesečna vadnina (€)</th>
                        <th>Popust (€)</th>
                        <th>Končna vadnina (€)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const swimmer of swimmers) {
            if (swimmer.is_deleted) continue;
            
            const feeData = swimmerFees[swimmer.id] || { fee: 80, discount: 0 };
            const finalFee = Math.max(0, feeData.fee - feeData.discount);
            const termLabels = (swimmer.terms || []).map(termId => {
                const term = TERMS.find(t => t.id === termId);
                return term ? term.label : termId;
            }).join(', ');
            
            html += `
                <tr>
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td>${termLabels || 'Brez terminov'}</td>
                    <td>
                        <input type="number" 
                               value="${feeData.fee}" 
                               min="0" 
                               step="0.01" 
                               style="width: 80px;"
                               onchange="updateSwimmerFee('${swimmer.id}', this.value, ${month}, ${year})">
                    </td>
                    <td>
                        <input type="number" 
                               value="${feeData.discount}" 
                               min="0" 
                               step="0.01" 
                               style="width: 80px;"
                               onchange="updateSwimmerDiscount('${swimmer.id}', this.value, ${month}, ${year})">
                    </td>
                    <td><strong>${finalFee.toFixed(2)}€</strong></td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
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
        const trainerRates = await getTrainerRatesFromDB();
        trainerRates[trainerId] = parseFloat(rate);
        
        const success = await saveTrainerRatesToDB(trainerRates);
        if (success && currentSection === 'finance') {
            calculateFinanceData();
        }
    }

    // ===== GLOBALNE FUNKCIJE =====
    window.updateSwimmerFee = updateSwimmerFee;
    window.updateSwimmerDiscount = updateSwimmerDiscount;
    window.updateTermCost = updateTermCost;
    window.updateTrainerRate = updateTrainerRate;
    
                // Funkcija za prenos primera CSV datoteke za termine plavalcev
            window.downloadSwimmerTermsExample = function() {
                const csvContent = `first_name,last_name,terms
            Janez,Novak,"pon-20:00-21:00,sre-20:00-21:00,čet-20:00-21:00"
            Maja,Kovač,"pon-06:15-07:15,čet-06:15-07:15"
            Peter,Horvat,"sre-07:15-08:15,čet-20:00-21:00"
            Ana,Žnidar,"pon-06:15-07:15"
            Marko,Potočnik,"sre-07:15-08:15,čet-06:15-07:15,čet-20:00-21:00"
            Sara,Medvešek,"pon-20:00-21:00,sre-20:00-21:00"
            Luka,Žagar,"čet-06:15-07:15,čet-20:00-21:00"
            Nina,Košir,"pon-06:15-07:15,pon-20:00-21:00"
            Tomaž,Petek,"sre-07:15-08:15"
            Eva,Horvat,"pon-06:15-07:15,sre-07:15-08:15,čet-06:15-07:15"`;

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('download', 'primer_terminov_plavalcev.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

    // ===== FUNKCIJA ZA KOPIRANJE VADNIN IZ PREJŠNEGA MESECA =====
    
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
            
            console.log(`🔄 Začenjam kopiranje vadnin iz ${previousMonth + 1}/${previousYear} v ${currentMonth + 1}/${currentYear}...`);
            
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
                console.log(`Ni vadnin za prejšnji mesec ${previousMonth + 1}/${previousYear}`);
                showMessage(`Ni vadnin za prejšnji mesec ${previousMonth + 1}/${previousYear}!`, 'info');
                return false;
            }
            
            console.log(`Najdenih ${previousMonthFees.length} vadnin iz prejšnega meseca za kopiranje`);
            
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
                console.log('Vse vadnine za trenutni mesec že obstajajo');
                showMessage('Vse vadnine za trenutni mesec že obstajajo!', 'info');
                return true;
            }
            
            console.log(`Ustvarjam ${newFees.length} novih vadnin za trenutni mesec`);
            
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
            
            console.log('✅ Uspešno kopirane vadnine:', insertedFees);
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
            
            console.log(`🔍 Preverjam vadnine za trenutni mesec: ${currentMonth + 1}/${currentYear}`);
            
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
                console.log(`🔄 Ni vadnin za trenutni mesec ${currentMonth + 1}/${currentYear} - poskušam kopirati iz prejšnega meseca...`);
                await copyPreviousMonthFees();
            } else {
                console.log(`✅ Vadnine za trenutni mesec ${currentMonth + 1}/${currentYear} že obstajajo (${currentMonthFees.length} vadnin)`);
            }
            
        } catch (error) {
            console.error('Napaka pri avtomatskem kopiranju vadnin:', error);
        }
    }
    
    // Poveži gumbe za kopiranje in preverjanje vadnin z obstoječimi gumbi v HTML
    function setupCopyFeesButton() {
        const copyButton = document.getElementById('copyFeesBtn');
        const checkButton = document.getElementById('checkFeesStatusBtn');
        
        if (copyButton) {
            copyButton.onclick = copyPreviousMonthFees;
            console.log('✅ Gumb za kopiranje vadnin je povezan');
        } else {
            console.warn('⚠️ Gumb za kopiranje vadnin ni bil najden');
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
            console.log('✅ Gumb za preverjanje stanja vadnin je povezan');
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
            
            console.log(`🔍 Preverjam stanje vadnin za trenutni mesec: ${currentMonth + 1}/${currentYear}...`);
            
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
                console.log(`⚠️ Ni vadnin za trenutni mesec ${currentMonth + 1}/${currentYear}`);
                return { status: 'incomplete', totalFees: 0, missingMonths: [`${currentMonth + 1}/${currentYear}`] };
            } else {
                console.log(`✅ Vadnine za trenutni mesec ${currentMonth + 1}/${currentYear} obstajajo (skupaj ${currentMonthFees.length} vadnin)`);
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
            console.log('🧹 Začenjam čiščenje neveljavnih vadnin...');
            
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
                console.log('✅ Ni neveljavnih vadnin za čiščenje');
                showMessage('Ni neveljavnih vadnin za čiščenje!', 'info');
                return true;
            }
            
            console.log(`🧹 Najdenih ${invalidFees.length} neveljavnih vadnin za brisanje`);
            
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
            
            console.log(`✅ Uspešno izbrisanih ${invalidFees.length} neveljavnih vadnin`);
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
            console.log('🔍 Preverjam integriteto baze podatkov...');
            
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
            
            console.log(`📊 Skupaj vadnin: ${allFees.length}`);
            console.log(`✅ Veljavne vadnine: ${validFees.length}`);
            console.log(`❌ Neveljavne vadnine: ${invalidFees.length}`);
            
            if (invalidFees.length > 0) {
                console.log('Neveljavne vadnine:', invalidFees);
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
                        console.log('🚀 Začenjam avtomatsko kopiranje vadnin...');
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
