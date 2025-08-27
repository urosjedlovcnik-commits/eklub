// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

  // ===== AUTENTIKACIJA =====
  let currentUser = null;
  let userTerms = []; // Termini, ki pripadajo trenerju

  // UI elementi za autentikacijo
  const loginScreen = document.getElementById('loginScreen');
  const mainApp = document.getElementById('mainApp');
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const loginSuccess = document.getElementById('loginSuccess');
  const userName = document.getElementById('userName');
  const userGroups = document.getElementById('userGroups');
  const logoutBtn = document.getElementById('logoutBtn');

  // UI elementi za nadomestne trenerje
  const substituteTermSelect = document.getElementById('substituteTermSelect');
  const substituteDateInput = document.getElementById('substituteDateInput');
  const substituteTrainerSelect = document.getElementById('substituteTrainerSelect');
  const substituteReasonInput = document.getElementById('substituteReasonInput');
  const addSubstituteBtn = document.getElementById('addSubstituteBtn');
  const mySubstitutionsList = document.getElementById('mySubstitutionsList');
  const substituteObligationsList = document.getElementById('substituteObligationsList');
  
  // Modal elementi za nadomestne trenerje
  const confirmSubstituteModal = document.getElementById('confirmSubstituteModal');
  const substituteConfirmationDetails = document.getElementById('substituteConfirmationDetails');
  const closeConfirmSubstituteModalBtn = document.getElementById('closeConfirmSubstituteModalBtn');
  const cancelSubstituteBtn = document.getElementById('cancelSubstituteBtn');
  const confirmSubstituteBtn = document.getElementById('confirmSubstituteBtn');

  // Preveri, če je uporabnik že prijavljen
  async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          currentUser = user;
          await loadUserTerms();
          showMainApp();
              // Naloži podatke za trenerja po tem, ko so userTerms naloženi
  await loadDataFromSupabase();
  // Naloži podatke za nadomestne trenerje
  await loadSubstituteData();
  // Naloži nadomestne termine
  await loadSubstituteTerms();
} else {
  showLoginScreen();
}
  }

  // Naloži termine, ki pripadajo trenerju
  async function loadUserTerms() {
      try {
          console.log('=== LOAD USER TERMS START ===');
          console.log('Current user ID:', currentUser.id);
          
          // Najprej poiščemo trenerja v tabeli trenerjev
          const { data: trainerData, error: trainerError } = await supabase
              .from('trainers')
              .select('*')
              .eq('user_id', currentUser.id)
              .single();

          if (trainerError || !trainerData) {
              console.error('Trener ni najden:', trainerError);
              console.log('Poskušam najti trenerja z user_id:', currentUser.id);
              return;
          }
          
          console.log('Najden trener:', trainerData);

          // Naložimo termine, ki pripadajo temu trenerju
          console.log('Iščem termine za trenerja z ID:', trainerData.id);
          const { data: termsData, error: termsError } = await supabase
              .from('trainer_terms')
              .select('term_id')
              .eq('trainer_id', trainerData.id);

          if (termsError) {
              console.error('Napaka pri nalaganju terminov:', termsError);
              return;
          }
          
          console.log('Termini trenerja iz baze:', termsData);

          userTerms = termsData.map(t => t.term_id);
          console.log('Mapirani userTerms:', userTerms);
          
          // Posodobi prikaz
          userName.textContent = `${trainerData.first_name} ${trainerData.last_name}`;
          userGroups.textContent = userTerms.length > 0 ? `${userTerms.length} skupin` : 'Ni skupin';
          console.log('Posodobljen prikaz trenerja:', userName.textContent, userGroups.textContent);
          
          // Če trener nima terminov, prikaži sporočilo
          if (userTerms.length === 0) {
              console.warn('Trener nima dodeljenih terminov');
              elSummaryBox.innerHTML = '<div class="error-message">Trener nima dodeljenih terminov. Kontaktirajte administratorja.</div>';
          } else {
              console.log('Trener ima', userTerms.length, 'terminov');
          }
          
          console.log('=== LOAD USER TERMS END ===');
          
      } catch (error) {
          console.error('Napaka pri nalaganju podatkov trenerja:', error);
          console.error('Napaka podrobnosti:', error.message);
      }
  }

  // Prikaži login zaslon
  function showLoginScreen() {
      loginScreen.classList.remove('hidden');
      mainApp.classList.add('hidden');
  }

  // Prikaži glavno aplikacijo
  function showMainApp() {
      loginScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
  }

  // Prijava
  loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value;
      const password = passwordInput.value;

      try {
          const { data, error } = await supabase.auth.signInWithPassword({
              email: email,
              password: password
          });

          if (error) {
              showError(error.message);
              return;
          }

          currentUser = data.user;
          await loadUserTerms();
          showMainApp();
          // Naloži podatke za trenerja po tem, ko so userTerms naloženi
          await loadDataFromSupabase();
          showSuccess('Uspešna prijava!');
          
      } catch (error) {
          showError('Napaka pri prijavi: ' + error.message);
      }
  });

  // Odjava
  logoutBtn.addEventListener('click', async () => {
      try {
          await supabase.auth.signOut();
          currentUser = null;
          userTerms = [];
          showLoginScreen();
          hideMessages();
      } catch (error) {
          showError('Napaka pri odjavi: ' + error.message);
      }
  });

  // ===== SPREMEMBA GESLA =====
  
  // UI elementi za spremembo gesla
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordModal = document.getElementById('changePasswordModal');
  const closeChangePasswordModalBtn = document.getElementById('closeChangePasswordModalBtn');
  const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordChangeError = document.getElementById('passwordChangeError');
  const passwordChangeSuccess = document.getElementById('passwordChangeSuccess');

  // Odpri modal za spremembo gesla
  changePasswordBtn.addEventListener('click', () => {
      changePasswordModal.classList.remove('hidden');
      clearPasswordForm();
  });

  // Zapri modal za spremembo gesla
  closeChangePasswordModalBtn.addEventListener('click', () => {
      changePasswordModal.classList.add('hidden');
      clearPasswordForm();
  });

  cancelChangePasswordBtn.addEventListener('click', () => {
      changePasswordModal.classList.add('hidden');
      clearPasswordForm();
  });

  // Sprememba gesla
  changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Preveri, če se gesli ujemata
      if (newPassword !== confirmPassword) {
          showPasswordChangeError('Novi gesli se ne ujemata.');
          return;
      }

      // Preveri dolžino gesla
      if (newPassword.length < 6) {
          showPasswordChangeError('Novo geslo mora biti dolgo vsaj 6 znakov.');
          return;
      }

      try {
          // Posodobi geslo v Supabase
          const { error } = await supabase.auth.updateUser({
              password: newPassword
          });

          if (error) {
              showPasswordChangeError('Napaka pri spremembi gesla: ' + error.message);
              return;
          }

          showPasswordChangeSuccess('Geslo je bilo uspešno spremenjeno!');
          
          // Počisti obrazec in zapri modal po 2 sekundah
          setTimeout(() => {
              changePasswordModal.classList.add('hidden');
              clearPasswordForm();
          }, 2000);

      } catch (error) {
          showPasswordChangeError('Napaka pri spremembi gesla: ' + error.message);
      }
  });

  // Pomožne funkcije za spremembo gesla
  function showPasswordChangeError(message) {
      passwordChangeError.textContent = message;
      passwordChangeError.classList.remove('hidden');
      passwordChangeSuccess.classList.add('hidden');
  }

  function showPasswordChangeSuccess(message) {
      passwordChangeSuccess.textContent = message;
      passwordChangeSuccess.classList.remove('hidden');
      passwordChangeError.classList.add('hidden');
  }

  function clearPasswordForm() {
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      passwordChangeError.classList.add('hidden');
      passwordChangeSuccess.classList.add('hidden');
  }

  // Pomožne funkcije za sporočila
  function showError(message) {
      loginError.textContent = message;
      loginError.classList.remove('hidden');
      loginSuccess.classList.add('hidden');
  }

  function showSuccess(message) {
      loginSuccess.textContent = message;
      loginSuccess.classList.remove('hidden');
      loginError.classList.add('hidden');
  }

  function hideMessages() {
      loginError.classList.add('hidden');
      loginSuccess.classList.add('hidden');
  }

  // Preveri autentikacijo ob nalaganju
  checkAuth();

  // ===== GLAVNA APLIKACIJA =====
  
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
  const elTermSelect = document.getElementById("termSelect");
  const elAssignTermBtn = document.getElementById("assignTermBtn");
  const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn"); 
  const elSwimmerInfo = document.getElementById("swimmerInfo");
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
  const elModal = document.getElementById("eventModal");
  const elModalTitle = document.getElementById("modalTitle");
  const elModalMeta = document.getElementById("modalMeta");
  const elAttendanceTable = document.getElementById("attendanceTable").querySelector("tbody");
  const elSubstitutionTable = document.getElementById("substitutionTable").querySelector("tbody");
  const elToggleEventBtn = document.getElementById("toggleEventBtn");
  const elCloseModalBtn = document.getElementById("closeModalBtn");
  const elModalSwimmerSelect = document.getElementById("modalSwimmerSelect");
  const elAddToEventBtn = document.getElementById("addToEventBtn");
  const elInactiveNote = document.getElementById("inactiveNote");
  const elInactiveNoteText = document.getElementById("inactiveNoteText");
  const elDayModal = document.getElementById("dayModal");
  const elDayModalTitle = document.getElementById("dayModalTitle");
  const elDayModalList = document.getElementById("dayModalList");
  const elCloseDayModalBtn = document.getElementById("closeDayModalBtn");
  const elEditTermModal = document.getElementById("editTermModal");
  const elEditTermModalTitle = document.getElementById("editTermModalTitle");
  const elEditTermDateFrom = document.getElementById("editTermDateFrom");
  const elEditTermDateTo = document.getElementById("editTermDateTo");
  const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
  const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");
  const elNoteModal = document.getElementById("noteModal");
  const elNoteInput = document.getElementById("noteInput");
  const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
  const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
  const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");
  const elNotesInput = document.getElementById("notesInput");
  const elSaveNotesBtn = document.getElementById("saveNotesBtn");

  // ===== Pomožne funkcije =====
  function mkSwimmer(first,last,terms=[]){ return { first_name:first, last_name:last, terms:[...new Set(terms)] }; }
  function iso(d){ return d.toISOString().slice(0,10); }
  function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
  function isToday(d){ const t=new Date(); return d.getFullYear()==t.getFullYear() && d.getMonth()==t.getMonth() && d.getDate()==t.getDate(); }
  function isPast(d){ const t=new Date(); t.setHours(0,0,0,0); return d.getTime() < t.getTime(); }
  function startWeekday(y,m){ let w=new Date(y,m,1).getDay(); return w===0?7:w; } // pon=1

  function parseDate(dateStr) {
    const parts = dateStr.split(/[\s/.]/).filter(Boolean);
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  }

  // ===== KOLENDAR =====
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth();

  function renderCalendar() {
    const year = currentYear;
    const month = currentMonth;
    const daysInMonthCount = daysInMonth(year, month);
    const startWeekdayNum = startWeekday(year, month);
    
    elMonthLabel.textContent = `${DAYNAME[month + 1]} ${year}`;
    
    let html = '';
    let dayCount = 1;
    
    for (let week = 0; week < 6; week++) {
      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        if (week === 0 && dayOfWeek < startWeekdayNum) {
          html += '<div class="calendar-day empty"></div>';
        } else if (dayCount > daysInMonthCount) {
          html += '<div class="calendar-day empty"></div>';
        } else {
          const date = new Date(year, month, dayCount);
          const dateStr = iso(date);
          const events = getEventsForDate(dateStr);
          const isTodayClass = isToday(date) ? ' today' : '';
          const isPastClass = isPast(date) ? ' past' : '';
          
          html += `<div class="calendar-day${isTodayClass}${isPastClass}" data-date="${dateStr}">`;
          html += `<div class="day-number">${dayCount}</div>`;
          
          if (events.length > 0) {
            events.forEach(event => {
              const statusClass = getStatusClass(event.status);
              html += `<div class="event ${statusClass}" data-term-id="${event.termId}" data-date="${dateStr}">`;
              html += `<div class="event-time">${event.time}</div>`;
              html += `<div class="event-count">${event.count}/${event.total}</div>`;
              html += `</div>`;
            });
          }
          
          html += '</div>';
          dayCount++;
        }
      }
    }
    
    elCalendarGrid.innerHTML = html;
    
    // Dodaj event listenerje za dogodke
    document.querySelectorAll('.event').forEach(eventEl => {
      eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const termId = eventEl.dataset.termId;
        const date = eventEl.dataset.date;
        openEventModal(termId, date);
      });
    });
  }

  function getEventsForDate(dateStr) {
    const events = [];
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    
    console.log(`getEventsForDate: ${dateStr}, dayOfWeek: ${dayOfWeek}, TERMS.length: ${TERMS.length}, userTerms:`, userTerms);
    
    TERMS.forEach(term => {
      // Preveri, če termin pripada trenerju
      if (!userTerms.includes(term.id)) {
        console.log(`Termin ${term.id} ne pripada trenerju`);
        return;
      }
      
      console.log(`Preverjam termin ${term.id}, dan: ${term.day}, date_from: ${term.date_from}, date_to: ${term.date_to}`);
      
      if (term.day === dayOfWeek) {
        // Podatki iz baze so v ISO formatu (YYYY-MM-DD), ne potrebujemo parseDate
        const termDateFrom = new Date(term.date_from);
        const termDateTo = new Date(term.date_to);
        
        console.log(`Termin ${term.id}: termDateFrom: ${termDateFrom}, termDateTo: ${termDateTo}, date: ${date}`);
        
        if (termDateFrom && termDateTo && date >= termDateFrom && date <= termDateTo) {
          const termKey = `${term.id}-${dateStr}`;
          const termAtt = attendance[termKey] || {};
          const assignedSwimmers = swimmers.filter(s => s.terms.includes(term.id) && !s.is_deleted);
          const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
          const markedAssignedSwimmersCount = assignedSwimmerIds.filter(id => termAtt.hasOwnProperty(id)).length;
          const totalAssignedCount = assignedSwimmers.length;
          
          let status = 'active';
          if (termStatus[termKey]) {
            status = termStatus[termKey].status;
          } else if (markedAssignedSwimmersCount === 0) {
            status = 'empty';
          } else if (markedAssignedSwimmersCount === totalAssignedCount) {
            status = 'full';
          }
          
          events.push({
            termId: term.id,
            time: `${term.start_time}-${term.end_time}`,
            count: markedAssignedSwimmersCount,
            total: totalAssignedCount,
            status: status
          });
        }
      }
    });
    
    return events;
  }

  function getStatusClass(status) {
    switch (status) {
      case 'inactive': return 'inactive';
      case 'empty': return 'empty';
      case 'full': return 'full';
      default: return 'active';
    }
  }

  // ===== MODAL ZA DOGODKE =====
  let currentEventTermId = null;
  let currentEventDate = null;

  function openEventModal(termId, date) {
    currentEventTermId = termId;
    currentEventDate = date;
    
    const term = TERMS.find(t => t.id === termId);
    if (!term) return;
    
    const dateObj = new Date(date);
    const dayName = DAYNAME[dateObj.getDay() === 0 ? 7 : dateObj.getDay()];
    
    elModalTitle.textContent = `${dayName}, ${dateObj.toLocaleDateString('sl-SI')}`;
    elModalMeta.textContent = `${term.start_time} - ${term.end_time}`;
    
    // Preveri, ali je nadomestni trener za ta termin
    const substituteKey = `${termId}-${date}`;
    if (window.substituteTrainerInfo && window.substituteTrainerInfo[substituteKey]) {
      const subInfo = window.substituteTrainerInfo[substituteKey];
      elModalMeta.innerHTML = `
        ${term.start_time} - ${term.end_time}
        <br><small style="color: #007bff; font-weight: bold;">
          Nadomestujem: ${subInfo.originalTrainer}
          ${subInfo.reason ? `<br>Razlog: ${subInfo.reason}` : ''}
        </small>
      `;
    }
    
    loadEventData(termId, date);
    elModal.setAttribute('aria-hidden', 'false');
    elModal.style.display = 'flex';
  }

  async function loadEventData(termId, date) {
    const termKey = `${termId}-${date}`;
    const termAtt = attendance[termKey] || {};
    const termStat = termStatus[termKey];
    
    // Naloži prisotnost
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('term_id', termId)
      .eq('date', date);

    if (!attError && attData) {
      attData.forEach(record => {
        termAtt[record.swimmer_id] = {
          present: record.present,
          note: record.note || ''
        };
      });
      attendance[termKey] = termAtt;
    }

    // Naloži status termina
    const { data: statusData, error: statusError } = await supabase
      .from('term_status')
      .select('*')
      .eq('term_id', termId)
      .eq('date', date)
      .single();

    if (!statusError && statusData) {
      termStatus[termKey] = statusData;
    }

    renderEventTables(termId, date);
    updateModalButtons(termStat);
  }

  function renderEventTables(termId, date) {
    const termKey = `${termId}-${date}`;
    const termAtt = attendance[termKey] || {};
    
    // Filtriraj plavalce, ki pripadajo trenerju
    const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
    const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
    
    const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => 
      swimmers.find(s => s.id === swimmerId)
    ).filter(Boolean);
    
    const substitutionSwimmers = swimmersWithAttendance.filter(s => 
      !assignedSwimmerIds.includes(s.id)
    );
    
    const regularSwimmers = assignedSwimmers.filter(s => 
      termAtt[s.id] !== undefined || !s.is_deleted
    );

    // Render attendance table
    elAttendanceTable.innerHTML = '';
    if (regularSwimmers.length === 0) {
      elAttendanceTable.innerHTML = '<tr><td colspan="3" class="muted">Ni plavalcev</td></tr>';
    } else {
      regularSwimmers.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
        .forEach(s => {
          const att = termAtt[s.id] || { present: false, note: '' };
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${s.first_name} ${s.last_name}</td>
            <td>
              <input type="checkbox" ${att.present ? 'checked' : ''} 
                     onchange="updateAttendance('${s.id}', ${att.present}, '${att.note}')">
            </td>
            <td>
              <input type="text" value="${att.note}" 
                     onchange="updateAttendance('${s.id}', ${att.present}, this.value)" 
                     placeholder="Opomba">
            </td>
          `;
          elAttendanceTable.appendChild(row);
        });
    }

    // Render substitution table
    elSubstitutionTable.innerHTML = '';
    if (substitutionSwimmers.length === 0) {
      elSubstitutionTable.innerHTML = '<tr><td colspan="3" class="muted">Ni nadomestnih plavalcev</td></tr>';
    } else {
      substitutionSwimmers.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
        .forEach(s => {
          const att = termAtt[s.id] || { present: false, note: '' };
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${s.first_name} ${s.last_name}</td>
            <td>
              <input type="checkbox" ${att.present ? 'checked' : ''} 
                     onchange="updateAttendance('${s.id}', ${att.present}, '${att.note}')">
            </td>
            <td>
              <input type="text" value="${att.note}" 
                     onchange="updateAttendance('${s.id}', ${att.present}, this.value)" 
                     placeholder="Opomba">
            </td>
          `;
          elSubstitutionTable.appendChild(row);
        });
    }

    // Update swimmer select
    elModalSwimmerSelect.innerHTML = '';
    const allSwimmersInEvent = [...regularSwimmers, ...substitutionSwimmers];
    const currentEventSwimmerIds = allSwimmersInEvent.map(s => s.id);
    const unassigned = swimmers.filter(s => 
      !currentEventSwimmerIds.includes(s.id) && !s.is_deleted
    );

    if (unassigned.length > 0) {
      unassigned.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
        .forEach(s => {
          const o = document.createElement('option');
          o.value = s.id;
          o.textContent = `${s.first_name} ${s.last_name}`;
          elModalSwimmerSelect.appendChild(o);
        });
      elModalSwimmerSelect.style.display = 'inline-block';
    } else {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Ni več plavalcev';
      elModalSwimmerSelect.appendChild(o);
      elModalSwimmerSelect.style.display = 'none';
    }
  }

  function updateModalButtons(termStat) {
    if (termStat && termStat.status === 'inactive') {
      elToggleEventBtn.textContent = 'Aktiviraj termin';
      elToggleEventBtn.className = 'btn ok';
    } else {
      elToggleEventBtn.textContent = 'Deaktiviraj termin';
      elToggleEventBtn.className = 'btn warn';
    }
  }

  // ===== UPRAVLJANJE PRISOTNOSTI =====
  window.updateAttendance = async function(swimmerId, present, note) {
    if (!currentEventTermId || !currentEventDate) return;
    
    const termKey = `${currentEventTermId}-${currentEventDate}`;
    if (!attendance[termKey]) attendance[termKey] = {};
    
    attendance[termKey][swimmerId] = { present, note };
    
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          term_id: currentEventTermId,
          date: currentEventDate,
          swimmer_id: swimmerId,
          present: present,
          note: note
        });

      if (error) throw error;
      
      // Posodobi povzetek
      updateSummary();
      
    } catch (error) {
      console.error('Napaka pri shranjevanju prisotnosti:', error);
      alert('Napaka pri shranjevanju prisotnosti');
    }
  };

  // ===== POVZETEK =====
  function updateSummary() {
    const year = currentYear;
    const month = currentMonth;
    const daysInMonthCount = daysInMonth(year, month);
    
    let totalEvents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalInactive = 0;
    
    for (let day = 1; day <= daysInMonthCount; day++) {
      const date = new Date(year, month, day);
      const dateStr = iso(date);
      const events = getEventsForDate(dateStr);
      
      events.forEach(event => {
        totalEvents++;
        
        if (event.status === 'inactive') {
          totalInactive++;
        } else {
          totalPresent += event.count;
          totalAbsent += (event.total - event.count);
        }
      });
    }
    
    const summary = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-number">${totalEvents}</div>
          <div class="summary-label">Skupaj terminov</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">${totalPresent}</div>
          <div class="summary-label">Prisotni</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">${totalAbsent}</div>
          <div class="summary-label">Odsotni</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">${totalInactive}</div>
          <div class="summary-label">Deaktivirani</div>
        </div>
      </div>
    `;
    
    elSummaryBox.innerHTML = summary;
  }

  // ===== UPRAVLJANJE PLAVALCEV =====
  function updateSwimmerSelect() {
    elSwimmerSelect.innerHTML = '';
    // Filtriraj plavalce, ki pripadajo trenerjevim terminom
    const relevantSwimmers = swimmers.filter(s => 
      !s.is_deleted && s.terms.some(termId => userTerms.includes(termId))
    );
    
    relevantSwimmers.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
      .forEach(s => {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = `${s.first_name} ${s.last_name}`;
        elSwimmerSelect.appendChild(o);
      });
  }

  function updateTermSelect() {
    elTermSelect.innerHTML = '';
    // Prikaži samo termine trenerja
    TERMS.filter(term => userTerms.includes(term.id))
      .forEach(term => {
        const o = document.createElement('option');
        o.value = term.id;
        o.textContent = `${DAYNAME[term.day]} ${term.start_time}-${term.end_time}`;
        elTermSelect.appendChild(o);
      });
  }

  function showSwimmerInfo() {
    const sid = elSwimmerSelect.value;
    const s = swimmers.find(x => x.id === sid);
    if (!s) {
      elSwimmerInfo.textContent = '';
      return;
    }
    
    const assignedTerms = TERMS.filter(t => s.terms.includes(t.id) && userTerms.includes(t.id));
    const termNames = assignedTerms.map(t => `${DAYNAME[t.day]} ${t.start_time}-${t.end_time}`).join(', ');
    
    elSwimmerInfo.textContent = `Dodeljeni termini: ${termNames || 'Ni dodeljenih terminov'}`;
  }

  // ===== EVENT LISTENERJI =====
  elPrev.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
    updateSummary();
  });

  elNext.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
    updateSummary();
  });

  elCloseModalBtn.addEventListener('click', () => {
    elModal.setAttribute('aria-hidden', 'true');
    elModal.style.display = 'none';
  });

  elAddSwimmerBtn.addEventListener('click', async () => {
    const f = elNewFirst.value.trim();
    const l = elNewLast.value.trim();
    
    if (!f || !l) {
      alert('Prosim, vnesite ime in priimek');
      return;
    }

    if (swimmers.some(s => s.first_name.toLowerCase() === f.toLowerCase() && s.last_name.toLowerCase() === l.toLowerCase() && !s.is_deleted)) {
      alert('Plavalec že obstaja');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('swimmers')
        .insert([{ first_name: f, last_name: l, terms: [] }])
        .select();

      if (error) throw error;

      swimmers.push(data[0]);
      updateSwimmerSelect();
      elNewFirst.value = '';
      elNewLast.value = '';
      
    } catch (error) {
      console.error('Napaka pri dodajanju plavalca:', error);
      alert('Napaka pri dodajanju plavalca');
    }
  });

  elAssignTermBtn.addEventListener('click', async () => {
    const sid = elSwimmerSelect.value, tid = elTermSelect.value;
    const s = swimmers.find(x => x.id === sid);
    if (!s) return;

    if (s.terms.includes(tid)) {
      alert('Plavalec je že dodeljen temu terminu');
      return;
    }

    try {
      s.terms.push(tid);
      const { error } = await supabase
        .from('swimmers')
        .update({ terms: s.terms })
        .eq('id', sid);

      if (error) throw error;

      showSwimmerInfo();
      
    } catch (error) {
      console.error('Napaka pri dodelitvi termina:', error);
      alert('Napaka pri dodelitvi termina');
    }
  });

  elDeleteSwimmerBtn.addEventListener('click', async () => {
    const sid = elSwimmerSelect.value;
    if (!sid) {
      alert('Prosim, izberite plavalca');
      return;
    }

    if (!confirm('Ali ste prepričani, da želite zbrisati tega plavalca?')) {
      return;
    }

    try {
      const { error: swimmerError } = await supabase
        .from('swimmers')
        .update({ is_deleted: true })
        .eq('id', sid);

      if (swimmerError) throw swimmerError;

      // Označi plavalca kot izbrisanega
      const swimmerToUpdate = swimmers.find(x => x.id === sid);
      if (swimmerToUpdate) {
        swimmerToUpdate.is_deleted = true;
      }

      updateSwimmerSelect();
      showSwimmerInfo();
      
    } catch (error) {
      console.error('Napaka pri brisanju plavalca:', error);
      alert('Napaka pri brisanju plavalca. Prosim, preverite konzolo za podrobnosti.');
    }
  });

  elSwimmerSelect.addEventListener('change', showSwimmerInfo);

  // ===== NALAGANJE PODATKOV =====
  async function loadDataFromSupabase() {
    try {
      console.log('=== LOAD DATA FROM SUPABASE START ===');
      console.log('Nalaganje podatkov za trenerja. userTerms:', userTerms);
      
      // Če trener nima terminov, ne naloži podatkov
      if (!userTerms || userTerms.length === 0) {
        console.log('Trener nima terminov, preskačem nalaganje podatkov');
        TERMS = [];
        swimmers = [];
        attendance = {};
        termStatus = {};
        renderCalendar();
        updateSummary();
        updateSwimmerSelect();
        updateTermSelect();
        showSwimmerInfo();
        return;
      }
      
      // Naloži samo termine trenerja
      const { data: termsData, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .in('id', userTerms);

      if (termsError) throw termsError;
      TERMS = termsData || [];
      console.log('Naloženi termini:', TERMS);
      console.log('Število naloženih terminov:', TERMS.length);
      if (TERMS.length > 0) {
        console.log('Prvi termin:', TERMS[0]);
      }

      // Naloži plavalce, ki pripadajo trenerjevim terminom
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('*');

      if (swimmersError) throw swimmersError;
      swimmers = swimmersData || [];

      // Filtriraj plavalce, ki pripadajo trenerjevim terminom
      swimmers = swimmers.filter(s => 
        !s.is_deleted && s.terms.some(termId => userTerms.includes(termId))
      );
      console.log('Filtrirani plavalci:', swimmers);

          // Naloži prisotnost za trenerjeve termine
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .in('term_id', userTerms);

  if (attendanceError) throw attendanceError;

  attendance = {};
  if (attendanceData) {
    attendanceData.forEach(record => {
      const key = `${record.term_id}-${record.date}`;
      if (!attendance[key]) attendance[key] = {};
      attendance[key][record.swimmer_id] = {
        present: record.present,
        note: record.note || ''
      };
    });
  }
  
  // Naloži podatke o nadomestnih trenerjih
  await loadSubstituteTrainerInfo();

      // Naloži status terminov
      const { data: statusData, error: statusError } = await supabase
        .from('term_status')
        .select('*')
        .in('term_id', userTerms);

      if (statusError) throw statusError;

      termStatus = {};
      if (statusData) {
        statusData.forEach(record => {
          const key = `${record.term_id}-${record.date}`;
          termStatus[key] = record;
        });
      }

      // Posodobi UI
      renderCalendar();
      updateSummary();
      updateSwimmerSelect();
      updateTermSelect();
      showSwimmerInfo();

      console.log('=== LOAD DATA FROM SUPABASE END ===');

    } catch (error) {
      console.error('Napaka pri nalaganju podatkov:', error);
      console.error('Napaka podrobnosti:', error.message);
      alert('Napaka pri nalaganju podatkov');
    }
  }

  // Inicializacija
  // loadDataFromSupabase() se kliče v checkAuth() in pri prijavi

  // ===== NADOMESTNI TRENERJI =====
  
  // Naloži podatke za nadomestne trenerje
  async function loadSubstituteData() {
      try {
          // Nastavi današnji datum kot privzeto vrednost
          const today = new Date().toISOString().split('T')[0];
          substituteDateInput.value = today;
          
          // Naloži vse trenerje za izbiro nadomestnega trenerja
          await loadAllTrainers();
          
          // Posodobi sezname nadomestnih dogovorov
          await loadMySubstitutions();
          await loadSubstituteObligations();
          
          // Nastavi event listenerje
          setupSubstituteEventListeners();
          
      } catch (error) {
          console.error('Napaka pri nalaganju podatkov za nadomestne trenerje:', error);
      }
  }
  
  // Naloži vse trenerje
  async function loadAllTrainers() {
      try {
          const { data: trainersData, error } = await supabase
              .from('trainers')
              .select('*')
              .neq('user_id', currentUser.id); // Izključi trenutnega trenerja
          
          if (error) throw error;
          
          // Posodobi select za nadomestne trenerje
          substituteTrainerSelect.innerHTML = '<option value="">Izberi nadomestnega trenerja</option>';
          trainersData.forEach(trainer => {
              const option = document.createElement('option');
              option.value = trainer.id;
              option.textContent = `${trainer.first_name} ${trainer.last_name}`;
              substituteTrainerSelect.appendChild(option);
          });
          
          // Posodobi select za termine (samo trenerjevi termini)
          substituteTermSelect.innerHTML = '<option value="">Izberi termin</option>';
          TERMS.forEach(term => {
              const option = document.createElement('option');
              option.value = term.id;
              option.textContent = `${DAYNAME[term.day]} ${term.start_time}-${term.end_time}`;
              substituteTermSelect.appendChild(option);
          });
          
      } catch (error) {
          console.error('Napaka pri nalaganju trenerjev:', error);
      }
  }
  
  // Naloži moje nadomestne dogovore
  async function loadMySubstitutions() {
      try {
          const { data: substitutionsData, error } = await supabase
              .rpc('get_trainer_substitutions', { trainer_email: currentUser.email });
          
          if (error) throw error;
          
          if (substitutionsData && substitutionsData.length > 0) {
              const html = substitutionsData.map(sub => `
                  <div class="substitution-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                      <div><strong>Termin:</strong> ${sub.term_id}</div>
                      <div><strong>Datum:</strong> ${new Date(sub.substitute_date).toLocaleDateString('sl-SI')}</div>
                      <div><strong>${sub.is_substitute ? 'Nadomestujem za:' : 'Nadomestuje me:'}</strong> ${sub.other_trainer_name}</div>
                      <div><strong>Razlog:</strong> ${sub.reason || 'Ni razloga'}</div>
                      ${!sub.is_substitute ? `<button class="btn warn" onclick="deleteSubstitution('${sub.id}')" style="margin-top: 5px;">Prekliči</button>` : ''}
                  </div>
              `).join('');
              
              mySubstitutionsList.innerHTML = html;
          } else {
              mySubstitutionsList.innerHTML = '<p class="muted">Ni nadomestnih dogovorov</p>';
          }
          
      } catch (error) {
          console.error('Napaka pri nalaganju nadomestnih dogovorov:', error);
          mySubstitutionsList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov</p>';
      }
  }
  
  // Naloži nadomestne obveznosti
  async function loadSubstituteObligations() {
      try {
          const { data: obligationsData, error } = await supabase
              .from('substitute_trainers')
              .select(`
                  *,
                  original_trainer:trainers!substitute_trainers_original_trainer_id_fkey(first_name, last_name),
                  term:terms(id, day, start_time, end_time)
              `)
              .eq('substitute_trainer_id', currentUser.id);
          
          if (error) throw error;
          
          if (obligationsData && obligationsData.length > 0) {
              const html = obligationsData.map(obligation => `
                  <div class="obligation-item" style="border: 1px solid #007bff; padding: 10px; margin: 5px 0; border-radius: 5px; background-color: #f8f9fa;">
                      <div><strong>Termin:</strong> ${DAYNAME[obligation.term.day]} ${obligation.term.start_time}-${obligation.term.end_time}</div>
                      <div><strong>Datum:</strong> ${new Date(obligation.substitute_date).toLocaleDateString('sl-SI')}</div>
                      <div><strong>Nadomestujem:</strong> ${obligation.original_trainer.first_name} ${obligation.original_trainer.last_name}</div>
                      <div><strong>Razlog:</strong> ${obligation.reason || 'Ni razloga'}</div>
                  </div>
              `).join('');
              
              substituteObligationsList.innerHTML = html;
          } else {
              substituteObligationsList.innerHTML = '<p class="muted">Ni nadomestnih obveznosti</p>';
          }
          
      } catch (error) {
          console.error('Napaka pri nalaganju nadomestnih obveznosti:', error);
          substituteObligationsList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov</p>';
      }
  }
  
  // Nastavi event listenerje za nadomestne trenerje
  function setupSubstituteEventListeners() {
      // Dodaj nadomestnega trenerja
      addSubstituteBtn.addEventListener('click', handleAddSubstitute);
      
      // Modal event listenerji
      closeConfirmSubstituteModalBtn.addEventListener('click', () => {
          confirmSubstituteModal.style.display = 'none';
      });
      
      cancelSubstituteBtn.addEventListener('click', () => {
          confirmSubstituteModal.style.display = 'none';
      });
      
      confirmSubstituteBtn.addEventListener('click', handleConfirmSubstitute);
      
      // Zapri modal ob kliku zunaj
      window.addEventListener('click', (event) => {
          if (event.target === confirmSubstituteModal) {
              confirmSubstituteModal.style.display = 'none';
          }
      });
  }
  
  // Obdelaj dodajanje nadomestnega trenerja
  async function handleAddSubstitute() {
      const termId = substituteTermSelect.value;
      const date = substituteDateInput.value;
      const substituteTrainerId = substituteTrainerSelect.value;
      const reason = substituteReasonInput.value;
      
      if (!termId || !date || !substituteTrainerId) {
          alert('Prosim, izpolnite vsa obvezna polja');
          return;
      }
      
      // Pokaži modal za potrditev
      const selectedTerm = TERMS.find(t => t.id === termId);
      const selectedTrainer = Array.from(substituteTrainerSelect.options).find(opt => opt.value === substituteTrainerId);
      
      substituteConfirmationDetails.innerHTML = `
          <p><strong>Termin:</strong> ${DAYNAME[selectedTerm.day]} ${selectedTerm.start_time}-${selectedTerm.end_time}</p>
          <p><strong>Datum:</strong> ${new Date(date).toLocaleDateString('sl-SI')}</p>
          <p><strong>Nadomestni trener:</strong> ${selectedTrainer.textContent}</p>
          <p><strong>Razlog:</strong> ${reason || 'Ni razloga'}</p>
      `;
      
      confirmSubstituteModal.style.display = 'block';
      
      // Shrani podatke za potrditev
      confirmSubstituteModal.dataset.termId = termId;
      confirmSubstituteModal.dataset.date = date;
      confirmSubstituteModal.dataset.substituteTrainerId = substituteTrainerId;
      confirmSubstituteModal.dataset.reason = reason;
  }
  
  // Obdelaj potrditev nadomestnega trenerja
  async function handleConfirmSubstitute() {
      try {
          const termId = confirmSubstituteModal.dataset.termId;
          const date = confirmSubstituteModal.dataset.date;
          const substituteTrainerId = confirmSubstituteModal.dataset.substituteTrainerId;
          const reason = confirmSubstituteModal.dataset.reason;
          
          // Najdi trenerja
          const { data: trainerData, error: trainerError } = await supabase
              .from('trainers')
              .select('id')
              .eq('user_id', currentUser.id)
              .single();
          
          if (trainerError) throw trainerError;
          
          // Dodaj nadomestnega trenerja
          const { error: insertError } = await supabase
              .from('substitute_trainers')
              .insert({
                  original_trainer_id: trainerData.id,
                  substitute_trainer_id: substituteTrainerId,
                  term_id: termId,
                  substitute_date: date,
                  reason: reason
              });
          
          if (insertError) throw insertError;
          
          // Zapri modal in počisti podatke
          confirmSubstituteModal.style.display = 'none';
          substituteTermSelect.value = '';
          substituteDateInput.value = new Date().toISOString().split('T')[0];
          substituteTrainerSelect.value = '';
          substituteReasonInput.value = '';
          
          // Posodobi sezname
          await loadMySubstitutions();
          
          alert('Nadomestni trener je bil uspešno dodan!');
          
      } catch (error) {
          console.error('Napaka pri dodajanju nadomestnega trenerja:', error);
          alert('Napaka pri dodajanju nadomestnega trenerja');
      }
  }
  
  // Funkcija za brisanje nadomestnega dogovora (globalna)
  window.deleteSubstitution = async function(substitutionId) {
      if (!confirm('Ali ste prepričani, da želite preklicati ta nadomestni dogovor?')) {
          return;
      }
      
      try {
          const { error } = await supabase
              .from('substitute_trainers')
              .delete()
              .eq('id', substitutionId);
          
          if (error) throw error;
          
          // Posodobi seznam
          await loadMySubstitutions();
          
          alert('Nadomestni dogovor je bil preklican!');
          
      } catch (error) {
          console.error('Napaka pri brisanju nadomestnega dogovora:', error);
          alert('Napaka pri brisanju nadomestnega dogovora');
      }
  };
  
  // Naloži nadomestne termine za trenutni dan
  async function loadSubstituteTerms() {
      try {
          const today = new Date().toISOString().split('T')[0];
          
          // Najdi trenerja
          const { data: trainerData, error: trainerError } = await supabase
              .from('trainers')
              .select('id')
              .eq('user_id', currentUser.id)
              .single();
          
          if (trainerError) throw trainerError;
          
          // Poišči nadomestne termine za danes
          const { data: substituteData, error: substituteError } = await supabase
              .from('substitute_trainers')
              .select(`
                  *,
                  term:terms(*)
              `)
              .eq('substitute_trainer_id', trainerData.id)
              .eq('substitute_date', today);
          
          if (substituteError) throw substituteError;
          
          // Dodaj nadomestne termine k userTerms
          if (substituteData && substituteData.length > 0) {
              const substituteTermIds = substituteData.map(sub => sub.term_id);
              userTerms = [...new Set([...userTerms, ...substituteTermIds])];
              
              // Posodobi prikaz
              userGroups.textContent = `${userTerms.length} skupin (vključno z nadomestnimi)`;
              
              // Ponovno naloži podatke z novimi termini
              await loadDataFromSupabase();
          }
          
      } catch (error) {
          console.error('Napaka pri nalaganju nadomestnih terminov:', error);
      }
  }
  
  // Naloži informacije o nadomestnih trenerjih
  async function loadSubstituteTrainerInfo() {
      try {
          // Shrani informacije o nadomestnih trenerjih za prikaz v modalih
          window.substituteTrainerInfo = {};
          
          const { data: substituteData, error } = await supabase
              .from('substitute_trainers')
              .select(`
                  *,
                  original_trainer:trainers!substitute_trainers_original_trainer_id_fkey(first_name, last_name),
                  substitute_trainer:trainers!substitute_trainers_substitute_trainer_id_fkey(first_name, last_name)
              `);
          
          if (error) throw error;
          
          if (substituteData) {
              substituteData.forEach(sub => {
                  const key = `${sub.term_id}-${sub.substitute_date}`;
                  window.substituteTrainerInfo[key] = {
                      originalTrainer: `${sub.original_trainer.first_name} ${sub.original_trainer.last_name}`,
                      substituteTrainer: `${sub.substitute_trainer.first_name} ${sub.substitute_trainer.last_name}`,
                      reason: sub.reason
                  };
              });
          }
          
      } catch (error) {
          console.error('Napaka pri nalaganju informacij o nadomestnih trenerjih:', error);
      }
  }

});