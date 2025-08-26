// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let attendance = {};
    let termStatus = {};

    const DAYNAME = ["","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota","Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];
    const DAY_SHORT_MAP = {
      "ponedeljek": 1, "pon": 1,
      "torek": 2, "tor": 2,
      "sreda": 3, "sre": 3,
      "cetrtek": 4, "cet": 4,
      "petek": 5, "pet": 5,
      "sobota": 6, "sob": 6,
      "nedelja": 7, "ned": 7
    };

    // ===== UI elementi =====
    const elMonthLabel = document.getElementById("monthLabel");
    const elCalendarGrid = document.getElementById("calendarGrid");
    const elPrev = document.getElementById("prevBtn");
    const elNext = document.getElementById("nextBtn");
    const elSummaryBox = document.getElementById("summaryBox");
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
    const elSwimmerPanel = document.getElementById("swimmerPanel");
    const elSwimmerGrid = document.getElementById("swimmerGrid");
    const elToggleSummaryBtn = document.getElementById("toggleSummaryBtn");
    const elSwimmerSummaryList = document.getElementById("swimmerSummaryList");
    const elRefreshBtn = document.getElementById("refreshBtn");
    const elTermEditModal = document.getElementById("termEditModal");
    const elCloseTermModalBtn = document.getElementById("closeTermModalBtn");
    const elTermEditTitle = document.getElementById("termEditTitle");
    const elModalSwimmerList = document.getElementById("modalSwimmerList");
    const elSwimmerSearch = document.getElementById("swimmerSearch");
    const elCloseTermAndSaveBtn = document.getElementById("closeTermAndSaveBtn");
    const elNoteModal = document.getElementById("noteModal");
    const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
    const elNoteInput = document.getElementById("noteInput");
    const elTermStatusSelect = document.getElementById("termStatusSelect");
    const elTabAttendance = document.getElementById("tabAttendance");
    const elTabAddSwimmers = document.getElementById("tabAddSwimmers");
    const elTabStatus = document.getElementById("tabStatus");
    const elContentAttendance = document.getElementById("contentAttendance");
    const elContentAddSwimmers = document.getElementById("contentAddSwimmers");
    const elContentStatus = document.getElementById("contentStatus");
    const elAvailableSwimmersList = document.getElementById("availableSwimmersList");
    const elAddedSwimmersList = document.getElementById("addedSwimmersList");
    const elAvailableSwimmersSearch = document.getElementById("availableSwimmersSearch");
    const elAddedSwimmersSearch = document.getElementById("addedSwimmersSearch");
    const elAddAllSwimmersBtn = document.getElementById("addAllSwimmersBtn");
    const elRemoveAllSwimmersBtn = document.getElementById("removeAllSwimmersBtn");
    const elPresentSwimmersList = document.getElementById("presentSwimmersList");
    const elSubstituteSwimmersList = document.getElementById("substituteSwimmersList");
    const elExportToolbar = document.getElementById("exportToolbar");
    const elExportSwimmerSelect = document.getElementById("exportSwimmerSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportCSVBtn = document.getElementById("exportCSVBtn");

    // ===== Globalne spremenljivke =====
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null;
    let selectedTermId = null;

    // ===== Supabase init =====
    const SUPABASE_URL = "https://tizjimlwfkoniixbetgr.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MTcxOTc4NDI3OH0.S66lS_x_nL25wG5a20u4sXv1k9B2B6J3K1k7P5FpM4A";
    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ===== Funkcije za nalaganje podatkov =====
    async function fetchData() {
        try {
            // Naložimo termine
            const { data: termsData, error: termsError } = await supabase.from('terms').select('*');
            if (termsError) throw termsError;
            TERMS = termsData;
            
            // ZDAJ NALOŽIMO VSE PLAVALCE, DA ZADRŽIMO ZGODOVINSKE PODATKE
            const { data: swimmersData, error: swimmersError } = await supabase.from('swimmers').select('*');
            if (swimmersError) throw swimmersError;
            swimmers = swimmersData;
            
            const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*');
            if (attendanceError) throw attendanceError;
            attendance = attendanceData.reduce((acc, row) => {
              acc[row.date] = acc[row.date] || {};
              acc[row.date][row.term_id] = acc[row.date][row.term_id] || {};
              acc[row.date][row.term_id][row.swimmer_id] = row.status;
              return acc;
            }, {});
            
            const { data: statusData, error: statusError } = await supabase.from('term_status').select('*');
            if (statusError) throw statusError;
            termStatus = statusData.reduce((acc, row) => {
              acc[row.date] = acc[row.date] || {};
              acc[row.date][row.term_id] = { status: row.status, note: row.note };
              return acc;
            }, {});

            populateExportSelects();
            refreshSwimmerPanel();
            renderMonth();

        } catch (error) {
            console.error("Napaka pri nalaganju podatkov:", error.message);
        }
    }

    // ===== Funkcije za prikaz koledarja =====
    function renderMonth() {
        elCalendarGrid.innerHTML = '';
        elMonthLabel.textContent = new Date(currentYear, currentMonth).toLocaleString('sl-SI', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ponedeljek = 0, Nedelja = 6

        // Dodajanje praznih celic za poravnavo
        for (let i = 0; i < firstDayIndex; i++) {
            elCalendarGrid.innerHTML += '<div></div>';
        }
        
        const today = new Date();

        for (let i = 1; i <= numDays; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dateString = date.toISOString().slice(0, 10);
            const dayOfWeek = date.getDay(); // 0 = nedelja, 1 = ponedeljek ...

            const hasActiveTerm = TERMS.some(term => {
                const termDay = DAY_SHORT_MAP[term.day.toLowerCase()];
                return termDay === dayOfWeek;
            });

            const hasAttendance = attendance[dateString] && Object.keys(attendance[dateString]).length > 0;
            const termStatusForDate = termStatus[dateString];

            let cellClass = 'day-cell';
            if (date.toDateString() === today.toDateString()) {
                cellClass += ' today';
            }
            if (!hasActiveTerm) {
                cellClass += ' inactive';
            }

            let termIndicator = '';
            if (hasActiveTerm) {
                if (termStatusForDate) {
                    const status = Object.values(termStatusForDate)[0].status;
                    if (status === 'active') {
                        termIndicator = `<span class="term-status-badge active">Aktiven</span>`;
                    } else if (status === 'cancelled') {
                        termIndicator = `<span class="term-status-badge warn">Odpovedan</span>`;
                    } else if (status === 'inactive') {
                        termIndicator = `<span class="term-status-badge mut">Neaktiven</span>`;
                    }
                } else {
                    termIndicator = `<span class="term-status-badge active">Aktiven</span>`;
                }
            }
            
            let swimmersIndicator = '';
            if (hasAttendance) {
                const swimmerIds = Object.values(attendance[dateString]).flatMap(term => Object.keys(term));
                const presentSwimmers = swimmers.filter(sw => swimmerIds.includes(String(sw.id)) && attendance[dateString][Object.keys(attendance[dateString])[0]][sw.id] === 'present').length;
                const substituteSwimmers = swimmers.filter(sw => swimmerIds.includes(String(sw.id)) && attendance[dateString][Object.keys(attendance[dateString])[0]][sw.id] === 'substitute').length;

                swimmersIndicator = `<div class="swimmers-count-info">${presentSwimmers} plavalcev</div>`;
                if (substituteSwimmers > 0) {
                    swimmersIndicator += `<div class="substitutes-count-info">${substituteSwimmers} nadomestki</div>`;
                }
            }


            elCalendarGrid.innerHTML += `
                <div class="${cellClass}" data-date="${dateString}">
                    <div class="date">${i}</div>
                    ${swimmersIndicator}
                </div>
            `;
        }
        
        addDayCellListeners();
    }

    function addDayCellListeners() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            if (!cell.classList.contains('inactive')) {
                cell.addEventListener('click', () => {
                    selectedDate = cell.dataset.date;
                    openTermModal(selectedDate);
                });
            }
        });
    }

    async function openTermModal(dateString) {
        selectedDate = dateString;
        const dateObj = new Date(dateString);
        const dayOfWeek = dateObj.getDay();
        const term = TERMS.find(t => DAY_SHORT_MAP[t.day.toLowerCase()] === (dayOfWeek === 0 ? 7 : dayOfWeek));
        
        if (!term) return; // Ni termina na ta dan

        selectedTermId = term.id;
        elTermEditTitle.textContent = `${DAYNAME[dayOfWeek === 0 ? 7 : dayOfWeek]}, ${dateObj.getDate()}. ${dateObj.toLocaleString('sl-SI', { month: 'long' })}`;
        
        await updateModalContent();
        
        elTermEditModal.style.display = 'block';
    }

    async function updateModalContent() {
        if (!selectedDate || !selectedTermId) return;

        const dateAttendance = attendance[selectedDate] && attendance[selectedDate][selectedTermId] ? attendance[selectedDate][selectedTermId] : {};
        const presentSwimmers = [];
        const substituteSwimmers = [];
        const absentSwimmers = [];

        swimmers.forEach(swimmer => {
            const status = dateAttendance[swimmer.id] || 'absent';
            if (status === 'present') {
                presentSwimmers.push(swimmer);
            } else if (status === 'substitute') {
                substituteSwimmers.push(swimmer);
            } else {
                absentSwimmers.push(swimmer);
            }
        });

        // Prikaz prisotnih
        elModalSwimmerList.innerHTML = '';
        const allSwimmersList = [...presentSwimmers, ...substituteSwimmers, ...absentSwimmers];
        
        // Prikaz nadomestkov spodaj
        presentSwimmers.sort((a,b) => a.name.localeCompare(b.name)).forEach(swimmer => {
            elModalSwimmerList.innerHTML += createSwimmerItem(swimmer, 'present');
        });
        
        elModalSwimmerList.innerHTML += `<hr style="margin: 10px 0;">`;
        elModalSwimmerList.innerHTML += `<div style="font-weight: bold; margin-bottom: 5px;">Nadomestki</div>`;

        substituteSwimmers.sort((a,b) => a.name.localeCompare(b.name)).forEach(swimmer => {
            elModalSwimmerList.innerHTML += createSwimmerItem(swimmer, 'substitute');
        });

        elSwimmerSearch.value = '';
        elSwimmerSearch.dispatchEvent(new Event('input'));
        
        // Prikaz seznama plavalcev za dodajanje
        updateSwimmerList(presentSwimmers, substituteSwimmers);
        
        // Prikaz statusov
        const termStatusInfo = termStatus[selectedDate] && termStatus[selectedDate][selectedTermId] ? termStatus[selectedDate][selectedTermId] : {status: 'active', note: ''};
        elTermStatusSelect.value = termStatusInfo.status;
        elNoteInput.value = termStatusInfo.note;

        // Prikaz prisotnih in nadomestkov v zavihku 'Status'
        elPresentSwimmersList.innerHTML = '';
        presentSwimmers.sort((a,b) => a.name.localeCompare(b.name)).forEach(swimmer => {
            elPresentSwimmersList.innerHTML += `<div class="modal-swimmer-list-item"><span>${swimmer.name}</span></div>`;
        });
        elSubstituteSwimmersList.innerHTML = '';
        substituteSwimmers.sort((a,b) => a.name.localeCompare(b.name)).forEach(swimmer => {
            elSubstituteSwimmersList.innerHTML += `<div class="modal-swimmer-list-item"><span>${swimmer.name}</span></div>`;
        });
    }
    
    function createSwimmerItem(swimmer, currentStatus) {
        return `
            <div class="modal-swimmer-list-item" data-swimmer-id="${swimmer.id}">
                <span class="swimmer-name">${swimmer.name}</span>
                <select class="status-select">
                    <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>Prisoten</option>
                    <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>Odsoten</option>
                    <option value="substitute" ${currentStatus === 'substitute' ? 'selected' : ''}>Nadomešča</option>
                </select>
            </div>
        `;
    }
    
    async function updateSwimmerList(presentSwimmers, substituteSwimmers) {
        const addedSwimmers = [...presentSwimmers, ...substituteSwimmers];
        const addedSwimmerIds = new Set(addedSwimmers.map(s => s.id));
        const availableSwimmers = swimmers.filter(sw => !addedSwimmerIds.has(sw.id));
        
        const renderList = (list, element, filterText) => {
            element.innerHTML = '';
            const filteredList = list.filter(sw => sw.name.toLowerCase().includes(filterText.toLowerCase()));
            filteredList.forEach(sw => {
                const isAdded = addedSwimmerIds.has(sw.id);
                element.innerHTML += `
                    <div class="swimmer-item" data-swimmer-id="${sw.id}" data-is-added="${isAdded}">
                        <span>${sw.name}</span>
                        <div class="modal-swimmer-actions">
                            ${!isAdded ? `<button class="btn pri add-swimmer-btn">Dodaj</button>` : `<button class="btn warn remove-swimmer-btn">Odstrani</button>`}
                            ${!isAdded ? `<button class="btn ok add-substitute-btn">Nadomestek</button>` : ''}
                        </div>
                    </div>
                `;
            });
        };
        
        renderList(availableSwimmers, elAvailableSwimmersList, elAvailableSwimmersSearch.value);
        renderList(addedSwimmers, elAddedSwimmersList, elAddedSwimmersSearch.value);
    }
    
    elAvailableSwimmersSearch.addEventListener('input', () => updateSwimmerList(
        swimmers.filter(s => attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'present' || attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'substitute'),
        []
    ));
    elAddedSwimmersSearch.addEventListener('input', () => updateSwimmerList(
        swimmers.filter(s => attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'present' || attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'substitute'),
        []
    ));

    elAvailableSwimmersList.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('add-swimmer-btn')) {
            const swimmerItem = target.closest('.swimmer-item');
            const swimmerId = swimmerItem.dataset.swimmerId;
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmerId, 'present');
            await updateModalContent();
        } else if (target.classList.contains('add-substitute-btn')) {
            const swimmerItem = target.closest('.swimmer-item');
            const swimmerId = swimmerItem.dataset.swimmerId;
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmerId, 'substitute');
            await updateModalContent();
        }
    });

    elAddedSwimmersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-swimmer-btn')) {
            const swimmerItem = e.target.closest('.swimmer-item');
            const swimmerId = swimmerItem.dataset.swimmerId;
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmerId, 'absent');
            await updateModalContent();
        }
    });

    elAddAllSwimmersBtn.addEventListener('click', async () => {
        for (const swimmer of swimmers) {
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmer.id, 'present');
        }
        await updateModalContent();
    });

    elRemoveAllSwimmersBtn.addEventListener('click', async () => {
        for (const swimmer of swimmers) {
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmer.id, 'absent');
        }
        await updateModalContent();
    });

    elModalSwimmerList.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-select')) {
            const selectElement = e.target;
            const swimmerItem = selectElement.closest('.modal-swimmer-list-item');
            const swimmerId = swimmerItem.dataset.swimmerId;
            const newStatus = selectElement.value;
            await saveAttendanceStatus(selectedDate, selectedTermId, swimmerId, newStatus);
            await updateModalContent();
        }
    });

    async function saveAttendanceStatus(date, termId, swimmerId, status) {
        const existingStatus = attendance[date]?.[termId]?.[swimmerId];

        if (existingStatus === status) {
            return;
        }

        if (status === 'absent' || status === 'substitute') {
            await supabase.from('attendance')
                .upsert([{ date, term_id: termId, swimmer_id: swimmerId, status }], { onConflict: ['date', 'term_id', 'swimmer_id'] });
        } else {
            await supabase.from('attendance')
                .upsert([{ date, term_id: termId, swimmer_id: swimmerId, status }], { onConflict: ['date', 'term_id', 'swimmer_id'] });
        }
        
        attendance[date] = attendance[date] || {};
        attendance[date][termId] = attendance[date][termId] || {};
        attendance[date][termId][swimmerId] = status;
        
        // Ponovno naloži podatke, da so posodobljene vse komponente
        await fetchData();
    }


    elCloseTermModalBtn.addEventListener('click', () => {
        elTermEditModal.style.display = 'none';
        selectedDate = null;
        selectedTermId = null;
    });

    elCloseTermAndSaveBtn.addEventListener('click', async () => {
        const newStatus = elTermStatusSelect.value;
        const newNote = elNoteInput.value.trim();

        if (newStatus === 'inactive' || newStatus === 'cancelled') {
            if (newNote === '') {
                elNoteModal.style.display = 'block';
                return;
            }
        }
        await saveTermStatus(selectedDate, selectedTermId, newStatus, newNote);
        elTermEditModal.style.display = 'none';
        selectedDate = null;
        selectedTermId = null;
        renderMonth();
    });
    
    elCloseNoteModalBtn.addEventListener('click', () => elNoteModal.style.display = 'none');
    elCancelNoteBtn.addEventListener('click', () => elNoteModal.style.display = 'none');
    
    elConfirmNoteBtn.addEventListener('click', async () => {
        const newNote = elNoteInput.value.trim();
        if (newNote !== '') {
            await saveTermStatus(selectedDate, selectedTermId, elTermStatusSelect.value, newNote);
            elNoteModal.style.display = 'none';
            elTermEditModal.style.display = 'none';
            selectedDate = null;
            selectedTermId = null;
            renderMonth();
        } else {
            alert("Prosim, vnesite opombo.");
        }
    });

    async function saveTermStatus(date, termId, status, note) {
        const { data, error } = await supabase.from('term_status')
            .upsert([{ date, term_id: termId, status, note }], { onConflict: ['date', 'term_id'] });
        if (error) {
            console.error('Napaka pri shranjevanju statusa:', error);
        } else {
            termStatus[date] = termStatus[date] || {};
            termStatus[date][termId] = { status, note };
        }
    }

    // ===== Funkcije za povzetek in plavalce =====
    function refreshSwimmerPanel() {
        elSwimmerGrid.innerHTML = '';
        swimmers.forEach(swimmer => {
            const swimmerElement = document.createElement('div');
            swimmerElement.className = 'swimmer-card';
            swimmerElement.dataset.swimmerId = swimmer.id;
            swimmerElement.innerHTML = `
                <div class="name">${swimmer.name}</div>
                <div class="terms-count">Št. obiskov: ${swimmer.total_terms}</div>
            `;
            elSwimmerGrid.appendChild(swimmerElement);
        });
    }

    function getSummaryForSwimmer(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        let attended = 0;
        let possible = 0;
        let substitutes = 0;

        for (const date in attendance) {
            for (const termId in attendance[date]) {
                const status = attendance[date][termId][swimmerId];
                if (status === 'present') {
                    attended++;
                    possible++;
                } else if (status === 'substitute') {
                    attended++;
                    substitutes++;
                } else if (status === 'absent') {
                    possible++;
                }
            }
        }

        const termDays = new Set(TERMS.map(t => DAY_SHORT_MAP[t.day.toLowerCase()]));
        let totalPossibleTerms = 0;
        
        for (let y = currentYear - 1; y <= currentYear + 1; y++) {
            for (let m = 0; m < 12; m++) {
                const numDays = new Date(y, m + 1, 0).getDate();
                for (let d = 1; d <= numDays; d++) {
                    const date = new Date(y, m, d);
                    const dayOfWeek = date.getDay();
                    if (termDays.has(dayOfWeek === 0 ? 7 : dayOfWeek)) {
                        totalPossibleTerms++;
                    }
                }
            }
        }

        // Popravi izračun možnih terminov, da ne vključujejo nadomeščanja
        let actualPossibleTerms = totalPossibleTerms;
        for (const date in attendance) {
            for (const termId in attendance[date]) {
                if (attendance[date][termId][swimmerId] === 'substitute') {
                    actualPossibleTerms--;
                }
            }
        }
        
        const attendancePercentage = actualPossibleTerms > 0 ? ((attended - substitutes) / actualPossibleTerms) * 100 : 0;
        const totalAttendance = attended - substitutes;

        return {
            name: swimmer.name,
            attended: totalAttendance,
            possible: actualPossibleTerms,
            percentage: attendancePercentage.toFixed(2),
            substitutes: substitutes
        };
    }

    function renderSummary() {
        elSwimmerSummaryList.innerHTML = '';
        swimmers.forEach(swimmer => {
            const summary = getSummaryForSwimmer(swimmer.id);
            const statusClass = summary.percentage >= 70 ? 'swimmer-active' : 'swimmer-inactive';
            const attendedCount = summary.attended;
            const possibleCount = summary.possible;
            const percentage = summary.percentage;
            const substitutes = summary.substitutes;
            
            elSwimmerSummaryList.innerHTML += `
                <li class="${statusClass}">
                    <div class="swimmer-name">${summary.name}</div>
                    <div class="swimmer-summary-details">
                        <p>Prisotnost: ${attendedCount} / ${possibleCount} (${percentage}%)</p>
                        ${substitutes > 0 ? `<p>Nadomeščanja: ${substitutes}</p>` : ''}
                    </div>
                </li>
            `;
        });
    }

    // ===== Poslušalci dogodkov =====
    elPrev.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderMonth();
    });

    elNext.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderMonth();
    });

    elRefreshBtn.addEventListener('click', fetchData);
    elToggleSummaryBtn.addEventListener('click', () => {
        if (elSummaryBox.style.display === 'none') {
            renderSummary();
            elSummaryBox.style.display = 'block';
        } else {
            elSummaryBox.style.display = 'none';
        }
    });

    // Zavihek
    document.getElementById('tabAttendance').addEventListener('click', () => showTab('attendance'));
    document.getElementById('tabAddSwimmers').addEventListener('click', () => showTab('addSwimmers'));
    document.getElementById('tabStatus').addEventListener('click', () => showTab('status'));
    
    function showTab(tabName) {
        document.querySelectorAll('.tab-container button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));

        document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
        document.getElementById(`content${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
        
        if (tabName === 'addSwimmers') {
            updateSwimmerList(
                swimmers.filter(s => attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'present' || attendance[selectedDate]?.[selectedTermId]?.[s.id] === 'substitute'),
                []
            );
        }
    }
    
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentMonth = new Date().getMonth();
        currentYear = new Date().getFullYear();
        renderMonth();
    });

    // Prikaz in skrivanje povzetka glede na stiskanje na gumb
    elToggleSummaryBtn.addEventListener('click', () => {
        const isVisible = elSummaryBox.style.display === 'block';
        elSummaryBox.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            renderSummary();
        }
    });
    
    // Eksport CSV
    function populateExportSelects() {
        const swimmersHtml = swimmers.map(sw => `<option value="${sw.id}">${sw.name}</option>`).join('');
        elExportSwimmerSelect.innerHTML = `<option value="all">Vsi plavalci</option>` + swimmersHtml;
        const currentYear = new Date().getFullYear();
        const yearHtml = `<option value="all">Vsa leta</option>` + Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => `<option value="${y}">${y}</option>`).join('');
        elExportYearSelect.innerHTML = yearHtml;
        const monthHtml = `<option value="all">Vsi meseci</option>` + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${new Date(0, i).toLocaleString('sl-SI', { month: 'long' })}</option>`).join('');
        elExportMonthSelect.innerHTML = monthHtml;
    }

    elExportCSVBtn.addEventListener('click', async () => {
        const selectedSwimmerId = elExportSwimmerSelect.value;
        const selectedYear = elExportYearSelect.value;
        const selectedMonth = elExportMonthSelect.value;

        const filteredAttendance = {};
        for (const date in attendance) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            
            const matchesYear = selectedYear === 'all' || year === parseInt(selectedYear);
            const matchesMonth = selectedMonth === 'all' || month === parseInt(selectedMonth);

            if (matchesYear && matchesMonth) {
                filteredAttendance[date] = attendance[date];
            }
        }

        let csvContent = "Datum,Termin,Plavalec,Status\n";
        
        for (const date in filteredAttendance) {
            for (const termId in filteredAttendance[date]) {
                for (const swimmerId in filteredAttendance[date][termId]) {
                    const swimmer = swimmers.find(s => s.id === parseInt(swimmerId));
                    const term = TERMS.find(t => t.id === parseInt(termId));
                    
                    if (selectedSwimmerId === 'all' || swimmerId === selectedSwimmerId) {
                        const status = filteredAttendance[date][termId][swimmerId];
                        csvContent += `${date},"${term ? term.name : 'Neznan'}","${swimmer ? swimmer.name : 'Neznan'}",${status}\n`;
                    }
                }
            }
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "podatki_prisotnosti.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Zagon ob nalaganju
    fetchData();
});