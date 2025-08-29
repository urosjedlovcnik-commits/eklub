// Admin stran za upravljanje plavalne šole
document.addEventListener('DOMContentLoaded', () => {

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let attendance = {};
    let termStatus = {};

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
    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDateFrom = document.getElementById("newTermDateFrom");
    const elNewTermDateTo = document.getElementById("newTermDateTo");
    const elAddTermBtn = document.getElementById("addTermBtn");
    const elTermList = document.getElementById("termList");
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
            // Naloži termine
            const termsData = localStorage.getItem('terms');
            if (termsData) {
                TERMS = JSON.parse(termsData);
            }

            // Naloži plavalce
            const swimmersData = localStorage.getItem('swimmers');
            if (swimmersData) {
                swimmers = JSON.parse(swimmersData);
            }

            // Naloži prisotnost
            const attendanceData = localStorage.getItem('attendance');
            if (attendanceData) {
                attendance = JSON.parse(attendanceData);
            }

            // Naloži status terminov
            const termStatusData = localStorage.getItem('termStatus');
            if (termStatusData) {
                termStatus = JSON.parse(termStatusData);
            }

            // Posodobi UI
            updateSwimmerSelects();
            updateTermSelects();
            updateSwimmersList();
            updateTermList();
            updateExportSelects();

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
                const termsText = swimmer.terms.map(termId => {
                    const term = TERMS.find(t => t.id === termId);
                    return term ? `${DAY_SHORT_NAME[term.day]} ${term.start_time}-${term.end_time}` : termId;
                }).join(', ');

                row.innerHTML = `
                    <td>${swimmer.first_name}</td>
                    <td>${swimmer.last_name}</td>
                    <td>${termsText || 'Brez terminov'}</td>
                    <td>
                        <button class="btn warn" onclick="deleteSwimmer('${swimmer.id}')" style="font-size: 12px; padding: 4px 8px;">
                            Zbriši
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });

        elSwimmersList.appendChild(table);
    }

    // ===== Dodajanje plavalcev =====
    elAddSwimmerBtn.addEventListener('click', () => {
        const first = elNewFirst.value.trim();
        const last = elNewLast.value.trim();
        
        if (!first || !last) {
            alert('Prosim vnesite ime in priimek');
            return;
        }

        const newSwimmer = {
            id: 'swimmer_' + Date.now(),
            first_name: first,
            last_name: last,
            terms: [],
            is_deleted: false
        };

        swimmers.push(newSwimmer);
        localStorage.setItem('swimmers', JSON.stringify(swimmers));
        
        elNewFirst.value = '';
        elNewLast.value = '';
        
        updateSwimmerSelects();
        updateSwimmersList();
        elSwimmerInfo.textContent = `Dodan plavalec: ${first} ${last}`;
        
        setTimeout(() => {
            elSwimmerInfo.textContent = '';
        }, 3000);
    });

    // ===== Dodeljevanje terminov =====
    elAssignTermBtn.addEventListener('click', () => {
        const swimmerId = elSwimmerSelect.value;
        const termId = elTermSelect.value;
        
        if (!swimmerId || !termId) {
            alert('Prosim izberite plavalca in termin');
            return;
        }

        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (swimmer) {
            if (!swimmer.terms.includes(termId)) {
                swimmer.terms.push(termId);
                localStorage.setItem('swimmers', JSON.stringify(swimmers));
                updateSwimmersList();
                elSwimmerInfo.textContent = `Termin dodeljen plavalcu ${swimmer.first_name} ${swimmer.last_name}`;
                
                setTimeout(() => {
                    elSwimmerInfo.textContent = '';
                }, 3000);
            } else {
                elSwimmerInfo.textContent = 'Plavalec že ima ta termin';
                setTimeout(() => {
                    elSwimmerInfo.textContent = '';
                }, 3000);
            }
        }
    });

    // ===== Brisanje plavalcev =====
    window.deleteSwimmer = function(swimmerId) {
        if (confirm('Ali ste prepričani, da želite zbrisati tega plavalca?')) {
            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer) {
                swimmer.is_deleted = true;
                localStorage.setItem('swimmers', JSON.stringify(swimmers));
                updateSwimmerSelects();
                updateSwimmersList();
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
                    <button class="btn" onclick="editTerm('${term.id}')" style="font-size: 12px; padding: 4px 8px;">
                        Uredi
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        elTermList.appendChild(table);
    }

    // ===== Dodajanje terminov =====
    elAddTermBtn.addEventListener('click', () => {
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
        
        const newTerm = {
            id: termId,
            day: day,
            start_time: start,
            end_time: end,
            date_from: dateFrom,
            date_to: dateTo
        };

        TERMS.push(newTerm);
        localStorage.setItem('terms', JSON.stringify(TERMS));
        
        // Počisti polja
        elNewTermDay.value = '1';
        elNewTermStart.value = '';
        elNewTermEnd.value = '';
        elNewTermDateFrom.value = '';
        elNewTermDateTo.value = '';
        
        updateTermSelects();
        updateTermList();
        updateSwimmersList();
    });

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

    elSaveEditTermBtn.addEventListener('click', () => {
        const termId = elEditTermModal.getAttribute('data-term-id');
        const dateFrom = parseDate(elEditTermDateFrom.value);
        const dateTo = parseDate(elEditTermDateTo.value);
        
        if (!dateFrom || !dateTo) {
            alert('Prosim vnesite veljavna datuma');
            return;
        }

        const term = TERMS.find(t => t.id === termId);
        if (term) {
            term.date_from = dateFrom;
            term.date_to = dateTo;
            localStorage.setItem('terms', JSON.stringify(TERMS));
            updateTermList();
            updateSwimmersList();
            elEditTermModal.style.display = 'none';
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
    elCsvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
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
                                id: 'swimmer_' + Date.now() + '_' + i,
                                first_name: first,
                                last_name: last,
                                terms: terms,
                                is_deleted: false
                            });
                        }
                    }
                }

                swimmers.push(...newSwimmers);
                localStorage.setItem('swimmers', JSON.stringify(swimmers));
                
                updateSwimmerSelects();
                updateSwimmersList();
                alert(`Uvoženih ${newSwimmers.length} plavalcev`);
                
            } catch (error) {
                alert('Napaka pri branju CSV datoteke: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // CSV uvoz terminov
    elCsvTermsInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
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

                // Zamenjaj obstoječe termine z istim ID-jem
                newTerms.forEach(newTerm => {
                    const existingIndex = TERMS.findIndex(t => t.id === newTerm.id);
                    if (existingIndex >= 0) {
                        TERMS[existingIndex] = newTerm;
                    } else {
                        TERMS.push(newTerm);
                    }
                });

                localStorage.setItem('terms', JSON.stringify(TERMS));
                
                updateTermSelects();
                updateTermList();
                updateSwimmersList();
                alert(`Uvoženih ${newTerms.length} terminov`);
                
            } catch (error) {
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

    // ===== Inicializacija =====
    loadData();
});
