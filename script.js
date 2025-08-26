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
    const elSubstituteHeader = document.getElementById("substituteHeader");
    const elSubstituteTable = document.getElementById("substituteTable");
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
    let modalCtx = null;
    let selectedDay = null;
    let selectedSwimmerId = null;
    let selectedTermToEdit = null;
    
    // Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


    // ===== Pomožne funkcije =====

    // Pomožna funkcija za formatiranje datuma
    const iso = (date) => {
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
    
    // Pomožna funkcija za preverjanje, ali je dogodek neaktiven (deaktiviran ali v preteklosti)
    const isInactive = (date, termId) => {
        const ymd = iso(date);
        const termStatusData = termStatus[ymd]?.[termId];
        return (termStatusData && termStatusData.status === 'deactivated') || !isFutureDate(ymd);
    };
    
    const termById = (id) => TERMS.find(t => t.id === id);
    
    // Funkcije za osveževanje UI
    const populateExportSelects = () => {
      elExportMonthSelect.innerHTML = '';
      elExportYearSelect.innerHTML = '';
      const months = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
      months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        elExportMonthSelect.appendChild(option);
      });

      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 2; y <= currentYear + 2; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        elExportYearSelect.appendChild(option);
      }
      elExportMonthSelect.value = new Date().getMonth();
      elExportYearSelect.value = currentYear;
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
            const formattedDate = iso(date);
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

                    if (eventIsDisabled) {
                        eventDiv.classList.add('disabled');
                    } else if (isFutureDate(formattedDate)) {
                        eventDiv.classList.add('future');
                    } else {
                        // Nova logika za obarvanje preteklih dogodkov
                        const attendanceRecords = attendance[formattedDate]?.[termId] || {};
                        const presentCount = Object.values(attendanceRecords).filter(status => status === true).length;
                        const totalSwimmersWithTerm = swimmers.filter(s => s.terms.includes(term.id)).length;
                        
                        if (presentCount === totalSwimmersWithTerm && totalSwimmersWithTerm > 0) {
                            eventDiv.classList.add('complete');
                        } else if (presentCount > 0) {
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
                summaryData[swimmer.id] = { name: `${swimmer.first_name} ${swimmer.last_name}`, present: 0, total: 0 };
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
                        if (attendance[date][termId][swimmerId] === true) {
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
            if (eventIsDisabled) {
                eventDiv.classList.add('disabled');
            } else if (isFutureDate(date)) {
                eventDiv.classList.add('future');
            } else {
                const attendanceRecords = attendance[date]?.[termId] || {};
                const presentCount = Object.values(attendanceRecords).filter(status => status === true).length;
                const totalSwimmersWithTerm = swimmers.filter(s => s.terms.includes(term.id)).length;
                
                if (presentCount === totalSwimmersWithTerm && totalSwimmersWithTerm > 0) {
                    eventDiv.classList.add('complete');
                } else if (presentCount > 0) {
                    eventDiv.classList.add('partial');
                } else {
                    eventDiv.classList.add('unfilled');
                }
            }

            eventDiv.innerHTML = `<span class="time">${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}</span>`;
            eventDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                openEvent(date, termId);
            });
            elDayModalList.appendChild(eventDiv);
        });
        openModal(elDayModal);
    };

    const openModal = (modal) => {
      modal.style.display = "flex";
    };

    const closeModal = () => {
        elEventModal.style.display = "none";
        modalCtx = null;
    };
    
    const closeDayModal = () => {
        elDayModal.style.display = "none";
        selectedDay = null;
    };
    
    const closeNoteModal = () => {
        elNoteModal.style.display = "none";
    };
    
    const closeEditTermModal = () => {
      elEditTermModal.style.display = "none";
      selectedTermToEdit = null;
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
    
    // Glavna funkcija za odpiranje dogodka
    async function openEvent(date, termId){
      modalCtx = { date:new Date(date), termId };
      const t = termById(termId);
      elModalTitle.textContent = `${t.label}`;
      elModalMeta.innerHTML = "";
      
      const ymd = iso(date);
      
      await refreshDayData(date);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('swimmer_id, status')
        .eq('date', ymd)
        .eq('term_id', termId);
      
      if (error) {
          console.error('Napaka pri nalaganju prisotnosti:', error);
          return;
      }
      
      const termAtt = data.reduce((acc, row) => {
        acc[row.swimmer_id] = row.status;
        return acc;
      }, {});
      
      attendance[ymd] = { ...attendance[ymd], [termId]: termAtt };

      const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
      const substitutedSwimmers = swimmers.filter(s => Object.keys(termAtt).includes(s.id) && !assignedSwimmers.map(s => s.id).includes(s.id));
      
      elAttendanceTable.innerHTML = "";
      elSubstituteTable.innerHTML = "";
      elSubstituteHeader.style.display = 'none';
      elSubstituteTable.style.display = 'none';

      // Prikaz dodeljenih plavalcev
      const assignedActiveSwimmers = assignedSwimmers.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
      if(assignedActiveSwimmers.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td");
        td.colSpan=2;
        td.className="muted";
        td.textContent="Ni dodeljenih plavalcev za ta termin.";
        tr.appendChild(td);
        elAttendanceTable.appendChild(tr);
      } else {
          assignedActiveSwimmers.forEach(s=>{
            createSwimmerRow(s, termAtt, date, termId, false, elAttendanceTable);
          });
      }

      // Prikaz nadomeščanj, če obstajajo
      if(substitutedSwimmers.length > 0) {
          elSubstituteHeader.style.display = 'block';
          elSubstituteTable.style.display = 'table';
          substitutedSwimmers.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
              createSwimmerRow(s, termAtt, date, termId, true, elSubstituteTable);
          });
      }

      // Priprava drop-down menija za dodajanje plavalcev
      elModalSwimmerSelect.innerHTML = "";
      const currentEventSwimmerIds = [...assignedSwimmers, ...substitutedSwimmers].map(s => s.id);
      const unassigned = swimmers.filter(s => !currentEventSwimmerIds.includes(s.id) && !s.is_deleted && s.terms.length > 0)
        .sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));

      if (unassigned.length > 0) {
        unassigned.forEach(s => {
          const o = document.createElement("option");
          o.value = s.id;
          o.textContent = `${s.first_name} ${s.last_name}`;
          elModalSwimmerSelect.appendChild(o);
        });
        elAddToEventBtn.disabled = false;
      } else {
        const o = document.createElement("option");
        o.textContent = "Ni plavalcev za dodajanje";
        elModalSwimmerSelect.appendChild(o);
        elAddToEventBtn.disabled = true;
      }
      
      openModal(elEventModal);
    }
    
    function createSwimmerRow(swimmer, attendanceData, date, termId, isSubstitute, tableElement) {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = `${swimmer.first_name} ${swimmer.last_name}`;
        const td2 = document.createElement("td");
        td2.style.display = "flex";
        td2.style.gap = "4px";
        td2.style.alignItems = "center";
        
        const status = attendanceData[swimmer.id];

        // Gumb Prisoten
        const btnPresent = document.createElement("button");
        btnPresent.textContent = "Prisoten";
        btnPresent.className = `btn ${status === true ? "ok" : "neutral"}`;
        if (isInactive(date, termId)) { btnPresent.disabled = true; }
        btnPresent.addEventListener("click", async () => {
            await saveAttendance(date, termId, swimmer.id, true);
            await openEvent(date, termId);
            renderMonth();
        });

        // Gumb Odsoten
        const btnAbsent = document.createElement("button");
        btnAbsent.textContent = "Odsoten";
        btnAbsent.className = `btn ${status === false ? "warn" : "neutral"}`;
        if (isInactive(date, termId)) { btnAbsent.disabled = true; }
        btnAbsent.addEventListener("click", async () => {
            await saveAttendance(date, termId, swimmer.id, false);
            await openEvent(date, termId);
            renderMonth();
        });

        td2.appendChild(btnPresent);
        td2.appendChild(btnAbsent);

        // Gumb za brisanje (križec), samo za nadomestne plavalce
        if (isSubstitute) {
            const btnRemove = document.createElement("button");
            btnRemove.innerHTML = "✖";
            btnRemove.className = "btn remove-btn";
            if (isInactive(date, termId)) { btnRemove.disabled = true; }
            btnRemove.addEventListener("click", async () => {
                await deleteAttendance(date, termId, swimmer.id);
                await openEvent(date, termId);
                renderMonth();
            });
            td2.appendChild(btnRemove);
        }

        tr.appendChild(td1);
        tr.appendChild(td2);
        tableElement.appendChild(tr);
    }
    
    const refreshDayData = async (date) => {
      const ymd = iso(date);
      const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*').eq('date', ymd);
      if (attendanceError) throw attendanceError;
      attendance = attendanceData.reduce((acc, row) => {
        acc[row.date] = acc[row.date] || {};
        acc[row.date][row.term_id] = acc[row.date][row.term_id] || {};
        acc[row.date][row.term_id][row.swimmer_id] = row.status;
        return acc;
      }, { ...attendance });
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


    // Dodajanje/odstranjevanje plavalcev
    elAddSwimmerBtn.addEventListener('click', async () => {
        const first = elNewFirst.value;
        const last = elNewLast.value;
        if (!first || !last) {
            alert("Ime in priimek morata biti izpolnjena!");
            return;
        }
        try {
            const { error } = await supabase.from('swimmers').insert({ first_name: first, last_name: last });
            if (error) throw error;
            elNewFirst.value = '';
            elNewLast.value = '';
            updateStateAndRender();
        } catch (error) {
            console.error("Napaka pri dodajanju plavalca:", error.message);
            alert("Napaka pri dodajanju plavalca.");
        }
    });

    elDeleteSwimmerBtn.addEventListener('click', async () => {
        const swimmerId = elSwimmerSelect.value;
        if (!swimmerId) return;
        if (confirm("Ali ste prepričani, da želite izbrisati tega plavalca? Prisotnost bo ostala v sistemu, a plavalca ne bo več mogoče urejati ali dodeliti novim terminom.")) {
            try {
                const { error } = await supabase.from('swimmers').update({ is_deleted: true }).eq('id', swimmerId);
                if (error) throw error;
                updateStateAndRender();
            } catch (error) {
                console.error("Napaka pri brisanju plavalca:", error.message);
                alert("Napaka pri brisanju plavalca.");
            }
        }
    });

    elAssignTermBtn.addEventListener('click', async () => {
        const swimmerId = elSwimmerSelect.value;
        const termId = elTermSelect.value;
        if (!swimmerId || !termId) return;
        try {
            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer.terms.includes(termId)) {
                alert("Plavalec je že dodeljen temu terminu.");
                return;
            }
            const updatedTerms = [...swimmer.terms, termId];
            const { error } = await supabase.from('swimmers').update({ terms: updatedTerms }).eq('id', swimmerId);
            if (error) throw error;
            updateStateAndRender();
        } catch (error) {
            console.error("Napaka pri dodeljevanju termina:", error.message);
            alert("Napaka pri dodeljevanju termina.");
        }
    });

    elSwimmerSelect.addEventListener('change', (e) => {
        selectedSwimmerId = e.target.value;
        elSwimmerInfo.innerHTML = '';
        elAssignTermBtn.disabled = !selectedSwimmerId;
        elDeleteSwimmerBtn.disabled = !selectedSwimmerId;
        if (selectedSwimmerId) {
            const swimmer = swimmers.find(s => s.id === selectedSwimmerId);
            if (swimmer) {
                elSwimmerInfo.innerHTML = `
                    <p><strong>Dodeljeni termini:</strong></p>
                    ${swimmer.terms.map(termId => {
                        const term = TERMS.find(t => t.id === termId);
                        return `<div class="swimmer-info-item">${term.label} <button class="btn neutral remove-term-btn" data-term-id="${term.id}">Odstrani</button></div>`;
                    }).join('')}
                `;
            }
        }
    });

    elSwimmerInfo.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-term-btn')) {
            const termIdToRemove = e.target.getAttribute('data-term-id');
            const swimmerId = elSwimmerSelect.value;
            if (swimmerId && termIdToRemove) {
                const swimmer = swimmers.find(s => s.id === swimmerId);
                const updatedTerms = swimmer.terms.filter(id => id !== termIdToRemove);
                try {
                    const { error } = await supabase.from('swimmers').update({ terms: updatedTerms }).eq('id', swimmerId);
                    if (error) throw error;
                    updateStateAndRender();
                } catch (error) {
                console.error("Napaka pri odstranjevanju termina:", error.message);
                alert("Napaka pri odstranjevanju termina.");
                }
            }
        }
    });

    // Dodajanje/urejanje terminov
    elAddTermBtn.addEventListener('click', async () => {
        const day = elNewTermDay.value;
        const start = elNewTermStart.value;
        const end = elNewTermEnd.value;
        const dateFrom = elNewTermDateFrom.value;
        const dateTo = elNewTermDateTo.value;
        const label = `${DAY_SHORT_NAME[day]} ${start.slice(0, 5)}-${end.slice(0, 5)}`;
        const id = `${DAY_SHORT_NAME[day].toLowerCase().replace('.','')}-${start.replace(':','-')}-${end.replace(':','-')}`;

        if (!day || !start || !end || !dateFrom || !dateTo) {
            alert("Vsa polja morajo biti izpolnjena!");
            return;
        }
        
        const [dFrom, mFrom, yFrom] = dateFrom.split('/').map(s=>s.trim());
        const [dTo, mTo, yTo] = dateTo.split('/').map(s=>s.trim());
        const isoFrom = `${yFrom}-${mFrom}-${dFrom}`;
        const isoTo = `${yTo}-${mTo}-${dTo}`;

        try {
            const { error } = await supabase.from('terms').insert({ id, day, start_time: start, end_time: end, label, date_from: isoFrom, date_to: isoTo });
            if (error) throw error;
            updateStateAndRender();
        } catch (error) {
            console.error("Napaka pri dodajanju termina:", error.message);
            alert("Napaka pri dodajanju termina.");
        }
    });
    
    elSaveEditTermBtn.addEventListener('click', async () => {
      const dateFrom = elEditTermDateFrom.value;
      const dateTo = elEditTermDateTo.value;
      
      const [dFrom, mFrom, yFrom] = dateFrom.split('/').map(s=>s.trim());
      const [dTo, mTo, yTo] = dateTo.split('/').map(s=>s.trim());
      const isoFrom = `${yFrom}-${mFrom}-${dFrom}`;
      const isoTo = `${yTo}-${mTo}-${dTo}`;

      if (selectedTermToEdit) {
        try {
          const { error } = await supabase.from('terms').update({ date_from: isoFrom, date_to: isoTo }).eq('id', selectedTermToEdit.id);
          if (error) throw error;
          updateStateAndRender();
        } catch (error) {
          console.error("Napaka pri urejanju termina:", error.message);
          alert("Napaka pri urejanju termina.");
        }
      }
    });
    
    const deleteTerm = async (termId) => {
        if (confirm("Ali ste prepričani, da želite izbrisati ta termin? S tem boste izbrisali tudi vse podatke o prisotnosti za ta termin.")) {
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
    
    // Posodobitev prisotnosti
    async function saveAttendance(date, termId, swimmerId, status) {
        const ymd = iso(date);
        const { error } = await supabase
            .from('attendance')
            .upsert({ date: ymd, term_id: termId, swimmer_id: swimmerId, status: status }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
        if (error) {
            console.error('Napaka pri posodabljanju prisotnosti:', error);
            return false;
        }
        return true;
    }
    
    async function deleteAttendance(date, termId, swimmerId) {
        const ymd = iso(date);
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('date', ymd)
            .eq('term_id', termId)
            .eq('swimmer_id', swimmerId);
        if (error) {
            console.error('Napaka pri brisanju prisotnosti:', error);
            return false;
        }
        return true;
    }

    // Gumb za dodajanje plavalca v trening
    elAddToEventBtn.addEventListener("click", async () => {
        const swimmerId = elModalSwimmerSelect.value;
        if (swimmerId && modalCtx.date && modalCtx.termId) {
            await saveAttendance(modalCtx.date, modalCtx.termId, swimmerId, null);
            await openEvent(modalCtx.date, modalCtx.termId);
            refreshSwimmerPanel();
            renderMonth();
        }
    });

    // Upravljanje opomb
    elNotesBtn.addEventListener('click', () => {
        openNoteModal();
    });

    elSaveNotesBtn.addEventListener('click', async () => {
      if (!modalCtx) return;
      const ymd = iso(modalCtx.date);
      const termId = modalCtx.termId;
      const notes = elNotesInput.value;
      try {
        const { data, error } = await supabase
          .from('term_status')
          .upsert({ date: ymd, term_id: termId, notes: notes, status: 'active' }, { onConflict: ['date', 'term_id'] });
        if (error) throw error;
        closeNoteModal();
      } catch (error) {
        console.error("Napaka pri shranjevanju opomb:", error.message);
        alert("Napaka pri shranjevanju opomb.");
      }
    });

    elCancelNoteBtn.addEventListener('click', () => {
      closeNoteModal();
    });

    const openNoteModal = async () => {
      elNotesInput.value = "";
      if (modalCtx) {
        const ymd = iso(modalCtx.date);
        const termId = modalCtx.termId;
        const { data, error } = await supabase.from('term_status').select('notes').eq('date', ymd).eq('term_id', termId).single();
        if (data && data.notes) {
          elNotesInput.value = data.notes;
        }
      }
      openModal(elNoteModal);
    };

    // Vklop/izklop dogodka
    elToggleEventBtn.addEventListener('click', async () => {
      if (!modalCtx) return;
      const ymd = iso(modalCtx.date);
      const termId = modalCtx.termId;
      const termStatusData = termStatus[ymd]?.[termId];
      const newStatus = (termStatusData && termStatusData.status === 'deactivated') ? 'active' : 'deactivated';
      
      try {
        const { error } = await supabase.from('term_status').upsert({ date: ymd, term_id: termId, status: newStatus }, { onConflict: ['date', 'term_id'] });
        if (error) throw error;
        await updateStateAndRender();
        await openEvent(modalCtx.date, modalCtx.termId);
      } catch (error) {
        console.error("Napaka pri posodabljanju statusa dogodka:", error.message);
        alert("Napaka pri posodabljanju statusa dogodka.");
      }
    });

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
    
    const importSwimmers = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').slice(1).map(row => row.trim()).filter(Boolean);
            const swimmersToInsert = rows.map(row => {
                const [first_name, last_name, terms_str] = row.split(',').map(s => s.trim().replace(/"/g, ''));
                const terms = terms_str ? terms_str.split(',').map(s => s.trim()) : [];
                return { first_name, last_name, terms };
            });

            if (swimmersToInsert.length === 0) {
              alert("Datoteka je prazna ali napačne oblike.");
              return;
            }

            try {
              // Izbrišemo vse obstoječe plavalce
              await supabase.from('swimmers').delete().not('id', 'is.null');
              await supabase.from('attendance').delete().not('swimmer_id', 'is.null');

              const { error } = await supabase.from('swimmers').insert(swimmersToInsert);
              if (error) throw error;
              alert("Plavalci uspešno uvoženi!");
              updateStateAndRender();
            } catch (error) {
              console.error("Napaka pri uvozu plavalcev:", error.message);
              alert("Napaka pri uvozu plavalcev.");
            }
        };
        reader.readAsText(file);
    };

    const importTerms = (file) => {
      const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').slice(1).map(row => row.trim()).filter(Boolean);
            const termsToInsert = rows.map(row => {
                const [id, day, start_time, end_time, date_from, date_to] = row.split(',').map(s => s.trim().replace(/"/g, ''));
                const label = `${DAY_SHORT_NAME[day]} ${start_time.slice(0, 5)}-${end_time.slice(0, 5)}`;
                const [dFrom, mFrom, yFrom] = date_from.split('/');
                const [dTo, mTo, yTo] = date_to.split('/');
                const isoFrom = `${yFrom}-${mFrom}-${dFrom}`;
                const isoTo = `${yTo}-${mTo}-${dTo}`;
                return { id, day, start_time, end_time, label, date_from: isoFrom, date_to: isoTo };
            });

            if (termsToInsert.length === 0) {
              alert("Datoteka je prazna ali napačne oblike.");
              return;
            }

            try {
              // Izbrišemo vse obstoječe termine
              await supabase.from('terms').delete().not('id', 'is.null');
              await supabase.from('attendance').delete().not('term_id', 'is.null');
              await supabase.from('term_status').delete().not('term_id', 'is.null');

              const { error } = await supabase.from('terms').insert(termsToInsert);
              if (error) throw error;
              alert("Termini uspešno uvoženi!");
              updateStateAndRender();
            } catch (error) {
              console.error("Napaka pri uvozu terminov:", error.message);
              alert("Napaka pri uvozu terminov.");
            }
        };
        reader.readAsText(file);
    };

    const exportCsv = async () => {
      const exportMonth = elExportMonthSelect.value;
      const exportYear = elExportYearSelect.value;
      if (!exportMonth || !exportYear) {
        alert("Prosim izberite mesec in leto za izvoz.");
        return;
      }

      const firstDay = new Date(exportYear, exportMonth, 1);
      const lastDay = new Date(exportYear, parseInt(exportMonth) + 1, 0);
      const startDate = iso(firstDay);
      const endDate = iso(lastDay);

      try {
        const { data: attendanceData, error } = await supabase
          .from('attendance')
          .select('date, term_id, swimmer_id, status')
          .gte('date', startDate)
          .lte('date', endDate);

        if (error) throw error;

        const csvRows = [];
        csvRows.push(['Datum', 'Termin', 'Ime in priimek', 'Prisotnost'].join(','));

        for (const row of attendanceData) {
          const swimmer = swimmers.find(s => s.id === row.swimmer_id);
          const term = TERMS.find(t => t.id === row.term_id);
          if (swimmer && term) {
            const statusText = row.status === true ? 'Prisoten' : (row.status === false ? 'Odsoten' : 'Neznano');
            const csvRow = [
              row.date,
              term.label,
              `"${swimmer.first_name} ${swimmer.last_name}"`,
              `"${statusText}"`
            ];
            csvRows.push(csvRow.join(','));
          }
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `prisotnost-${exportMonth}-${exportYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Podatki uspešno izvoženi v CSV!");
      } catch (error) {
        console.error("Napaka pri izvozu:", error.message);
        alert("Napaka pri izvozu podatkov.");
      }
    };


    // ===== Začetno nalaganje in dogodki =====
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

    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("closeModalBtnFooter").addEventListener("click", closeModal);
    document.getElementById("closeDayModalBtn").addEventListener("click", closeDayModal);
    document.getElementById("closeNoteModalBtn").addEventListener("click", closeNoteModal);
    document.getElementById("closeEditTermModalBtn").addEventListener("click", closeEditTermModal);

    // Začetno nalaganje
    updateStateAndRender();
});