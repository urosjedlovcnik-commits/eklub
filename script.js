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
    const elAddSwimmerBtn = document.getElementById("addSwimmerBtn");
    const elSwimmerSelect = document.getElementById("swimmerSelect");
    const elSwimmerInfo = document.getElementById("swimmerInfo");
    const elTermSelect = document.getElementById("termSelect");
    const elAssignTermBtn = document.getElementById("assignTermBtn");
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn");
    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDateFrom = document.getElementById("newTermDateFrom");
    const elNewTermDateTo = document.getElementById("newTermDateTo");
    const elAddTermBtn = document.getElementById("addTermBtn");
    const elTermList = document.getElementById("termList");
    const elCsvInput = document.getElementById("csvInput");
    const elCsvTermsInput = document.getElementById("csvTermsInput");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");

    // Modali
    const elEventModal = document.getElementById("eventModal");
    const elDayModal = document.getElementById("dayModal");
    const elNoteModal = document.getElementById("noteModal");
    const elEditTermModal = document.getElementById("editTermModal");

    const elModalTitle = document.getElementById("modalTitle");
    const elModalMeta = document.getElementById("modalMeta");
    const elAttendanceTable = document.getElementById("attendanceTable");
    const elModalSwimmerSelect = document.getElementById("modalSwimmerSelect");
    const elAddToEventBtn = document.getElementById("addToEventBtn");
    const elNotesInput = document.getElementById("notesInput");
    const elSaveNotesBtn = document.getElementById("saveNotesBtn");
    const elToggleEventBtn = document.getElementById("toggleEventBtn");
    const elInactiveNote = document.getElementById("inactiveNote");

    const elNoteInput = document.getElementById("noteInput");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");

    const elDayModalTitle = document.getElementById("dayModalTitle");
    const elDayModalList = document.getElementById("dayModalList");
    
    const elEditTermModalTitle = document.getElementById("editTermModalTitle");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");


    // ===== globalno stanje in spremenljivke =====
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedEvent = null; // Shranjuje term_id in datum dogodka v modalnem oknu
    let selectedDay = null;
    let selectedSwimmerId = null;
    let selectedTermToEdit = null;

    // Supabase
    const { createClient } = window.supabase;
    const supabaseUrl = 'https://tizjimlwfkoniixbetgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aWxfL5M0Kb_XHEKUBYRYRXKQkdgk';
    const supabase = createClient(supabaseUrl, supabaseKey);


    // ===== Pomožne funkcije =====

    // Pomožna funkcija za formatiranje datuma
    const formatDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatDateForDisplay = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}. ${month}. ${year}`;
    }
    
    // Funkcija za preverjanje, ali je datum v prihodnosti
    const isFutureDate = (date) => {
        const today = new Date();
        const eventDate = new Date(date);
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate > today;
    }

    // Funkcija za preverjanje, ali je datum v dosegu termina
    const isDateInRange = (date, term) => {
      const termFrom = new Date(term.date_from);
      const termTo = new Date(term.date_to);
      const checkDate = new Date(date);
      checkDate.setHours(0,0,0,0);
      termFrom.setHours(0,0,0,0);
      termTo.setHours(0,0,0,0);
      return checkDate >= termFrom && checkDate <= termTo;
    };


    const refreshSwimmerPanel = () => {
        // Počistimo obstoječe elemente
        elSwimmerSelect.innerHTML = '<option value="">Izberi plavalca</option>';
        elTermSelect.innerHTML = '<option value="">Izberi termin</option>';
        elSwimmerInfo.innerHTML = '';
        elAssignTermBtn.disabled = true;
        elDeleteSwimmerBtn.disabled = true;
        
        // Napolnimo izbirnik plavalcev
        swimmers.sort((a,b) => a.last_name.localeCompare(b.last_name)).forEach(swimmer => {
            const option = document.createElement('option');
            option.value = swimmer.id;
            option.textContent = `${swimmer.first_name} ${swimmer.last_name}`;
            elSwimmerSelect.appendChild(option);
        });

        // Napolnimo izbirnik terminov
        TERMS.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = `${DAYNAME[term.day]} ${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`;
            elTermSelect.appendChild(option);
        });
    };

    const refreshTermPanel = () => {
        elTermList.innerHTML = '';
        TERMS.forEach(term => {
            const div = document.createElement('div');
            div.className = 'term-item';
            div.setAttribute('data-term-id', term.id);

            const termInfo = document.createElement('div');
            termInfo.className = 'term-item-info';
            termInfo.innerHTML = `
                <span class="term-item-label">${DAYNAME[term.day]} ${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}</span>
                <span class="term-item-dates">${formatDateForDisplay(term.date_from)} - ${formatDateForDisplay(term.date_to)}</span>
            `;
            div.appendChild(termInfo);

            const actions = document.createElement('div');
            actions.className = 'term-item-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn neutral edit-term-btn';
            editBtn.textContent = 'Uredi';
            editBtn.onclick = () => showEditTermModal(term.id);
            actions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn warn-btn remove-btn';
            deleteBtn.textContent = 'Izbriši';
            deleteBtn.onclick = () => deleteTerm(term.id);
            actions.appendChild(deleteBtn);

            div.appendChild(actions);
            elTermList.appendChild(div);
        });
    };
    
    const showEditTermModal = (termId) => {
        selectedTermToEdit = TERMS.find(t => t.id === termId);
        if (selectedTermToEdit) {
            elEditTermModalTitle.textContent = `Uredi termin: ${DAYNAME[selectedTermToEdit.day]} ${selectedTermToEdit.start_time.slice(0, 5)}-${selectedTermToEdit.end_time.slice(0, 5)}`;
            elEditTermDateFrom.value = formatDateForDisplay(selectedTermToEdit.date_from);
            elEditTermDateTo.value = formatDateForDisplay(selectedTermToEdit.date_to);
            elEditTermModal.style.display = 'flex';
        }
    };
    
    // Funkcija za posodobitev stanja in ponovno izrisovanje
    const updateStateAndRender = async () => {
        try {
            const { data: termsData, error: termsError } = await supabase.from('terms').select('*');
            if (termsError) throw termsError;
            TERMS = termsData;

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

            const { data: statusData, error: statusError } = await supabase.from('term_status').select('date, term_id, status, note, notes');
            if (statusError) throw statusError;
            termStatus = statusData.reduce((acc, row) => {
              acc[row.date] = acc[row.date] || {};
              acc[row.date][row.term_id] = { status: row.status, note: row.note, notes: row.notes };
              return acc;
            }, {});

            populateExportSelects();
            refreshSwimmerPanel();
            refreshTermPanel();
            renderMonth();
            renderSummary();
            closeModal();
            closeDayModal();
            closeNoteModal();
            closeEditTermModal();
        } catch (error) {
            console.error("Napaka pri nalaganju podatkov:", error.message);
        }
    };


    const renderMonth = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const monthName = firstDayOfMonth.toLocaleString('sl-SI', { month: 'long' });
        elMonthLabel.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${currentYear}`;

        elCalendarGrid.innerHTML = '';

        // Prazni dnevi na začetku
        for (let i = 1; i < startingDayOfWeek; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('day', 'disabled');
            elCalendarGrid.appendChild(emptyDiv);
        }

        // Dnevi v mesecu
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const formattedDate = formatDate(date);
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');
            dayDiv.setAttribute('data-date', formattedDate);
            
            // Če je danes, dodaj razred
            if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                dayDiv.classList.add('today');
            }
            
            const numSpan = document.createElement('span');
            numSpan.classList.add('num');
            numSpan.textContent = day;
            dayDiv.appendChild(numSpan);
            
            const activeTermsForDay = TERMS.filter(term => {
                const termDay = parseInt(term.day, 10);
                const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
                return termDay === dayOfWeek && isDateInRange(date, term);
            });

            const hasActiveTerms = activeTermsForDay.length > 0;
            const dailyEvents = {};

            if (hasActiveTerms) {
                activeTermsForDay.forEach(term => {
                    dailyEvents[term.id] = term;
                });
            }

            const eventsOnThisDay = Object.keys(dailyEvents).length;
            let eventsRendered = 0;

            for (const termId in dailyEvents) {
                const term = dailyEvents[termId];
                
                // Preverimo, ali je termin sploh aktiven za ta datum
                if (!isDateInRange(date, term)) {
                    continue;
                }

                if (eventsRendered < 3) {
                    const eventDiv = document.createElement('div');
                    eventDiv.classList.add('event');
                    eventDiv.setAttribute('data-term-id', term.id);
                    eventDiv.setAttribute('data-date', formattedDate);
                    
                    const termStatusData = termStatus[formattedDate] ? termStatus[formattedDate][termId] : null;
                    const eventIsDisabled = termStatusData && termStatusData.status === 'deactivated';

                    // NOVO: Barva za prihodnje termine
                    if (isFutureDate(formattedDate)) {
                        eventDiv.classList.add('future');
                    } else if (eventIsDisabled) {
                        eventDiv.classList.add('disabled');
                    } else {
                        const attendanceCount = attendance[formattedDate]?.[termId] ? Object.keys(attendance[formattedDate][termId]).length : 0;
                        const totalSwimmersWithTerm = swimmers.filter(s => s.terms.includes(term.id)).length;

                        if (attendanceCount === totalSwimmersWithTerm && totalSwimmersWithTerm > 0) {
                            eventDiv.classList.add('complete');
                        } else if (attendanceCount > 0) {
                            eventDiv.classList.add('partial');
                        } else {
                            eventDiv.classList.add('unfilled');
                        }
                    }

                    eventDiv.innerHTML = `<span class="time">${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}</span>`;
                    dayDiv.appendChild(eventDiv);
                    eventsRendered++;
                }
            }

            if (eventsOnThisDay > 3) {
                const moreEvents = document.createElement('span');
                moreEvents.classList.add('more-events-indicator');
                moreEvents.textContent = `+${eventsOnThisDay - 3}`;
                dayDiv.appendChild(moreEvents);
            }
            
            elCalendarGrid.appendChild(dayDiv);

            dayDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (eventsOnThisDay > 0) {
                    const target = e.target.closest('.day');
                    if (target) {
                        selectedDay = target.getAttribute('data-date');
                        showDayModal(selectedDay, dailyEvents);
                    }
                }
            });
        }
    };


    const renderSummary = () => {
        elSummaryBox.innerHTML = '';
        const summaryData = {};

        // Zgradimo povzetek za vse plavalce
        swimmers.forEach(swimmer => {
            const swimmerTerms = swimmer.terms.filter(termId => TERMS.find(t => t.id === termId));
            if (swimmerTerms.length > 0) {
                summaryData[swimmer.id] = {
                    name: `${swimmer.first_name} ${swimmer.last_name}`,
                    present: 0,
                    total: 0
                };
            }
        });

        // Preverimo prisotnost
        for (const date in attendance) {
            for (const termId in attendance[date]) {
                const term = TERMS.find(t => t.id === termId);
                if (!term || !isDateInRange(date, term)) continue;

                const dayStatus = termStatus[date]?.[termId]?.status;
                if (dayStatus === 'deactivated') continue;
                
                for (const swimmerId in attendance[date][termId]) {
                    if (summaryData[swimmerId]) {
                        summaryData[swimmerId].total++;
                        if (attendance[date][termId][swimmerId] === 'present') {
                            summaryData[swimmerId].present++;
                        }
                    }
                }
            }
        }

        // Izrišemo tabelo
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Plavalec</th>
                    <th>Prisotnost</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        const sortedSwimmers = Object.values(summaryData).sort((a,b) => a.name.localeCompare(b.name));
        
        if (sortedSwimmers.length === 0) {
            elSummaryBox.textContent = 'Ni plavalcev ali prisotnosti za prikaz.';
            return;
        }
        
        sortedSwimmers.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.present} / ${data.total}</td>
            `;
            tbody.appendChild(row);
        });

        elSummaryBox.appendChild(table);
    };

    const showDayModal = (date, dailyEvents) => {
        elDayModalTitle.textContent = formatDateForDisplay(date);
        elDayModalList.innerHTML = '';

        const eventIds = Object.keys(dailyEvents);
        
        eventIds.forEach(termId => {
            const term = dailyEvents[termId];
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event');
            eventDiv.setAttribute('data-term-id', termId);
            eventDiv.setAttribute('data-date', date);
            
            const eventIsDisabled = termStatus[date]?.[termId]?.status === 'deactivated';

            // NOVO: Barva za prihodnje termine v modalnem oknu
            if (isFutureDate(date)) {
                eventDiv.classList.add('future');
            } else if (eventIsDisabled) {
                eventDiv.classList.add('disabled');
            } else {
                const attendanceCount = attendance[date]?.[termId] ? Object.keys(attendance[date][termId]).length : 0;
                const totalSwimmersWithTerm = swimmers.filter(s => s.terms.includes(term.id)).length;
                
                if (attendanceCount === totalSwimmersWithTerm && totalSwimmersWithTerm > 0) {
                    eventDiv.classList.add('complete');
                } else if (attendanceCount > 0) {
                    eventDiv.classList.add('partial');
                } else {
                    eventDiv.classList.add('unfilled');
                }
            }

            eventDiv.innerHTML = `<span class="time">${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}</span>`;
            elDayModalList.appendChild(eventDiv);
        });

        elDayModal.style.display = 'flex';
    };


    const showEventModal = (date, termId) => {
        selectedEvent = { date, termId };
        const term = TERMS.find(t => t.id === termId);
        
        if (!term) {
            console.error("Termin ne obstaja.");
            return;
        }

        const termStatusData = termStatus[date]?.[termId] || {};
        const eventIsDisabled = termStatusData.status === 'deactivated';
        
        // Posodobi naslov in meta podatke
        elModalTitle.textContent = `${formatDateForDisplay(date)} ${DAYNAME[term.day]}`;
        elModalMeta.innerHTML = `<div class="chip">${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}</div>`;
        
        elAttendanceTable.innerHTML = '';
        elModalSwimmerSelect.innerHTML = '<option value="">Dodaj plavalca...</option>';
        
        // Plavalci, ki imajo ta termin
        const swimmersWithTerm = swimmers.filter(s => s.terms.includes(term.id)).sort((a,b) => a.last_name.localeCompare(b.last_name));
        
        // Pripravi seznam prisotnih plavalcev
        swimmersWithTerm.forEach(swimmer => {
            const status = attendance[date]?.[termId]?.[swimmer.id];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${swimmer.first_name} ${swimmer.last_name}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm toggle ${status === 'present' ? 'active-ok' : ''}" data-swimmer-id="${swimmer.id}" data-status="present">Prisoten</button>
                        <button class="btn btn-sm toggle ${status === 'absent' ? 'active-warn' : ''}" data-swimmer-id="${swimmer.id}" data-status="absent">Odsoten</button>
                        ${status ? `<button class="btn btn-sm neutral" data-swimmer-id="${swimmer.id}" data-action="remove">❌</button>` : ''}
                    </div>
                </td>
            `;
            elAttendanceTable.appendChild(row);
        });
        
        // Pripravi seznam plavalcev za dodajanje (samo tiste, ki še niso vpisani)
        const currentAttendees = attendance[date]?.[termId] || {};
        const swimmersToAddToEvent = swimmers.filter(swimmer => {
            // Plavalca dodamo v seznam za dodajanje le, če za ta datum in termin še ni vpisan
            return !currentAttendees.hasOwnProperty(swimmer.id);
        }).sort((a, b) => a.last_name.localeCompare(b.last_name));

        swimmersToAddToEvent.forEach(swimmer => {
            const option = document.createElement('option');
            option.value = swimmer.id;
            option.textContent = `${swimmer.first_name} ${swimmer.last_name}`;
            elModalSwimmerSelect.appendChild(option);
        });

        // Nastavi opombo in stanje
        elNotesInput.value = termStatusData.notes || '';
        if (eventIsDisabled) {
            elInactiveNote.textContent = `Trening je neaktiven. Razlog: ${termStatusData.note || 'ni naveden'}`;
            elNotesInput.disabled = true;
            elSaveNotesBtn.disabled = true;
            elAddToEventBtn.disabled = true;
            elModalSwimmerSelect.disabled = true;
            elToggleEventBtn.textContent = 'Aktiviraj trening';
            elToggleEventBtn.classList.remove('warn-btn');
            elToggleEventBtn.classList.add('secondary-btn');
        } else {
            elInactiveNote.textContent = '';
            elNotesInput.disabled = false;
            elSaveNotesBtn.disabled = false;
            elAddToEventBtn.disabled = false;
            elModalSwimmerSelect.disabled = false;
            elToggleEventBtn.textContent = 'Deaktiviraj trening';
            elToggleEventBtn.classList.remove('secondary-btn');
            elToggleEventBtn.classList.add('warn-btn');
        }

        elEventModal.style.display = 'flex';
    };

    const closeModal = () => {
        elEventModal.style.display = 'none';
        selectedEvent = null;
    };

    const closeDayModal = () => {
        elDayModal.style.display = 'none';
        selectedDay = null;
    };
    
    const closeNoteModal = () => {
        elNoteModal.style.display = 'none';
    };
    
    const closeEditTermModal = () => {
        elEditTermModal.style.display = 'none';
    };

    const handleEventStatusChange = async (event) => {
        const btn = event.target.closest('.btn');
        if (!btn || !selectedEvent) return;
        
        const swimmerId = btn.getAttribute('data-swimmer-id');
        const action = btn.getAttribute('data-action');
        const status = btn.getAttribute('data-status');

        if (action === 'remove') {
            await removeAttendance(selectedEvent.date, selectedEvent.termId, swimmerId);
        } else if (status) {
            await updateAttendance(selectedEvent.date, selectedEvent.termId, swimmerId, status);
        }
    };

    const updateAttendance = async (date, termId, swimmerId, status) => {
        try {
            const { error } = await supabase.from('attendance')
                .upsert([{
                    date: date,
                    term_id: termId,
                    swimmer_id: swimmerId,
                    status: status
                }], { onConflict: ['date', 'term_id', 'swimmer_id'] });
            
            if (error) throw error;
            
            // Posodobimo lokalno stanje
            attendance[date] = attendance[date] || {};
            attendance[date][termId] = attendance[date][termId] || {};
            attendance[date][termId][swimmerId] = status;
            
            // Ponovno izrisovanje
            showEventModal(date, termId);
            renderMonth();
            renderSummary();
        } catch (error) {
            console.error("Napaka pri posodabljanju prisotnosti:", error.message);
        }
    };

    const removeAttendance = async (date, termId, swimmerId) => {
        try {
            const { error } = await supabase.from('attendance')
                .delete()
                .eq('date', date)
                .eq('term_id', termId)
                .eq('swimmer_id', swimmerId);
            
            if (error) throw error;
            
            // Posodobimo lokalno stanje
            if (attendance[date]?.[termId]?.[swimmerId]) {
                delete attendance[date][termId][swimmerId];
            }
            
            // Ponovno izrisovanje
            showEventModal(date, termId);
            renderMonth();
            renderSummary();
        } catch (error) {
            console.error("Napaka pri brisanju prisotnosti:", error.message);
        }
    };
    
    const importCsv = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.split('\n').filter(row => row.trim() !== '');
                const headers = rows[0].split(',').map(h => h.trim());
                const data = [];
                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i].split(',').map(v => v.trim());
                    if (values.length === headers.length) {
                        const rowData = {};
                        headers.forEach((header, index) => {
                            rowData[header] = values[index];
                        });
                        data.push(rowData);
                    }
                }
                resolve(data);
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    const importSwimmers = async (file) => {
        try {
            const data = await importCsv(file);
            const swimmersToAdd = data.map(row => ({
                first_name: row.first_name,
                last_name: row.last_name,
                terms: row.terms ? row.terms.split(',').map(t => t.trim()) : []
            }));
            
            // Izbrišemo vse trenutne plavalce in prisotnost od danes naprej
            const today = formatDate(new Date());
            await supabase.from('swimmers').delete().not('id', 'is', null);
            await supabase.from('attendance').delete().gte('date', today);

            const { error } = await supabase.from('swimmers').insert(swimmersToAdd);
            if (error) throw error;
            
            alert('Plavalci uspešno uvoženi in prisotnost od danes naprej izbrisana!');
            updateStateAndRender();
        } catch (error) {
            console.error("Napaka pri uvozu plavalcev:", error.message);
            alert("Napaka pri uvozu plavalcev. Preverite format datoteke.");
        }
    };

    const importTerms = async (file) => {
      try {
        const data = await importCsv(file);
        const termsToAdd = data.map(row => ({
          id: row.id,
          day: parseInt(row.day, 10),
          start_time: row.start_time,
          end_time: row.end_time,
          date_from: new Date(row.date_from.split('/').reverse().join('-').trim()),
          date_to: new Date(row.date_to.split('/').reverse().join('-').trim())
        }));

        // Izbrišemo vse trenutne termine in term_status
        await supabase.from('terms').delete().not('id', 'is', null);
        await supabase.from('term_status').delete().not('term_id', 'is', null);

        const { error } = await supabase.from('terms').insert(termsToAdd);
        if (error) throw error;
        
        alert('Termini uspešno uvoženi!');
        updateStateAndRender();

      } catch (error) {
        console.error("Napaka pri uvozu terminov:", error.message);
        alert("Napaka pri uvozu terminov. Preverite format datoteke.");
      }
    };

    const populateExportSelects = () => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        elExportMonthSelect.innerHTML = '';
        elExportYearSelect.innerHTML = '';
        const months = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentMonth) {
                option.selected = true;
            }
            elExportMonthSelect.appendChild(option);
        });

        const startYear = 2023;
        for (let y = startYear; y <= currentYear + 1; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            if (y === currentYear) {
                option.selected = true;
            }
            elExportYearSelect.appendChild(option);
        }
    };

    const exportCsv = async () => {
        const month = parseInt(elExportMonthSelect.value, 10);
        const year = parseInt(elExportYearSelect.value, 10);
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = formatDate(firstDay);
        const endDate = formatDate(lastDay);

        const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate);
        if (attendanceError) {
            console.error("Napaka pri izvozu:", attendanceError.message);
            return;
        }

        const { data: termStatusData, error: termStatusError } = await supabase.from('term_status').select('*').gte('date', startDate).lte('date', endDate);
        if (termStatusError) {
            console.error("Napaka pri izvozu (status):", termStatusError.message);
            return;
        }
        
        const termStatusMap = termStatusData.reduce((acc, row) => {
            acc[`${row.date}_${row.term_id}`] = row.status;
            return acc;
        }, {});


        const sortedAttendance = attendanceData.sort((a, b) => new Date(a.date) - new Date(b.date) || a.term_id.localeCompare(b.term_id));

        let csvContent = "Datum,Dan,Termin,Plavalec,Status\n";

        for (const row of sortedAttendance) {
            const dateObj = new Date(row.date);
            const term = TERMS.find(t => t.id === row.term_id);
            const swimmer = swimmers.find(s => s.id === row.swimmer_id);
            
            if (!term || !swimmer) continue;

            // Preverimo, ali je termin deaktiviran za ta datum
            const termIsDeactivated = termStatusMap[`${row.date}_${row.term_id}`] === 'deactivated';
            if (termIsDeactivated) continue;
            
            const dateStr = formatDateForDisplay(row.date);
            const dayStr = DAY_SHORT_NAME[dateObj.getDay() === 0 ? 7 : dateObj.getDay()];
            const termStr = `${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`;
            const swimmerName = `${swimmer.first_name} ${swimmer.last_name}`;
            const statusStr = row.status === 'present' ? 'prisoten' : 'odsoten';

            csvContent += `${dateStr},${dayStr},${termStr},"${swimmerName}",${statusStr}\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `prisotnost_${month + 1}_${year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // ===== Poslušalci dogodkov (Event Listeners) =====
    
    // Koledar
    elPrev.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderMonth();
        renderSummary();
    });
    
    elNext.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderMonth();
        renderSummary();
    });
    
    // Modal za dogodke (Event Modal)
    document.getElementById("closeModalBtn").addEventListener('click', closeModal);
    elEventModal.addEventListener('click', (e) => {
        if (e.target === elEventModal) {
            closeModal();
        }
    });

    elAttendanceTable.addEventListener('click', handleEventStatusChange);

    elAddToEventBtn.addEventListener('click', async () => {
        if (selectedEvent && elModalSwimmerSelect.value) {
            await updateAttendance(selectedEvent.date, selectedEvent.termId, elModalSwimmerSelect.value, 'present');
        }
    });

    elSaveNotesBtn.addEventListener('click', async () => {
        if (selectedEvent) {
            try {
                const { error } = await supabase.from('term_status')
                    .upsert([{
                        date: selectedEvent.date,
                        term_id: selectedEvent.termId,
                        notes: elNotesInput.value,
                        status: termStatus[selectedEvent.date]?.[selectedEvent.termId]?.status || null
                    }], { onConflict: ['date', 'term_id'] });
                
                if (error) throw error;
                
                termStatus[selectedEvent.date] = termStatus[selectedEvent.date] || {};
                termStatus[selectedEvent.date][selectedEvent.termId] = termStatus[selectedEvent.date][selectedEvent.termId] || {};
                termStatus[selectedEvent.date][selectedEvent.termId].notes = elNotesInput.value;
                
                alert('Opombe shranjene!');
                renderMonth();
            } catch (error) {
                console.error("Napaka pri shranjevanju opomb:", error.message);
                alert("Napaka pri shranjevanju opomb.");
            }
        }
    });
    
    elToggleEventBtn.addEventListener('click', () => {
        if (selectedEvent) {
            if (termStatus[selectedEvent.date]?.[selectedEvent.termId]?.status === 'deactivated') {
                toggleEventStatus('active', '');
            } else {
                elNoteModal.style.display = 'flex';
            }
        }
    });

    // Modal za opombo
    document.getElementById("closeNoteModalBtn").addEventListener('click', closeNoteModal);
    elNoteModal.addEventListener('click', (e) => {
        if (e.target === elNoteModal) {
            closeNoteModal();
        }
    });
    elCancelNoteBtn.addEventListener('click', closeNoteModal);
    
    elConfirmNoteBtn.addEventListener('click', async () => {
        const note = elNoteInput.value;
        if (note.trim() === '') {
            alert('Prosim, vnesite razlog za deaktivacijo.');
            return;
        }
        await toggleEventStatus('deactivated', note);
        closeNoteModal();
    });

    const toggleEventStatus = async (status, note) => {
        if (!selectedEvent) return;
        try {
            const { error } = await supabase.from('term_status')
                .upsert([{
                    date: selectedEvent.date,
                    term_id: selectedEvent.termId,
                    status: status,
                    note: note,
                    notes: elNotesInput.value
                }], { onConflict: ['date', 'term_id'] });
            
            if (error) throw error;
            
            // Posodobimo lokalno stanje
            termStatus[selectedEvent.date] = termStatus[selectedEvent.date] || {};
            termStatus[selectedEvent.date][selectedEvent.termId] = { status, note, notes: elNotesInput.value };
            
            if (status === 'deactivated') {
                // Izbrišemo vse zapise o prisotnosti za ta termin
                const { error: deleteError } = await supabase.from('attendance')
                    .delete()
                    .eq('date', selectedEvent.date)
                    .eq('term_id', selectedEvent.termId);
                
                if (deleteError) throw deleteError;
                
                // Izbrišemo tudi lokalne zapise o prisotnosti
                if (attendance[selectedEvent.date] && attendance[selectedEvent.date][selectedEvent.termId]) {
                    delete attendance[selectedEvent.date][selectedEvent.termId];
                }
            }
            
            showEventModal(selectedEvent.date, selectedEvent.termId);
            renderMonth();
            renderSummary();
            alert(`Termin uspešno ${status === 'deactivated' ? 'deaktiviran' : 'aktiviran'}!`);
        } catch (error) {
            console.error("Napaka pri spremembi statusa termina:", error.message);
            alert("Napaka pri spremembi statusa termina.");
        }
    };
    
    // Modal za urejanje termina
    document.getElementById("closeEditTermModalBtn").addEventListener('click', closeEditTermModal);
    elEditTermModal.addEventListener('click', (e) => {
        if (e.target === elEditTermModal) {
            closeEditTermModal();
        }
    });
    elSaveEditTermBtn.addEventListener('click', async () => {
        if (selectedTermToEdit) {
            const dateFrom = elEditTermDateFrom.value;
            const dateTo = elEditTermDateTo.value;
            
            if (!dateFrom || !dateTo) {
                alert('Prosim, izpolnite oba datuma.');
                return;
            }

            try {
                const dateFromObj = new Date(dateFrom.split('/').reverse().join('-').trim());
                const dateToObj = new Date(dateTo.split('/').reverse().join('-').trim());
                
                const { error } = await supabase.from('terms')
                    .update({ date_from: dateFromObj, date_to: dateToObj })
                    .eq('id', selectedTermToEdit.id);

                if (error) throw error;
                
                alert('Termin uspešno posodobljen!');
                updateStateAndRender();
            } catch (error) {
                console.error("Napaka pri urejanju termina:", error.message);
                alert("Napaka pri urejanju termina. Preverite format datuma.");
            }
        }
    });
    
    // Modal za dan
    document.getElementById("closeDayModalBtn").addEventListener('click', closeDayModal);
    elDayModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeDayModal();
        } else if (e.target.closest('.event')) {
            const eventDiv = e.target.closest('.event');
            const termId = eventDiv.getAttribute('data-term-id');
            const date = eventDiv.getAttribute('data-date');
            closeDayModal();
            showEventModal(date, termId);
        }
    });
    
    // Upravljanje plavalcev
    elAddSwimmerBtn.addEventListener('click', async () => {
        const firstName = elNewFirst.value.trim();
        const lastName = elNewLast.value.trim();
        if (firstName && lastName) {
            const { error } = await supabase.from('swimmers').insert([{ first_name: firstName, last_name: lastName }]);
            if (error) {
                console.error("Napaka pri dodajanju plavalca:", error.message);
                alert("Napaka pri dodajanju plavalca.");
            } else {
                elNewFirst.value = '';
                elNewLast.value = '';
                alert('Plavalec uspešno dodan!');
                updateStateAndRender();
            }
        }
    });
    
    elSwimmerSelect.addEventListener('change', async (e) => {
        selectedSwimmerId = e.target.value;
        const swimmer = swimmers.find(s => s.id == selectedSwimmerId);
        elSwimmerInfo.innerHTML = '';
        elAssignTermBtn.disabled = true;
        elDeleteSwimmerBtn.disabled = true;
        
        if (swimmer) {
            elDeleteSwimmerBtn.disabled = false;
            const termsForSwimmer = TERMS.filter(term => swimmer.terms.includes(term.id));
            const termsHtml = termsForSwimmer.map(term => `
                <div class="chip">
                    ${DAYNAME[term.day]} ${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}
                    <button class="remove-term-btn" data-term-id="${term.id}">&times;</button>
                </div>
            `).join('');

            elSwimmerInfo.innerHTML = `
                <h4>Dodani termini:</h4>
                <p>${termsHtml || 'Trenutno nima dodeljenih terminov.'}</p>
            `;
            elAssignTermBtn.disabled = false;
        }
    });
    
    elSwimmerInfo.addEventListener('click', async (e) => {
        const btn = e.target.closest('.remove-term-btn');
        if (btn && selectedSwimmerId) {
            const termIdToRemove = btn.getAttribute('data-term-id');
            const swimmer = swimmers.find(s => s.id == selectedSwimmerId);
            const updatedTerms = swimmer.terms.filter(termId => termId !== termIdToRemove);
            
            const { error } = await supabase.from('swimmers')
                .update({ terms: updatedTerms })
                .eq('id', selectedSwimmerId);

            if (error) {
                console.error("Napaka pri odstranjevanju termina:", error.message);
                alert("Napaka pri odstranjevanju termina.");
            } else {
                alert('Termin uspešno odstranjen!');
                updateStateAndRender();
            }
        }
    });

    elAssignTermBtn.addEventListener('click', async () => {
        if (selectedSwimmerId && elTermSelect.value) {
            const swimmer = swimmers.find(s => s.id == selectedSwimmerId);
            if (!swimmer.terms.includes(elTermSelect.value)) {
                const updatedTerms = [...swimmer.terms, elTermSelect.value];
                const { error } = await supabase.from('swimmers')
                    .update({ terms: updatedTerms })
                    .eq('id', selectedSwimmerId);

                if (error) {
                    console.error("Napaka pri dodeljevanju termina:", error.message);
                    alert("Napaka pri dodeljevanju termina.");
                } else {
                    alert('Termin uspešno dodeljen!');
                    updateStateAndRender();
                }
            }
        }
    });

    elDeleteSwimmerBtn.addEventListener('click', async () => {
        if (confirm('Ali ste prepričani, da želite izbrisati tega plavalca in vse njegove podatke o prisotnosti?')) {
            if (selectedSwimmerId) {
                const { error: attendanceError } = await supabase.from('attendance')
                    .delete()
                    .eq('swimmer_id', selectedSwimmerId);

                const { error: swimmerError } = await supabase.from('swimmers')
                    .delete()
                    .eq('id', selectedSwimmerId);

                if (attendanceError || swimmerError) {
                    console.error("Napaka pri brisanju plavalca:", attendanceError?.message || swimmerError?.message);
                    alert("Napaka pri brisanju plavalca.");
                } else {
                    alert('Plavalec uspešno izbrisan!');
                    selectedSwimmerId = null;
                    updateStateAndRender();
                }
            }
        }
    });
    
    // Upravljanje terminov
    elAddTermBtn.addEventListener('click', async () => {
        const day = parseInt(elNewTermDay.value, 10);
        const start = elNewTermStart.value;
        const end = elNewTermEnd.value;
        const dateFrom = elNewTermDateFrom.value;
        const dateTo = elNewTermDateTo.value;
        const id = `${DAY_SHORT_NAME[day].toLowerCase().replace('.', '')}-${start.replace(':', '-')}-${end.replace(':', '-')}`;

        if (day && start && end && dateFrom && dateTo) {
            try {
                const dateFromObj = new Date(dateFrom.split('/').reverse().join('-').trim());
                const dateToObj = new Date(dateTo.split('/').reverse().join('-').trim());
                
                const { error } = await supabase.from('terms').insert([{ id: id, day: day, start_time: start, end_time: end, date_from: dateFromObj, date_to: dateToObj }]);
                if (error) throw error;
                
                elNewTermDateFrom.value = '';
                elNewTermDateTo.value = '';
                alert('Termin uspešno dodan!');
                updateStateAndRender();
            } catch (error) {
                console.error("Napaka pri dodajanju termina:", error.message);
                alert("Napaka pri dodajanju termina. Preverite format datuma in če id že obstaja.");
            }
        }
    });

    const deleteTerm = async (termId) => {
        if (confirm('Ali ste prepričani, da želite izbrisati ta termin in vse podatke o prisotnosti, povezane z njim?')) {
            try {
                // Najprej izbriši prisotnost
                const { error: attendanceError } = await supabase.from('attendance')
                    .delete()
                    .eq('term_id', termId);
                if (attendanceError) throw attendanceError;
                
                // Izbriši status termina
                const { error: statusError } = await supabase.from('term_status')
                    .delete()
                    .eq('term_id', termId);
                if (statusError) throw statusError;
                    
                // Izbriši termin
                const { error: termError } = await supabase.from('terms')
                    .delete()
                    .eq('id', termId);
                if (termError) throw termError;
                
                alert('Termin uspešno izbrisan!');
                updateStateAndRender();
            } catch (error) {
                console.error("Napaka pri brisanju termina:", error.message);
                alert("Napaka pri brisanju termina.");
            }
        }
    };

    // Uvoz/izvoz
    elCsvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importSwimmers(file);
        }
    });
    
    elCsvTermsInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importTerms(file);
      }
    });

    elExportCsvBtn.addEventListener('click', exportCsv);
    

    // ===== Inicializacija ob zagonu =====
    updateStateAndRender();

});