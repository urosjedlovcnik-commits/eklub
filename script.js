// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let attendance = {};
    let termStatus = {};
    let currentEditTermId = null;
    let currentEditSwimmerId = null;

    const DAYNAME = ["", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
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
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn");
    const elEditSwimmerBtn = document.getElementById("editSwimmerBtn");
    const elExportSelectTerm = document.getElementById("exportSelectTerm");
    const elExportSelectSwimmer = document.getElementById("exportSelectSwimmer");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");
    const elCsvInput = document.getElementById("csvInput");
    const elCsvTermsInput = document.getElementById("csvTermsInput");
    const elClearDbBtn = document.getElementById("clearDbBtn");
    const elDayModal = document.getElementById("dayModal");
    const elDayModalTitle = document.getElementById("dayModalTitle");
    const elCloseDayModalBtn = document.getElementById("closeDayModalBtn");
    const elDayModalList = document.getElementById("dayModalList");
    const elNoteModal = document.getElementById("noteModal");
    const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");
    const elNoteInput = document.getElementById("noteInput");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elDeleteTermBtn = document.getElementById("deleteTermBtn");
    const elEditTermBtn = document.getElementById("editTermBtn");
    const elEditTermModal = document.getElementById('editTermModal');
    const elCloseEditTermModalBtn = document.getElementById('closeEditTermModalBtn');
    const elEditTermModalTitle = document.getElementById('editTermModalTitle');
    const elEditTermDateFrom = document.getElementById('editTermDateFrom');
    const elEditTermDateTo = document.getElementById('editTermDateTo');
    const elSaveEditTermBtn = document.getElementById('saveEditTermBtn');
    const elTermSelect = document.getElementById('termSelect');
    const elEditSwimmerModal = document.getElementById('editSwimmerModal');
    const elCloseEditSwimmerModalBtn = document.getElementById('closeEditSwimmerModalBtn');
    const elEditSwimmerModalTitle = document.getElementById('editSwimmerModalTitle');
    const elEditSwimmerFirstName = document.getElementById('editSwimmerFirstName');
    const elEditSwimmerLastName = document.getElementById('editSwimmerLastName');
    const elSaveEditSwimmerBtn = document.getElementById('saveEditSwimmerBtn');

    // Spremenljivke za koledar
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();

    // Spremenljivke za Supabase
    const SUPABASE_URL = "https://tizjimlwfkoniixbetgr.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aW...o9nQ1D_1l0lJj7Wq448";
    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ===== Funkcije =====

    async function updateStateAndRender() {
        try {
            await loadInitialState();
            renderMonth();
        } catch (error) {
            console.error("Napaka pri posodabljanju stanja:", error);
            alert("Prišlo je do napake pri nalaganju podatkov.");
        }
    }

    function renderMonth() {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const monthName = firstDay.toLocaleString('sl-SI', { month: 'long', year: 'numeric' });
        elMonthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        elCalendarGrid.innerHTML = '';

        // Določimo dan v tednu za prvi dan (0 = nedelja, 1 = ponedeljek ...)
        let startDay = (firstDay.getDay() === 0) ? 6 : firstDay.getDay() - 1;

        // Prazni dnevi na začetku meseca
        for (let i = 0; i < startDay; i++) {
            elCalendarGrid.innerHTML += '<div class="day disabled"></div>';
        }

        // Dnevi v mesecu
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const currentDate = new Date(currentYear, currentMonth, i);
            const dateStr = formatDateToYYMMDD(currentDate);
            const dayOfWeek = currentDate.getDay();
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayElement.classList.add('weekend');
            }

            // Prikaz dogodkov (terminov)
            const dayTerms = TERMS.filter(t => isDateInTerm(currentDate, t));
            const dayStatus = termStatus[dateStr] || {};
            const dayEvents = dayTerms.map(t => {
                const termId = t.id;
                const statusInfo = dayStatus[termId] || { status: 'unfilled' };
                const eventEl = document.createElement('div');
                eventEl.className = 'event';
                eventEl.dataset.termId = termId;
                eventEl.dataset.date = dateStr;
                eventEl.textContent = `${t.description} ${t.time}`;
                eventEl.dataset.status = statusInfo.status;
                if (statusInfo.status === 'unfilled') {
                    eventEl.classList.add('unfilled');
                } else if (statusInfo.status === 'complete') {
                    eventEl.classList.add('complete');
                } else if (statusInfo.status === 'disabled') {
                    eventEl.classList.add('disabled');
                } else if (statusInfo.status === 'partial') {
                    eventEl.classList.add('partial');
                }
                return eventEl;
            });

            dayElement.innerHTML = `<span class="day-number">${i}</span>`;

            const eventContainer = document.createElement('div');
            eventContainer.className = 'events-container';
            dayEvents.forEach(el => eventContainer.appendChild(el));
            dayElement.appendChild(eventContainer);

            // Dodaj dogodek za odpiranje modala
            dayElement.addEventListener('click', () => openDayModal(dateStr, dayEvents, dayOfWeek));
            elCalendarGrid.appendChild(dayElement);
        }
    }

    // Pomožne funkcije
    function formatDateToYYMMDD(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatDateToDDMMYY(date) {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function isDateInTerm(date, term) {
        const dayOfWeek = date.getDay();
        const dayName = DAYNAME[dayOfWeek];
        if (!term.weekdays.includes(dayName)) {
            return false;
        }

        const from = new Date(term.date_from);
        const to = new Date(term.date_to);
        return date >= from && date <= to;
    }

    function openDayModal(dateStr, events, dayOfWeek) {
        elDayModalTitle.textContent = `${DAY_SHORT_NAME[dayOfWeek]}, ${dateStr}`;
        elDayModalList.innerHTML = '';
        elDayModal.style.display = 'block';

        if (events.length === 0) {
            elDayModalList.innerHTML = '<p>Na ta dan ni treningov.</p>';
            return;
        }

        events.forEach(eventEl => {
            const termId = eventEl.dataset.termId;
            const term = TERMS.find(t => t.id == termId);
            if (!term) return;

            const div = document.createElement('div');
            div.className = 'event-summary';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'event-title';
            titleSpan.textContent = term.description;
            div.appendChild(titleSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'event-time';
            timeSpan.textContent = ` (${term.time})`;
            div.appendChild(timeSpan);

            const attendanceStatus = document.createElement('span');
            const status = eventEl.dataset.status;
            attendanceStatus.className = `event-status ${status}`;

            if (status === 'complete') {
                attendanceStatus.textContent = 'Popolna prisotnost';
            } else if (status === 'partial') {
                attendanceStatus.textContent = 'Delna prisotnost';
            } else if (status === 'disabled') {
                attendanceStatus.textContent = 'Deaktivirano';
            } else {
                attendanceStatus.textContent = 'Manjka';
            }
            div.appendChild(attendanceStatus);

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'event-buttons';

            if (status === 'disabled') {
                const enableBtn = document.createElement('button');
                enableBtn.className = 'btn pri';
                enableBtn.textContent = 'Omogoči';
                enableBtn.onclick = () => updateTermStatus(dateStr, termId, 'unfilled', '');
                buttonContainer.appendChild(enableBtn);
            } else {
                const disableBtn = document.createElement('button');
                disableBtn.className = 'btn warn';
                disableBtn.textContent = 'Deaktiviraj';
                disableBtn.onclick = () => openNoteModal(dateStr, termId);
                buttonContainer.appendChild(disableBtn);
            }

            const attendanceBtn = document.createElement('button');
            attendanceBtn.className = 'btn ok';
            attendanceBtn.textContent = 'Vnos prisotnosti';
            attendanceBtn.onclick = () => window.location.href = `/prisotnost?date=${dateStr}&term_id=${termId}`;
            buttonContainer.appendChild(attendanceBtn);

            div.appendChild(buttonContainer);
            elDayModalList.appendChild(div);
        });
    }

    // Posodobitev statusa v bazi in osvežitev
    async function updateTermStatus(date, term_id, status, note) {
        try {
            const { data, error } = await supabase
                .from('term_status')
                .upsert({ date, term_id, status, note }, { onConflict: ['date', 'term_id'] })
                .select();
            if (error) throw error;
            console.log('Status uspešno posodobljen', data);
            await loadInitialState(); // Ponovno naloži vsa stanja
            renderMonth();
            elDayModal.style.display = 'none';
        } catch (error) {
            console.error('Napaka pri posodabljanju statusa:', error);
            alert('Napaka pri posodabljanju statusa.');
        }
    }

    // Funkcija za odpiranje modala za opombo
    function openNoteModal(date, termId) {
        elDayModal.style.display = 'none';
        elNoteModal.style.display = 'block';
        elNoteInput.value = '';
        elConfirmNoteBtn.onclick = () => {
            const note = elNoteInput.value.trim();
            updateTermStatus(date, termId, 'disabled', note);
            elNoteModal.style.display = 'none';
        };
        elCancelNoteBtn.onclick = () => {
            elNoteModal.style.display = 'none';
            openDayModal(date, TERMS.filter(t => isDateInTerm(new Date(date), t)).map(t => ({
                dataset: {
                    termId: t.id,
                    date: date,
                    status: termStatus[date]?.[t.id]?.status || 'unfilled'
                }
            })), new Date(date).getDay());
        };
    }
    
    // Funkcija za uvoz plavalcev
    async function importSwimmers(file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        const newSwimmers = rows.map(row => {
          const [first_name, last_name, terms_str] = row.split(';');
          return {
            first_name,
            last_name,
            terms: terms_str ? terms_str.split(',').map(s => s.trim()) : []
          };
        });

        try {
          const { error } = await supabase.from('swimmers').upsert(newSwimmers, { onConflict: ['first_name', 'last_name'] });
          if (error) throw error;
          alert('Plavalci uspešno uvoženi!');
          updateStateAndRender();
        } catch (error) {
          console.error('Napaka pri uvozu plavalcev:', error);
          alert('Napaka pri uvozu plavalcev.');
        }
      };
      reader.readAsText(file);
    }
    
    // Funkcija za uvoz terminov
    async function importTerms(file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        const newTerms = rows.map(row => {
          const [description, date_from, date_to, time, weekdays_str] = row.split(';');
          return {
            description,
            date_from: date_from.trim(),
            date_to: date_to.trim(),
            time: time.trim(),
            weekdays: weekdays_str.split(',').map(s => s.trim())
          };
        });

        try {
          const { error } = await supabase.from('terms').upsert(newTerms, { onConflict: ['description', 'date_from', 'time'] });
          if (error) throw error;
          alert('Termini uspešno uvoženi!');
          updateStateAndRender();
        } catch (error) {
          console.error('Napaka pri uvozu terminov:', error);
          alert('Napaka pri uvozu terminov.');
        }
      };
      reader.readAsText(file);
    }
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}.${month}.${year}`;
    }

    // Dodana funkcija za brisanje termina
    elDeleteTermBtn.addEventListener('click', async () => {
        const termId = elTermSelect.value;
        if (!termId) {
            alert('Prosim, izberite termin za izbris.');
            return;
        }

        if (confirm('Ali ste prepričani, da želite izbrisati ta termin? Izbrisani bodo tudi vsi podatki o prisotnosti, povezani s tem terminom.')) {
            try {
                // Izbriši prisotnost
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
    });
    
    // Urejanje termina
    elEditTermBtn.addEventListener('click', () => {
        const termId = elTermSelect.value;
        if (!termId) {
            alert('Prosim, izberite termin za urejanje.');
            return;
        }
        const term = TERMS.find(t => t.id == termId);
        if (term) {
            currentEditTermId = termId;
            elEditTermModalTitle.textContent = `Uredi termin: ${term.description}`;
            elEditTermDateFrom.value = formatDateToDDMMYY(new Date(term.date_from));
            elEditTermDateTo.value = formatDateToDDMMYY(new Date(term.date_to));
            elEditTermModal.style.display = 'block';
        } else {
            alert('Izbrani termin ni najden.');
        }
    });

    elSaveEditTermBtn.addEventListener('click', async () => {
        if (!currentEditTermId) return;

        const dateFrom = elEditTermDateFrom.value;
        const dateTo = elEditTermDateTo.value;

        // Preveri, če sta datuma veljavna
        const [dayFrom, monthFrom, yearFrom] = dateFrom.split('.').map(Number);
        const [dayTo, monthTo, yearTo] = dateTo.split('.').map(Number);

        const newDateFrom = new Date(yearFrom, monthFrom - 1, dayFrom);
        const newDateTo = new Date(yearTo, monthTo - 1, dayTo);

        if (isNaN(newDateFrom) || isNaN(newDateTo)) {
            alert('Prosim, vnesite veljavna datuma v formatu dd.mm.yyyy');
            return;
        }

        try {
            const { error } = await supabase
                .from('terms')
                .update({ date_from: newDateFrom.toISOString().split('T')[0], date_to: newDateTo.toISOString().split('T')[0] })
                .eq('id', currentEditTermId);

            if (error) throw error;
            alert('Termin uspešno posodobljen!');
            elEditTermModal.style.display = 'none';
            updateStateAndRender();
        } catch (error) {
            console.error("Napaka pri urejanju termina:", error.message);
            alert("Napaka pri urejanju termina.");
        }
    });
    
    // Brisanje plavalca
    elDeleteSwimmerBtn.addEventListener('click', async () => {
      const swimmerId = elSwimmerSelect.value;
      if (!swimmerId) {
          alert('Prosim, izberite plavalca za izbris.');
          return;
      }
      if (confirm('Ali ste prepričani, da želite izbrisati tega plavalca? Izbrisani bodo tudi vsi podatki o prisotnosti, povezani s tem plavalcem.')) {
          try {
              // Izbriši prisotnost
              const { error: attendanceError } = await supabase.from('attendance')
                  .delete()
                  .eq('swimmer_id', swimmerId);
              if (attendanceError) throw attendanceError;
              
              // Izbriši plavalca
              const { error: swimmerError } = await supabase.from('swimmers')
                  .delete()
                  .eq('id', swimmerId);
              if (swimmerError) throw swimmerError;
              
              alert('Plavalec uspešno izbrisan!');
              updateStateAndRender();
          } catch (error) {
              console.error("Napaka pri brisanju plavalca:", error.message);
              alert("Napaka pri brisanju plavalca.");
          }
      }
    });

    // Urejanje plavalca
    elEditSwimmerBtn.addEventListener('click', () => {
      const swimmerId = elSwimmerSelect.value;
      if (!swimmerId) {
          alert('Prosim, izberite plavalca za urejanje.');
          return;
      }
      const swimmer = swimmers.find(s => s.id == swimmerId);
      if (swimmer) {
          currentEditSwimmerId = swimmerId;
          elEditSwimmerModalTitle.textContent = `Uredi plavalca: ${swimmer.first_name} ${swimmer.last_name}`;
          elEditSwimmerFirstName.value = swimmer.first_name;
          elEditSwimmerLastName.value = swimmer.last_name;
          elEditSwimmerModal.style.display = 'block';
      } else {
          alert('Izbrani plavalec ni najden.');
      }
    });

    elSaveEditSwimmerBtn.addEventListener('click', async () => {
      if (!currentEditSwimmerId) return;

      const newFirstName = elEditSwimmerFirstName.value.trim();
      const newLastName = elEditSwimmerLastName.value.trim();

      if (newFirstName === '' || newLastName === '') {
          alert('Ime in priimek ne smeta biti prazna.');
          return;
      }

      try {
          const { error } = await supabase
              .from('swimmers')
              .update({ first_name: newFirstName, last_name: newLastName })
              .eq('id', currentEditSwimmerId);

          if (error) throw error;
          alert('Plavalec uspešno posodobljen!');
          elEditSwimmerModal.style.display = 'none';
          updateStateAndRender();
      } catch (error) {
          console.error("Napaka pri urejanju plavalca:", error.message);
          alert("Napaka pri urejanju plavalca.");
      }
    });

    // Zapiranje modalov
    elCloseDayModalBtn.addEventListener('click', () => elDayModal.style.display = 'none');
    elCloseNoteModalBtn.addEventListener('click', () => elNoteModal.style.display = 'none');
    elCloseEditTermModalBtn.addEventListener('click', () => elEditTermModal.style.display = 'none');
    elCloseEditSwimmerModalBtn.addEventListener('click', () => elEditSwimmerModal.style.display = 'none');
    
    // Navigacija koledarja
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

    // Funkcije za dodajanje plavalcev
    function clearNewSwimmerInputs() {
        elNewFirst.value = '';
        elNewLast.value = '';
    }

    async function refreshSwimmerPanel() {
        elSwimmerSelect.innerHTML = '';
        swimmers.forEach(swimmer => {
            const option = document.createElement('option');
            option.value = swimmer.id;
            option.textContent = `${swimmer.first_name} ${swimmer.last_name}`;
            elSwimmerSelect.appendChild(option);
        });
        
        // Posodobi tudi dropdown za izvoz
        populateExportSelects();
    }
    
    elAddSwimmerBtn.addEventListener('click', async () => {
        const first = elNewFirst.value.trim();
        const last = elNewLast.value.trim();
        if (first === '' || last === '') {
            alert('Prosim, vnesite ime in priimek plavalca.');
            return;
        }

        const newSwimmer = { first_name: first, last_name: last };

        try {
            const { data, error } = await supabase
                .from('swimmers')
                .insert([newSwimmer])
                .select();

            if (error) throw error;

            swimmers.push(data[0]);

            console.log('Plavalec uspešno dodan:', data[0]);
            clearNewSwimmerInputs();
            refreshSwimmerPanel();

        } catch (error) {
            console.error('Napaka pri dodajanju plavalca:', error);
            alert('Prišlo je do napake pri dodajanju plavalca.');
        }
    });

    // Uvoz/izvoz
    function populateExportSelects() {
        elExportSelectSwimmer.innerHTML = '<option value="">Vsi plavalci</option>';
        swimmers.forEach(swimmer => {
            const option = document.createElement('option');
            option.value = swimmer.id;
            option.textContent = `${swimmer.first_name} ${swimmer.last_name}`;
            elExportSelectSwimmer.appendChild(option);
        });

        elExportSelectTerm.innerHTML = '<option value="">Vsi termini</option>';
        TERMS.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = term.description;
            elExportSelectTerm.appendChild(option);
        });
        
        elTermSelect.innerHTML = '';
        TERMS.forEach(term => {
            const option = document.createElement('option');
            option.value = term.id;
            option.textContent = term.description;
            elTermSelect.appendChild(option);
        });
    }

    async function exportCsv() {
        const selectedSwimmerId = elExportSelectSwimmer.value;
        const selectedTermId = elExportSelectTerm.value;

        let query = supabase.from('attendance').select('date, swimmers(first_name, last_name), terms(description), status');

        if (selectedSwimmerId) {
            query = query.eq('swimmer_id', selectedSwimmerId);
        }
        if (selectedTermId) {
            query = query.eq('term_id', selectedTermId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Napaka pri izvozu:', error);
            alert('Napaka pri izvozu podatkov.');
            return;
        }

        // Priprava CSV
        const header = ["Datum", "Plavalec", "Trening", "Status"];
        const rows = data.map(row => {
            const swimmerName = row.swimmers ? `${row.swimmers.first_name} ${row.swimmers.last_name}` : 'Neznan';
            const termName = row.terms ? row.terms.description : 'Neznan';
            const statusText = row.status === 'unfilled' ? 'Manjka' : row.status === 'complete' ? 'Prisoten' : 'Opravičen';
            return [row.date, swimmerName, termName, statusText];
        });

        const csvContent = [
            header.join(';'),
            ...rows.map(e => e.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "prisotnost.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Brisanje vseh podatkov iz baze
    elClearDbBtn.addEventListener('click', async () => {
      if (confirm('Ali ste prepričani, da želite izbrisati VSE podatke (plavalce, termine in prisotnost)? Tega ne morete razveljaviti.')) {
        try {
          await supabase.from('attendance').delete().gt('id', 0);
          await supabase.from('term_status').delete().gt('id', 0);
          await supabase.from('swimmers').delete().gt('id', 0);
          await supabase.from('terms').delete().gt('id', 0);

          swimmers = [];
          TERMS = [];
          attendance = {};
          termStatus = {};

          alert('Vsi podatki so bili uspešno izbrisani.');
          updateStateAndRender();
        } catch (error) {
          console.error('Napaka pri brisanju podatkov:', error);
          alert('Napaka pri brisanju podatkov.');
        }
      }
    });
    
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
    

    async function loadInitialState() {
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
            console.error("Napaka pri nalaganju začetnega stanja:", error);
            alert("Napaka pri nalaganju začetnih podatkov.");
          }
    }

    // Prvo nalaganje
    loadInitialState();
});