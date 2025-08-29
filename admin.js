// Admin stran za upravljanje plavalne šole
document.addEventListener('DOMContentLoaded', () => {
    // Preveri, če je uporabnik prijavljen
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (isLoggedIn !== 'true' || !loginTime) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Preveri, če je login še veljaven (7 dni)
    const loginDate = new Date(parseInt(loginTime));
    const now = new Date();
    const daysDiff = (now - loginDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= 7) {
        // Login je potekel, počisti podatke
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminLoginTime');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Preveri, če je email administrator
    const adminEmail = localStorage.getItem('adminEmail');
    if (adminEmail !== 'uros.jedlovcnik@gmail.com') {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminLoginTime');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Prikaži email administratorja in preostale dni
    const adminInfo = document.getElementById('adminInfo');
    if (adminInfo) {
        const remainingDays = Math.ceil(7 - daysDiff);
        adminInfo.textContent = `Pozdravljeni, ${adminEmail} (login velja še ${remainingDays} dni)`;
    }

    // Konfiguracija Supabase
    const supabaseUrl = 'https://tizjimlwfkoniixbetgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aWxfL5M0Kb_XHEKUBYRYRXKQkdgk';
    
    // Preveri, ali je Supabase na voljo
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase ni na voljo!');
        alert('Napaka: Supabase ni na voljo. Preverite internetno povezavo.');
        return;
    }
    
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Test Supabase povezave
    console.log('Supabase client ustvarjen:', supabase);
    console.log('Supabase URL:', supabaseUrl);

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let trainers = [];
    let attendance = {};
    let termStatus = {};
    let trainerAttendance = {};

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
    
    // UI elementi za pregled terminov
    const elRefreshTermsBtn = document.getElementById("refreshTermsBtn");
    const elTermsBox = document.getElementById("termsBox");
    
    const elEditTermModal = document.getElementById("editTermModal");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
    const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");

    // ===== Pomožne funkcije =====
    function mkSwimmer(first,last,terms=[]){ return { first_name:first, last_name:last, terms:[...new Set(terms)] }; }
    function iso(d){ return d.toISOString().slice(0,10); }
    
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
            
            // Prikaži pregled terminov
            renderTerms();
            
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
        TERMS.forEach(t => {
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
        
        // Filtriraj termine, ki jih plavalec še nima
        const availableTerms = TERMS.filter(term => !swimmer.terms.includes(term.id));
        
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
            if (!t.is_deleted) {
                const option = document.createElement('option');
                option.value = t.id;
                option.textContent = `${t.first_name} ${t.last_name}`;
                elTrainerSelect.appendChild(option);
            }
        });

        // Počisti select za termine pri trenerjih
        elTrainerTermSelect.innerHTML = '<option value="">Izberi termin</option>';
    }

    // Funkcija za posodabljanje select elementa za termine pri dodeljevanju trenerjem
    function updateTermSelectForTrainer(trainerId) {
        elTrainerTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        
        if (!trainerId) return;
        
        if (!trainerId) return;
        
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) return;
        
        // Filtriraj termine, ki jih trener še nima
        const availableTerms = TERMS.filter(term => !trainer.terms.includes(term.id));
        
        availableTerms.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time}-${t.end_time}`;
            elTrainerTermSelect.appendChild(option);
        });
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
                    email: email,
                    terms: [],
                    is_deleted: false
                }])
                .select();

            if (error) {
                console.error('Napaka pri dodajanju trenerja:', error);
                alert('Napaka pri dodajanju trenerja. Preverite konzolo.');
                return;
            }

            // Dodaj v lokalno stanje
            if (data && data.length > 0) {
                trainers.push(data[0]);
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
                renderTerms();
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
            try {
                const { error } = await supabase
                    .from('trainers')
                    .update({ is_deleted: true })
                    .eq('id', trainerId);

                if (error) {
                    console.error('Napaka pri brisanju trenerja:', error);
                    alert('Napaka pri brisanju trenerja. Preverite konzolo.');
                    return;
                }

                // Posodobi lokalno stanje
                trainer.is_deleted = true;
                updateTrainerSelects();
                updateTrainersList();
                alert('Trener uspešno izbrisan.');
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

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Dan</th>
                    <th>Ura</th>
                    <th>Trajanje</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        TERMS.forEach(term => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${DAYNAME[term.day]}</td>
                <td>${term.start_time} - ${term.end_time}</td>
                <td>${formatDate(term.date_from)} - ${formatDate(term.date_to)}</td>
                <td>
                    <button class="btn" onclick="editTerm('${term.id}')" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">
                        Uredi
                    </button>
                    <button class="btn warn" onclick="deleteTerm('${term.id}')" style="font-size: 12px; padding: 4px 8px;">
                        Zbriši
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        elTermList.appendChild(table);
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
                renderTerms(); // Osveži prikaz terminov
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
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
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
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                if (!headers.includes('first_name') || !headers.includes('last_name') || !headers.includes('terms')) {
                    alert('CSV mora vsebovati stolpce: first_name, last_name, terms');
                    return;
                }

                const newSwimmers = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                        const first = values[headers.indexOf('first_name')];
                        const last = values[headers.indexOf('last_name')];
                        const termsStr = values[headers.indexOf('terms')];
                        
                        if (first && last) {
                            const terms = termsStr ? termsStr.split(',').map(t => t.trim()) : [];
                            newSwimmers.push({
                                first_name: first,
                                last_name: last,
                                terms: terms,
                                is_deleted: false
                            });
                        }
                    }
                }

                if (newSwimmers.length > 0) {
                    const { data, error } = await supabase
                        .from('swimmers')
                        .insert(newSwimmers)
                        .select();

                    if (error) {
                        console.error('Napaka pri uvažanju plavalcev:', error);
                        alert('Napaka pri uvažanju plavalcev. Preverite konzolo.');
                        return;
                    }

                    // Dodaj v lokalno stanje
                    if (data) {
                        swimmers.push(...data);
                    }
                    
                    updateSwimmerSelects();
                    updateSwimmersList();
                    alert(`Uvoženih ${newSwimmers.length} plavalcev`);
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
                localStorage.removeItem('adminLoggedIn');
                localStorage.removeItem('adminEmail');
                localStorage.removeItem('adminLoginTime');
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

    // ===== Event listener za osvežitev pregleda terminov =====
    if (elRefreshTermsBtn) {
        elRefreshTermsBtn.addEventListener('click', () => {
            refreshTerms();
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

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        let summary = '<table><thead><tr><th>Trener</th><th>Termin</th><th>Skupaj</th><th>Prisoten</th><th>Odsoten</th><th>% prisotnosti</th></tr></thead><tbody>';
        
        const trainerStats = {};
        
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
                        const key = `${trainer.id}-${term.id}`;
                        if (!trainerStats[key]) {
                            trainerStats[key] = {
                                trainer: trainer,
                                term: term,
                                total: 0,
                                present: 0,
                                absent: 0
                            };
                        }
                        
                        trainerStats[key].total++;
                        
                        const trainerAtt = trainerAttendance[isoDate]?.[term.id]?.[trainer.id];
                        if (trainerAtt) {
                            if (trainerAtt.present === true) {
                                trainerStats[key].present++;
                            } else if (trainerAtt.present === false) {
                                trainerStats[key].absent++;
                            }
                        }
                    });
                }
            });
        }
        
        // Prikaži rezultate
        Object.values(trainerStats).forEach(stat => {
            const percentage = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
            const percentageClass = percentage >= 80 ? 'ok' : percentage >= 60 ? 'neutral' : 'warn';
            
            summary += `
                <tr>
                    <td>${stat.trainer.first_name} ${stat.trainer.last_name}</td>
                    <td>${DAY_SHORT_NAME[stat.term.day]} ${stat.term.start_time}-${stat.term.end_time}</td>
                    <td>${stat.total}</td>
                    <td class="ok">${stat.present}</td>
                    <td class="warn">${stat.absent}</td>
                    <td class="${percentageClass}">${percentage}%</td>
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
                            trainerNotes.push({
                                date: isoDate,
                                term: term,
                                trainer: trainer,
                                note: trainerAtt.note
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
    }

    // ===== FUNKCIJE ZA POVZETEK UDELEŽBE PLAVALCEV =====
    
    // Funkcija za izračun povzetka udeležbe plavalcev
    function calculateSwimmerSummaryData(year, month) {
        const res = {};
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

    // Funkcija za prikaz terminov
    function renderTerms() {
        let html = `<table><thead><tr><th>Dan</th><th>Čas</th><th>Obdobje</th><th>Status</th><th>Akcije</th></tr></thead><tbody>`;
        
        if (TERMS.length === 0) {
            html += `<tr><td colspan="5" class="muted">Ni terminov.</td></tr>`;
        } else {
            TERMS.forEach(term => {
                const dayNames = ["", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
                const dayName = dayNames[term.day] || "Neznano";
                const timeRange = `${term.start_time.slice(0, 5)} - ${term.end_time.slice(0, 5)}`;
                const dateRange = `${formatDate(term.date_from)} - ${formatDate(term.date_to)}`;
                
                html += `<tr>
                    <td>${dayName}</td>
                    <td>${timeRange}</td>
                    <td>${dateRange}</td>
                    <td><span class="status active">Aktiven</span></td>
                    <td>
                        <button class="btn small" onclick="editTerm(${term.id})">Uredi</button>
                        <button class="btn small warn" onclick="deleteTerm(${term.id})">Zbriši</button>
                    </td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        elTermsBox.innerHTML = html;
    }

    // Funkcija za osvežitev pregleda terminov
    async function refreshTerms() {
        // Osveži podatke o terminih
        await loadTerms();
        // Prikaži termin
        renderTerms();
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

    // ===== Inicializacija =====
    loadData();
});
