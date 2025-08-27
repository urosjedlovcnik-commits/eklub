// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOM CONTENT LOADED START ===');
  console.log('DOM je naložen, začenjam inicializacijo...');

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
  
  // UI elementi za prisotnost trenerja
  let trainerAttendanceSection = null;
  let trainerAttendanceTable = null;
  
  // Funkcija za inicializacijo elementov
  function initializeTrainerElements() {
    trainerAttendanceSection = document.getElementById('trainerAttendanceSection');
    trainerAttendanceTable = document.getElementById('trainerAttendanceTable');
    console.log('Inicializacija elementov za trenerja:', {
      trainerAttendanceSection: !!trainerAttendanceSection,
      trainerAttendanceTable: !!trainerAttendanceTable
    });
  }
  

  
  // Modal elementi za nadomestne trenerje
  const confirmSubstituteModal = document.getElementById('confirmSubstituteModal');
  const substituteConfirmationDetails = document.getElementById('substituteConfirmationDetails');
  const closeConfirmSubstituteModalBtn = document.getElementById('closeConfirmSubstituteModalBtn');
  const cancelSubstituteBtn = document.getElementById('cancelSubstituteBtn');
  const confirmSubstituteBtn = document.getElementById('confirmSubstituteBtn');

  // ===== DOLGOROČNA AVTENTIKACIJA =====
  
  // Shrani session token lokalno za 24 ur
  function saveSessionLocally(session) {
      try {
          const sessionData = {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 ur
              user: session.user
          };
          localStorage.setItem('trainer_session', JSON.stringify(sessionData));
          console.log('Session shranjen lokalno za 24 ur');
      } catch (error) {
          console.error('Napaka pri shranjevanju session-a:', error);
      }
  }
  
  // Obnovi session iz lokalnega shranjevanja
  function restoreSessionFromLocal() {
      try {
          const sessionData = localStorage.getItem('trainer_session');
          if (!sessionData) return null;
          
          const session = JSON.parse(sessionData);
          
          // Preveri, če je session še veljaven
          if (Date.now() > session.expires_at) {
              console.log('Lokalni session je potekel, brišem...');
              localStorage.removeItem('trainer_session');
              return null;
          }
          
          console.log('Obnavljam session iz lokalnega shranjevanja');
          return session;
      } catch (error) {
          console.error('Napaka pri obnovitvi session-a:', error);
          localStorage.removeItem('trainer_session');
          return null;
      }
  }
  
  // Počisti lokalni session
  function clearLocalSession() {
      try {
          localStorage.removeItem('trainer_session');
          console.log('Lokalni session počiščen');
      } catch (error) {
          console.error('Napaka pri čiščenju session-a:', error);
      }
  }
  
  // Nastavi avtomatsko osveževanje tokena
  function setupTokenRefresh() {
      // Preveri token vsakih 30 minut
      setInterval(async () => {
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                  // Shrani posodobljen session
                  saveSessionLocally(session);
                  console.log('Token avtomatsko osvežen');
              }
          } catch (error) {
              console.error('Napaka pri avtomatskem osveževanju tokena:', error);
          }
      }, 30 * 60 * 1000); // 30 minut
  }

  // Preveri, če je uporabnik že prijavljen
  async function checkAuth() {
      console.log('=== CHECK AUTH START ===');
      
      // Najprej preveri lokalni session
      const localSession = restoreSessionFromLocal();
      if (localSession) {
          console.log('Najden lokalni session, poskušam obnoviti...');
          try {
              // Poskusi obnoviti session z Supabase
              const { data, error } = await supabase.auth.setSession({
                  access_token: localSession.access_token,
                  refresh_token: localSession.refresh_token
              });
              
              if (error) {
                  console.log('Napaka pri obnovitvi session-a:', error);
                  clearLocalSession();
                             } else if (data.session) {
                  console.log('Session uspešno obnovljen iz lokalnega shranjevanja');
                  currentUser = data.user;
                  
                  // Nastavi avtomatsko osveževanje tokena
                  setupTokenRefresh();
                  
                  await loadUserTerms();
                  showMainApp();
                  await loadDataFromSupabase();
                  console.log('=== CHECK AUTH END (LOCAL SESSION) ===');
                  return;
              }
          } catch (error) {
              console.error('Napaka pri obnovitvi session-a:', error);
              clearLocalSession();
          }
      }
      
      // Preveri, ali so vsi potrebni elementi naloženi
      if (!elCalendarGrid || !elMonthLabel || !elPrevBtn || !elNextBtn || !elSummaryBox) {
          console.error('Osnovni elementi niso naloženi');
          return;
      }
      
      // Preveri, ali so modalni elementi naloženi
      if (!elModal || !elAttendanceTable || !elSubstitutionTable) {
          console.error('Modalni elementi niso naloženi');
          console.error('elModal:', !!elModal);
          console.error('elAttendanceTable:', !!elAttendanceTable);
          console.error('elSubstitutionTable:', !!elSubstitutionTable);
          
          // Poskusi ponovno naložiti elemente
          console.log('Poskušam ponovno naložiti elemente...');
          const retryAttendanceTable = document.getElementById("attendanceTable")?.querySelector("tbody");
          const retrySubstitutionTable = document.getElementById("substitutionTable")?.querySelector("tbody");
          
          if (retryAttendanceTable && retrySubstitutionTable) {
              console.log('Elementi so sedaj naloženi, poskušam ponovno...');
              // Posodobi globalne reference
              elAttendanceTable = retryAttendanceTable;
              elSubstitutionTable = retrySubstitutionTable;
          } else {
              console.error('Elementi še vedno niso naloženi, prekinjam');
              return;
          }
      }
      
      console.log('Vsi elementi so naloženi');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          console.log('Uporabnik je prijavljen:', user.email);
          currentUser = user;
          await loadUserTerms();
          showMainApp();
          // Naloži podatke za trenerja po tem, ko so userTerms naloženi
          await loadDataFromSupabase();
      } else {
          console.log('Uporabnik ni prijavljen');
          showLoginScreen();
      }
      console.log('=== CHECK AUTH END ===');
  }

  // Naloži termine, ki pripadajo trenerju
  async function loadUserTerms() {
      try {
          console.log('=== LOAD USER TERMS START ===');
          console.log('Current user ID:', currentUser.id);
          console.log('Current user email:', currentUser.email);
          
          // Najprej poiščemo trenerja v tabeli trenerjev
          console.log('Iščem trenerja v tabeli trainers...');
          const { data: trainerData, error: trainerError } = await supabase
              .from('trainers')
              .select('*')
              .eq('user_id', currentUser.id)
              .single();

          console.log('Rezultat iskanja trenerja:', { trainerData, trainerError });

          if (trainerError || !trainerData) {
              console.error('Trener ni najden:', trainerError);
              console.log('Poskušam najti trenerja z user_id:', currentUser.id);
              
              // Posodobi prikaz z napako
              userName.textContent = 'Napaka pri nalaganju podatkov';
              userGroups.textContent = 'Napaka';
              return;
          }

          console.log('Najden trener:', trainerData);

          // Naložimo termine, ki pripadajo temu trenerju
          console.log('Iščem termine za trenerja z ID:', trainerData.id);
          const { data: termsData, error: termsError } = await supabase
              .from('trainer_terms')
              .select('term_id')
              .eq('trainer_id', trainerData.id);

          console.log('Rezultat iskanja terminov:', { termsData, termsError });
          console.log('Raw termsData:', termsData);

          if (termsError) {
              console.error('Napaka pri nalaganju terminov:', termsError);
              userName.textContent = `${trainerData.first_name} ${trainerData.last_name}`;
              userGroups.textContent = 'Napaka pri nalaganju terminov';
              return;
          }

          if (!termsData || termsData.length === 0) {
              console.warn('Trener nima dodeljenih terminov v trainer_terms tabeli');
              userTerms = [];
          } else {
              userTerms = termsData.map(t => t.term_id);
              console.log('Mapirani userTerms:', userTerms);
          }
          
          // Posodobi prikaz - popravimo prikaz imena
          console.log('Trainer data:', trainerData);
          if (trainerData.first_name && trainerData.last_name) {
              userName.textContent = `${trainerData.first_name} ${trainerData.last_name}`;
              console.log('Set user name to:', userName.textContent);
          } else {
              userName.textContent = 'Neznan trener';
              console.log('Set user name to: Neznan trener');
          }
          
          // Posodobi tudi prikaz skupin
          userGroups.textContent = userTerms.length > 0 ? `${userTerms.length} skupin` : 'Ni skupin';
          console.log('Set user groups to:', userGroups.textContent);
          
          // Če trener nima terminov, prikaži sporočilo
          if (userTerms.length === 0) {
              elSummaryBox.innerHTML = '<div class="error-message">Trener nima dodeljenih terminov. Kontaktirajte administratorja.</div>';
              console.warn('Trener nima dodeljenih terminov');
          } else {
              console.log('Trener ima', userTerms.length, 'terminov');
          }
          

          
          console.log('=== LOAD USER TERMS END ===');
          
      } catch (error) {
          console.error('Napaka pri nalaganju podatkov trenerja:', error);
          console.error('Napaka podrobnosti:', error.message);
          
          // Posodobi prikaz z napako
          userName.textContent = 'Napaka pri nalaganju';
          userGroups.textContent = 'Napaka';
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
          
          // Shrani session lokalno za 24 ur
          if (data.session) {
              saveSessionLocally(data.session);
              
              // Nastavi avtomatsko osveževanje tokena
              setupTokenRefresh();
          }
          
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
          
          // Počisti lokalni session
          clearLocalSession();
          
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
       console.log('Odpiram modal za spremembo gesla');
       changePasswordModal.classList.remove('hidden');
       changePasswordModal.style.display = 'flex';
       clearPasswordForm();
   });

       // Zapri modal za spremembo gesla
   closeChangePasswordModalBtn.addEventListener('click', () => {
       changePasswordModal.classList.add('hidden');
       changePasswordModal.style.display = 'none';
       clearPasswordForm();
   });

   cancelChangePasswordBtn.addEventListener('click', () => {
       changePasswordModal.classList.add('hidden');
       changePasswordModal.style.display = 'none';
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
          // Najprej preveri trenutno geslo
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: currentUser.email,
              password: currentPassword
          });

          if (signInError) {
              showPasswordChangeError('Trenutno geslo ni pravilno.');
              return;
          }

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

  // Preveri autentikacijo ob nalaganju - odstranjeno, ker se kliče v setTimeout
  // checkAuth();

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

  const elModal = document.getElementById("eventModal");
  const elModalTitle = document.getElementById("modalTitle");
  const elModalMeta = document.getElementById("modalMeta");
  const elAttendanceTable = document.getElementById("attendanceTable");
  const elSubstitutionTable = document.getElementById("substitutionTable");
  
  console.log('=== ELEMENTI NALOŽENI ===');
  console.log('elAttendanceTable:', !!elAttendanceTable);
  console.log('elSubstitutionTable:', !!elSubstitutionTable);
  console.log('elAttendanceTable element:', elAttendanceTable);
  console.log('elSubstitutionTable element:', elSubstitutionTable);
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
    
    elMonthLabel.textContent = new Date(year, month, 1).toLocaleDateString("sl-SI", {month:"long",year:"numeric"});
    elCalendarGrid.innerHTML = "";

    const pad = startWeekdayNum - 1;
    for (let i = 0; i < pad; i++) {
      const div = document.createElement("div");
      div.className = "day disabled";
      elCalendarGrid.appendChild(div);
    }

    for (let d = 1; d <= daysInMonthCount; d++) {
      const date = new Date(year, month, d);
      const day = document.createElement("div");
      day.className = "day" + (isToday(date) ? " today" : "");
      const num = document.createElement("div");
      num.className = "num";
      num.textContent = d;
      day.appendChild(num);

      const todays = getEventsForDate(iso(date));
      todays.sort((a, b) => a.time.localeCompare(b.time));

               todays.forEach(t => {
         const e = document.createElement("div");
         e.className = "event";
         
         // Dodaj status class
         if (t.status) {
           e.classList.add(t.status);
         }
         
         e.innerHTML = `<span class="time">${t.time.split('-')[0]}<span class="end-time">–${t.time.split('-')[1]}</span></span>`;
         e.title = t.time;
         e.dataset.termId = t.termId;
         day.appendChild(e);
       });

      // Dodaj event listener za dan
      if (todays.length > 0) {
        day.addEventListener("click", (e) => {
          e.stopPropagation();
          if (todays.length === 1) {
            openEventModal(todays[0].termId, iso(date));
          } else {
            // Če je več terminov, odpri modal za izbiro
            openDayModal(date);
          }
        });
      }
      
      elCalendarGrid.appendChild(day);
    }
  }

  function getEventsForDate(dateStr) {
    const events = [];
    const date = new Date(dateStr);
    // JavaScript getDay() vrača 0-6 (nedelja=0, ponedeljek=1, ...)
    // Naši termini uporabljajo 1-7 (ponedeljek=1, nedelja=7)
    // Pretvorimo JavaScript dan v naš format: 0(nedelja) -> 7, 1(ponedeljek) -> 1, 2(torek) -> 2, ...
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    
    console.log(`getEventsForDate: ${dateStr}, dayOfWeek: ${dayOfWeek}, TERMS.length: ${TERMS.length}, userTerms:`, userTerms);
    
    TERMS.forEach(term => {
      // Preveri, če termin pripada trenerju
      if (!userTerms.includes(term.id)) {
        console.log(`Termin ${term.id} ne pripada trenerju`);
        return;
      }
      
      console.log(`Preverjam termin ${term.id}, dan: ${term.day}, date_from: ${term.date_from}, date_to: ${term.date_to}`);
      
      // POPRAVEK: Preveri tudi, ali se termin izvaja na ta datum (kot v script.js)
      if (term.day === dayOfWeek && dateStr >= term.date_from && dateStr <= term.date_to) {
        console.log(`Termin ${term.id} se izvaja na ${dateStr}`);
        
        // Uporabi isto strukturo kot v glavni strani
        const termAtt = attendance[dateStr]?.[term.id] || {};
        const assignedSwimmers = swimmers.filter(s => s.terms && s.terms.includes(term.id));
        const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
        const markedAssignedSwimmersCount = assignedSwimmerIds.filter(id => termAtt.hasOwnProperty(id)).length;
        const totalAssignedCount = assignedSwimmers.length;
        
        let status = 'active';
        const termKey = `${term.id}-${dateStr}`;
        if (termStatus[termKey]) {
          status = termStatus[termKey].status;
        } else if (markedAssignedSwimmersCount === 0) {
          status = 'empty';
        } else if (markedAssignedSwimmersCount === totalAssignedCount) {
          status = 'full';
        }
        
        events.push({
          termId: term.id,
          time: `${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`,
          count: markedAssignedSwimmersCount,
          total: totalAssignedCount,
          status: status
        });
      } else {
        console.log(`Termin ${term.id} se NE izvaja na ${dateStr} (dan: ${term.day} vs ${dayOfWeek}, datum: ${dateStr} vs ${term.date_from}-${term.date_to})`);
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

  // ===== MODAL ZA IZBIRO DNEVA =====
  function openDayModal(date) {
    const todaysTerms = getEventsForDate(iso(date)).sort((a, b) => a.time.localeCompare(b.time));
    elDayModalTitle.textContent = `Termini za ${date.toLocaleDateString("sl-SI", { weekday: 'long', day: 'numeric', month: 'long' })}`;
    elDayModalList.innerHTML = "";

    if (todaysTerms.length === 0) {
      elDayModalList.innerHTML = "<p class='muted' style='text-align: center;'>Na ta dan ni terminov.</p>";
           } else {
       todaysTerms.forEach(t => {
         const e = document.createElement("div");
         e.className = "event";
         
         if (t.status) {
           e.classList.add(t.status);
         }

         e.innerHTML = `<span class="time">${t.time.split('-')[0]}<span class="end-time">–${t.time.split('-')[1]}</span></span>`;
         
         e.addEventListener("click", () => {
           closeDayModal();
           openEventModal(t.termId, iso(date));
         });
         elDayModalList.appendChild(e);
       });
     }
    elDayModal.style.display = 'flex';
  }

  function closeDayModal() {
    elDayModal.style.display = 'none';
  }

  // ===== MODAL ZA DOGODKE =====
  let currentEventTermId = null;
  let currentEventDate = null;

  async function openEventModal(termId, date) {
    currentEventTermId = termId;
    currentEventDate = date;
    
    const term = TERMS.find(t => t.id === termId);
    if (!term) return;
    
    const dateObj = new Date(date);
    const dayName = DAYNAME[dateObj.getDay() === 0 ? 7 : dateObj.getDay()];
    
    elModalTitle.textContent = `${dayName}, ${dateObj.toLocaleDateString('sl-SI')}`;
    elModalMeta.textContent = `${term.start_time.slice(0, 5)} - ${term.end_time.slice(0, 5)}`;
    
    // Preveri, ali je nadomestni trener za ta termin
    const substituteKey = `${termId}-${date}`;
    if (window.substituteTrainerInfo && window.substituteTrainerInfo[substituteKey]) {
      const subInfo = window.substituteTrainerInfo[substituteKey];
      elModalMeta.innerHTML = `
        ${term.start_time.slice(0, 5)} - ${term.end_time.slice(0, 5)}
        <br><small style="color: #007bff; font-weight: bold;">
          Nadomestujem: ${subInfo.originalTrainer}
          ${subInfo.reason ? `<br>Razlog: ${subInfo.reason}` : ''}
        </small>
      `;
    }
    
    await loadEventData(termId, date);
    await checkAndLoadTrainerAttendance(termId, date);
    elModal.setAttribute('aria-hidden', 'false');
    elModal.style.display = 'flex';
  }

  async function loadEventData(termId, date) {
    const termKey = `${termId}-${date}`;
    
    // Inicializiraj strukturo podatkov, če ne obstaja
    if (!attendance[date]) attendance[date] = {};
    if (!attendance[date][termId]) attendance[date][termId] = {};
    
    // Naloži prisotnost za ta termin na ta dan
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('term_id', termId)
      .eq('date', date);

    if (!attError && attData) {
      // Počisti obstoječe podatke za ta termin
      attendance[date][termId] = {};
      
      // Naloži nove podatke
      attData.forEach(record => {
        attendance[date][termId][record.swimmer_id] = record.status;
      });
      
      console.log('Naložena prisotnost za termin', termId, 'na dan', date, ':', attendance[date][termId]);
    } else if (attError) {
      console.error('Napaka pri nalaganju prisotnosti:', attError);
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

    // Posodobi UI
    await renderEventTables(termId, date);
    updateModalButtons(termStatus[termKey]);
  }

       async function renderEventTables(termId, date) {
  // Preveri, ali so potrebni elementi naloženi
  if (!elAttendanceTable || !elSubstitutionTable) {
    console.error('Potrebni elementi niso naloženi:', {
      elAttendanceTable: !!elAttendanceTable,
      elSubstitutionTable: !!elSubstitutionTable
    });
    return;
  }

  const termKey = `${termId}-${date}`;
  // Uporabi isto strukturo kot v glavni strani
  const termAtt = attendance[date]?.[termId] || {};
  
  console.log('renderEventTables - termId:', termId, 'date:', date);
  console.log('termAtt:', termAtt);
  console.log('swimmers:', swimmers);
  console.log('userTerms:', userTerms);
  console.log('termId type:', typeof termId);
  console.log('termId v userTerms:', userTerms.includes(termId));
     
           // KLJUČNI POPRAVEK: Pravilno filtriranje plavalcev
      // Redno dodeljeni plavalci (tisti, ki so dodeljeni temu terminu)
      console.log('\n--- Filtriranje plavalcev za termin ---');
      console.log('Termin ID:', termId);
      console.log('Vsi plavalci:', swimmers);
      
      const assignedSwimmers = swimmers.filter(s => {
        const hasTerm = s.terms && s.terms.includes(termId);
        const notDeleted = !s.is_deleted;
        console.log(`Plavalec ${s.first_name} ${s.last_name}: hasTerm=${hasTerm}, notDeleted=${notDeleted}`);
        return hasTerm && notDeleted;
      });
      
      console.log('assignedSwimmers:', assignedSwimmers);
      
      const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
      
      // Vsi plavalci z vneseno prisotnostjo (vključno z nadomestnimi)
      const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => 
        swimmers.find(s => s.id === swimmerId)
      ).filter(Boolean);
      
      // Plavalci z vneseno prisotnostjo, ki NISO redno dodeljeni temu terminu (nadomeščanje)
      const substitutionSwimmers = swimmersWithAttendance.filter(s => 
        !assignedSwimmerIds.includes(s.id) && !s.is_deleted
      );
      
      // SAMO redno dodeljeni plavalci z vneseno prisotnostjo
      const regularSwimmers = assignedSwimmers.filter(s => 
        Object.keys(termAtt).includes(s.id)
      );

    // Render attendance table - vsi plavalci z vneseno prisotnostjo
    elAttendanceTable.innerHTML = '';
    if (regularSwimmers.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.className = 'muted';
      td.textContent = 'Ni plavalcev z vneseno prisotnostjo.';
      tr.appendChild(td);
      elAttendanceTable.appendChild(tr);
    } else {
                regularSwimmers.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
        .forEach(s => {
          const isPresent = termAtt[s.id] || false;
          const row = document.createElement('tr');
          
          const td1 = document.createElement('td');
          td1.textContent = `${s.first_name} ${s.last_name}`;
          
          const td2 = document.createElement('td');
          td2.style.display = "flex";
          td2.style.gap = "4px";
          td2.style.alignItems = "center";
          
          // Gumb "Prisoten"
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isPresent === true) {
            btnPresent.classList.add("ok");
          } else {
            btnPresent.classList.add("neutral");
          }
          btnPresent.addEventListener("click", async () => {
            await updateAttendance(s.id, true);
            await renderEventTables(termId, date);
          });
          
          // Gumb "Odsoten"
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isPresent === false) {
            btnAbsent.classList.add("warn");
          } else {
            btnAbsent.classList.add("neutral");
          }
          btnAbsent.addEventListener("click", async () => {
            await updateAttendance(s.id, false);
            await renderEventTables(termId, date);
          });
          
          // Gumb za ponastavitev prisotnosti (samo za redno dodeljene plavalce)
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          btnRemove.title = "Ponastavi prisotnost";
          btnRemove.addEventListener("click", async () => {
            await resetAttendance(s.id);
            await renderEventTables(termId, date);
          });
          
          td2.appendChild(btnPresent);
          td2.appendChild(btnAbsent);
          td2.appendChild(btnRemove);
          
          row.appendChild(td1);
          row.appendChild(td2);
          
          elAttendanceTable.appendChild(row);
        });
    }

    // Render substitution table - nadomeščanje
    elSubstitutionTable.innerHTML = '';
    if (substitutionSwimmers.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.className = 'muted';
      td.textContent = 'Ni nadomeščanja.';
      tr.appendChild(td);
      elSubstitutionTable.appendChild(tr);
    } else {
              substitutionSwimmers.sort((a,b) => (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name))
        .forEach(s => {
          const isPresent = termAtt[s.id] || false;
          const row = document.createElement('tr');
          
          const td1 = document.createElement('td');
          td1.textContent = `${s.first_name} ${s.last_name}`;
          
          const td2 = document.createElement('td');
          td2.style.display = "flex";
          td2.style.gap = "4px";
          td2.style.alignItems = "center";
          
          // Gumb "Prisoten"
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isPresent === true) {
            btnPresent.classList.add("ok");
          } else {
            btnPresent.classList.add("neutral");
          }
          btnPresent.addEventListener("click", async () => {
            await updateAttendance(s.id, true);
            await renderEventTables(termId, date);
          });
          
          // Gumb "Odsoten"
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isPresent === false) {
            btnAbsent.classList.add("warn");
          } else {
            btnAbsent.classList.add("neutral");
          }
          btnAbsent.addEventListener("click", async () => {
            await updateAttendance(s.id, false);
            await renderEventTables(termId, date);
          });
          
          // Gumb za odstranitev iz nadomeščanja
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          btnRemove.title = "Odstrani iz nadomeščanja";
          btnRemove.addEventListener("click", async () => {
            await removeSwimmerFromEvent(s.id);
            await renderEventTables(termId, date);
          });
          
          td2.appendChild(btnPresent);
          td2.appendChild(btnAbsent);
          td2.appendChild(btnRemove);
          
          row.appendChild(td1);
          row.appendChild(td2);
          
          elSubstitutionTable.appendChild(row);
        });
    }

    // Update swimmer select - plavalci, ki jih lahko dodamo
    elModalSwimmerSelect.innerHTML = '';
    const allSwimmersInEvent = [...regularSwimmers, ...substitutionSwimmers];
    const currentEventSwimmerIds = allSwimmersInEvent.map(s => s.id);
    
    // Naloži vse plavalce iz baze, ne samo tiste, ki so dodeljeni trenerju
    const { data: allSwimmersData, error: allSwimmersError } = await supabase
      .from('swimmers')
      .select('*')
      .eq('is_deleted', false)
      .order('last_name, first_name');
    
    if (allSwimmersError) {
      console.error('Napaka pri nalaganju vseh plavalcev:', allSwimmersError);
      return;
    }
    
    const unassigned = allSwimmersData.filter(s => 
      !currentEventSwimmerIds.includes(s.id)
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
      elAddToEventBtn.style.display = 'inline-block';
    } else {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Vsi plavalci so že v treningu ali nadomeščanju.';
      o.disabled = true;
      elModalSwimmerSelect.appendChild(o);
      elModalSwimmerSelect.style.display = 'none';
      elAddToEventBtn.style.display = 'none';
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
  // Funkcija za osvežitev podatkov za določen dan (kompatibilna z script.js)
  async function refreshDayData(date) {
    console.log('=== REFRESH DAY DATA START ===');
    console.log('date:', date);
    
    const ymd = iso(date);
    console.log('ymd:', ymd);
    
    console.log('Nalagam prisotnost iz Supabase...');
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', ymd);
    
    if (attError) { 
      console.error('Napaka pri osveževanju prisotnosti za dan:', attError); 
      return; 
    }
    
    console.log('attData:', attData);
    
    console.log('Nalagam status terminov iz Supabase...');
    const { data: statusData, error: statusError } = await supabase
      .from('term_status')
      .select('*')
      .eq('date', ymd);

    if (statusError) { 
      console.error('Napaka pri osveževanju statusa termina za dan:', statusError); 
      return; 
    }
    
    console.log('statusData:', statusData);
    
    console.log('Posodabljam lokalne podatke...');
    attendance[ymd] = attData.reduce((acc, row) => {
      acc[row.term_id] = acc[row.term_id] || {};
      acc[row.term_id][row.swimmer_id] = row.status;
      row.status;
      return acc;
    }, {});

    termStatus[ymd] = statusData.reduce((acc, row) => {
      acc[row.term_id] = { status: row.status, note: row.note, notes: row.notes };
      return acc;
    }, {});
    
    console.log('Lokalni podatki posodobljeni:');
    console.log('attendance[ymd]:', attendance[ymd]);
    console.log('termStatus[ymd]:', termStatus[ymd]);
    console.log('=== REFRESH DAY DATA END ===');
  }

  // Uporabi isto funkcijo kot v glavni strani (script.js)
  window.updateAttendance = async function(swimmerId, present) {
    console.log('=== UPDATE ATTENDANCE START ===');
    console.log('swimmerId:', swimmerId);
    console.log('present:', present);
    console.log('currentEventTermId:', currentEventTermId);
    console.log('currentEventDate:', currentEventDate);
    
    if (!currentEventTermId || !currentEventDate) {
      console.error('Manjkajo podatki:', { currentEventTermId, currentEventDate });
      return;
    }
    
    try {
      console.log('Poskušam shraniti v Supabase...');
      // Uporabi isto strukturo kot v glavni strani
      const { error } = await supabase
        .from('attendance')
        .upsert({ 
          date: currentEventDate, 
          term_id: currentEventTermId, 
          swimmer_id: swimmerId, 
          status: present 
        }, { 
          onConflict: ['date', 'term_id', 'swimmer_id'] 
        });

      if (error) throw error;
      
      console.log('Uspešno shranjeno v Supabase');
      console.log('Osvežujem podatke...');
      
      // Osveži podatke za dan (kompatibilno z script.js)
      await refreshDayData(new Date(currentEventDate));
      
      console.log('Podatki osveženi, posodabljam povzetek...');
      
      // Posodobi povzetek
      updateSummary();
      
      console.log('Povzetek posodobljen, posodabljam kalendar...');
      
      // Posodobi tudi kalendar (če je potrebno)
      renderCalendar();
      
      console.log('=== UPDATE ATTENDANCE END ===');
      
    } catch (error) {
      console.error('Napaka pri shranjevanju prisotnosti:', error);
      alert('Napaka pri shranjevanju prisotnosti');
    }
  };

  // ===== UPRAVLJANJE PLAVALCEV V TRENINGU =====
  // Funkcija za odstranitev plavalca iz treninga (kompatibilna z script.js)
  window.removeSwimmerFromEvent = async function(swimmerId) {
    if (!currentEventTermId || !currentEventDate) return;
    
    try {
      // Odstrani iz baze (kompatibilno z script.js)
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('date', currentEventDate)
        .eq('term_id', currentEventTermId)
        .eq('swimmer_id', swimmerId);

      if (error) throw error;
      
      // Osveži podatke za dan (kompatibilno z script.js)
      await refreshDayData(new Date(currentEventDate));
      
      // Posodobi povzetek
      updateSummary();
      
      // Posodobi tudi kalendar (če je potrebno)
      renderCalendar();
      
    } catch (error) {
      console.error('Napaka pri odstranjevanju plavalca:', error);
      alert('Napaka pri odstranjevanju plavalca');
    }
  };

  // Dodaj event listener za gumb dodajanja plavalcev
  elAddToEventBtn.addEventListener('click', async () => {
    const swimmerId = elModalSwimmerSelect.value;
    if (!swimmerId) return;
    
    const swimmer = swimmers.find(s => s.id === swimmerId);
    if (!swimmer) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          date: currentEventDate,
          term_id: currentEventTermId,
          swimmer_id: swimmer.id,
          status: true
        }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
      
      if (error) {
        console.error('Napaka pri dodajanju plavalca v trening:', error);
        alert('Napaka pri dodajanju plavalca v trening');
        return;
      }

      // Osveži podatke za dan (kompatibilno z script.js)
      await refreshDayData(new Date(currentEventDate));
      
      // Ponovno naloži podatke dogodka
      await loadEventData(currentEventTermId, currentEventDate);
      
      // Posodobi povzetek
      updateSummary();
      
      console.log(`Plavalec ${swimmer.first_name} ${swimmer.last_name} dodan v nadomeščanje`);
      
    } catch (error) {
      console.error('Napaka pri dodajanju plavalca:', error);
      alert('Napaka pri dodajanju plavalca v trening');
    }
  });

  // ===== PONASTAVITEV PRISOTNOSTI PLAVALCA =====
  // Funkcija za ponastavitev prisotnosti plavalca (samo za redno dodeljene plavalce)
  window.resetAttendance = async function(swimmerId) {
    if (!currentEventTermId || !currentEventDate) return;
    
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('date', currentEventDate)
        .eq('term_id', currentEventTermId)
        .eq('swimmer_id', swimmerId);

      if (error) throw error;

      // Posodobi lokalne podatke
      if (attendance[currentEventDate] && attendance[currentEventDate][currentEventTermId]) {
        delete attendance[currentEventDate][currentEventTermId][swimmerId];
      }

      // Ponovno naloži podatke dogodka
      await loadEventData(currentEventTermId, currentEventDate);
      
      // Posodobi povzetek
      updateSummary();
      
      console.log(`Prisotnost plavalca ponastavljena`);
      
    } catch (error) {
      console.error('Napaka pri ponastavljanju prisotnosti plavalca:', error);
      alert('Napaka pri ponastavljanju prisotnosti plavalca');
    }
  };

  // ===== IZBRISANJE PLAVALCA IZ TRENINGA =====
  // Funkcija za odstranitev plavalca iz treninga (samo za nadomeščanje)
  window.removeSwimmerFromEvent = async function(swimmerId) {
    if (!currentEventTermId || !currentEventDate) return;
    
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('date', currentEventDate)
        .eq('term_id', currentEventTermId)
        .eq('swimmer_id', swimmerId);

      if (error) throw error;

      // Posodobi lokalne podatke
      if (attendance[currentEventDate] && attendance[currentEventDate][currentEventTermId]) {
        delete attendance[currentEventDate][currentEventTermId][swimmerId];
      }

      // Ponovno naloži podatke dogodka
      await loadEventData(currentEventTermId, currentEventDate);
      
      // Posodobi povzetek
      updateSummary();
      
      console.log(`Plavalec odstranjen iz nadomeščanja`);
      
    } catch (error) {
      console.error('Napaka pri odstranjevanju plavalca iz nadomeščanja:', error);
      alert('Napaka pri odstranjevanju plavalca iz nadomeščanja');
    }
  };

  // ===== POVZETEK =====
  function updateSummary() {
    const year = currentYear;
    const month = currentMonth;
    
    console.log('=== UPDATE SUMMARY START ===');
    console.log('swimmers:', swimmers);
    console.log('userTerms:', userTerms);
    console.log('TERMS:', TERMS);
    
    // Uporabi isto logiko kot v glavni strani
    const res = {};
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0,0,0,0);

    // Inicializacija podatkov za vse plavalce trenerja
    swimmers.forEach(s => {
      res[s.id] = { 
        first: s.first_name, 
        last: s.last_name, 
        att: 0, 
        pos: 0,
        groups: [], // Dodaj seznam skupin
        isDeleted: s.is_deleted || false
      };
      
      // Dodaj skupine, v katerih je plavalec
      if (s.terms) {
        s.terms.forEach(termId => {
          if (userTerms.includes(termId)) {
            const term = TERMS.find(t => t.id === termId);
            if (term) {
              const dayName = DAYNAME[term.day];
              const timeRange = `${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`;
              res[s.id].groups.push(`${dayName} ${timeRange}`);
            }
          }
        });
      }
    });

    // Zanka za izračun prisotnosti (att)
    const allAttendance = Object.entries(attendance);
    for (const [date, termData] of allAttendance) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      if (d >= monthStart && d <= monthEnd) {
        for (const termId in termData) {
          // Preveri, če termin pripada trenerju
          if (!userTerms.includes(termId)) continue;
          
          for (const swimmerId in termData[termId]) {
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
      const todaysTerms = getEventsForDate(ymd);

      todaysTerms.forEach(term => {
        const termIsActive = term.status === "active";
        
        if (termIsActive) {
          swimmers.forEach(s => {
            if (res[s.id] && s.terms && s.terms.includes(term.termId)) {
              
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
    
    // Prikaži povzetek
    let html = `<table><thead><tr><th>Plavalec</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
    
    // Filtriramo plavalce, ki nimajo nobenega možnega obiska
    const rows = Object.values(res).filter(r => r.pos > 0).sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
    
    if(rows.length === 0) {
      html += `<tr><td colspan="4" class="muted">Ni plavalcev.</td></tr>`;
    } else {
      rows.forEach(r => {
        const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
        const swimmerName = r.isDeleted ? `<span style="text-decoration: line-through; color: #999;">${r.first} ${r.last}</span>` : `${r.first} ${r.last}`;
        
        html += `<tr>
          <td>${swimmerName}</td>
          <td>${r.att}</td>
          <td>${r.pos}</td>
          <td>${pct}</td>
        </tr>`;
      });
    }
    
    html += `</tbody></table>`;
    
    elSummaryBox.innerHTML = html;
    console.log('=== UPDATE SUMMARY END ===');
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



  // Event listenerji za day modal
  elCloseDayModalBtn.addEventListener('click', closeDayModal);
  elDayModal.addEventListener('click', (e) => {
    if (e.target === elDayModal) closeDayModal();
  });

  // ===== NALAGANJE PODATKOV =====
  async function loadDataFromSupabase() {
    try {
      // Če trener nima terminov, ne naloži podatkov
      if (!userTerms || userTerms.length === 0) {
        console.log('Trener nima terminov, ne naloži podatkov');
        TERMS = [];
        swimmers = [];
        attendance = {};
        termStatus = {};
        renderCalendar();
        updateSummary();
        return;
      }
      
      console.log('=== LOAD DATA FROM SUPABASE START ===');
      console.log('userTerms:', userTerms);
      console.log('userTerms length:', userTerms.length);
      console.log('userTerms type:', typeof userTerms);
      console.log('userTerms is array:', Array.isArray(userTerms));
      
      // Naloži samo termine trenerja
      const { data: termsData, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .in('id', userTerms);

      if (termsError) throw termsError;
      TERMS = termsData || [];
      console.log('Naloženi termini:', TERMS);

      // Naloži VSE plavalce (vključno z izbrisanimi za zgodovinske podatke)
      const { data: swimmersData, error: swimmersError } = await supabase
        .from('swimmers')
        .select('*');

      if (swimmersError) throw swimmersError;
      
      console.log('Vsi plavalci iz baze:', swimmersData);
      console.log('Filtriram plavalce...');
      console.log('userTerms za filtriranje:', userTerms);
      
      // Filtriraj plavalce, ki pripadajo trenerjevim terminom
      // Plavalec pripada trenerju, če ima vsaj en termin, ki je v userTerms
      console.log('userTerms type:', typeof userTerms);
      console.log('userTerms is array:', Array.isArray(userTerms));
      
      swimmers = (swimmersData || []).filter(s => {
        // Preveri, če plavalec ima katerikoli termin, ki pripada trenerju
        console.log(`\n--- Preverjam plavalca: ${s.first_name} ${s.last_name} ---`);
        console.log(`Plavalec ID: ${s.id}`);
        console.log(`Plavalec terms:`, s.terms);
        console.log(`Plavalec terms type:`, typeof s.terms);
        console.log(`Plavalec terms is array:`, Array.isArray(s.terms));
        
        if (!s.terms || !Array.isArray(s.terms)) {
          console.log(`Plavalec ${s.first_name} ${s.last_name} nima terms array-ja`);
          return false;
        }
        
        const hasMatchingTerm = s.terms.some(termId => {
          const isIncluded = userTerms.includes(termId);
          console.log(`Termin ${termId}: v userTerms? ${isIncluded}`);
          return isIncluded;
        });
        
        console.log(`Plavalec ${s.first_name} ${s.last_name}: hasMatchingTerm=${hasMatchingTerm}`);
        return hasMatchingTerm;
      });
      
      console.log('Filtirani plavalci za trenerja:', swimmers);
      console.log('Število plavalcev po filtiranju:', swimmers.length);

      // Naloži prisotnost za trenerjeve termine
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .in('term_id', userTerms);

      if (attendanceError) throw attendanceError;

      attendance = {};
      if (attendanceData) {
        attendanceData.forEach(record => {
          // Uporabi isto strukturo kot v glavni strani
          if (!attendance[record.date]) attendance[record.date] = {};
          if (!attendance[record.date][record.term_id]) attendance[record.date][record.term_id] = {};
          attendance[record.date][record.term_id][record.swimmer_id] = record.status;
        });
      }
      
      console.log('Naložena prisotnost:', attendance);
      
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

      console.log('=== LOAD DATA FROM SUPABASE END ===');
      console.log('TERMS:', TERMS.length, 'swimmers:', swimmers.length, 'attendance keys:', Object.keys(attendance));

      // Posodobi UI
      renderCalendar();
      updateSummary();

    } catch (error) {
      console.error('Napaka pri nalaganju podatkov:', error);
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
          console.log('Nalaganje vseh trenerjev...');
          
          const { data: trainersData, error } = await supabase
              .from('trainers')
              .select('*')
              .neq('user_id', currentUser.id); // Izključi trenutnega trenerja
          
          console.log('Rezultat nalaganja trenerjev:', { trainersData, error });
          
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
              option.textContent = `${DAYNAME[term.day]} ${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`;
              substituteTermSelect.appendChild(option);
          });
          
          console.log('Posodobljeni select elementi za nadomestne trenerje');
          
      } catch (error) {
          console.error('Napaka pri nalaganju trenerjev:', error);
      }
  }
  
  // Naloži moje nadomestne dogovore
  async function loadMySubstitutions() {
      try {
          console.log('Nalaganje nadomestnih dogovorov za:', currentUser.email);
          
          const { data: substitutionsData, error } = await supabase
              .rpc('get_trainer_substitutions', { trainer_email: currentUser.email });
          
          console.log('Rezultat get_trainer_substitutions:', { substitutionsData, error });
          
          if (error) throw error;
          
                       if (substitutionsData && substitutionsData.length > 0) {
               const html = substitutionsData.map(sub => `
                   <div class="substitution-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                       <div><strong>Termin:</strong> ${sub.term_id}</div>
                       <div><strong>Datum:</strong> ${new Date(sub.substitute_date).toLocaleDateString('sl-SI')}</div>
                       <div><strong>${sub.is_substitute ? 'Nadomestujem za:' : 'Nadomestuje me:'}</strong> ${sub.other_trainer_name}</div>
                       <div><strong>Razlog:</strong> ${sub.reason || 'Ni razloga'}</div>
                       <button class="btn warn" onclick="deleteSubstitution('${sub.id}')" style="margin-top: 5px;">${sub.is_substitute ? 'Prekliči nadomestitev' : 'Prekliči'}</button>
                   </div>
               `).join('');
              
              mySubstitutionsList.innerHTML = html;
          } else {
              mySubstitutionsList.innerHTML = '<p class="muted">Ni nadomestnih dogovorov</p>';
          }
          
      } catch (error) {
          console.error('Napaka pri nalaganju nadomestnih dogovorov:', error);
          mySubstitutionsList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov: ' + error.message + '</p>';
      }
  }
  
  // Naloži nadomestne obveznosti
  async function loadSubstituteObligations() {
      try {
          console.log('Nalaganje nadomestnih obveznosti za trenerja ID:', currentUser.id);
          
          // Najprej poiščimo trenerja v tabeli trenerjev
          const { data: trainerData, error: trainerError } = await supabase
              .from('trainers')
              .select('id')
              .eq('user_id', currentUser.id)
              .single();
          
          if (trainerError || !trainerData) {
              console.error('Trener ni najden za nadomestne obveznosti:', trainerError);
              substituteObligationsList.innerHTML = '<p class="error">Trener ni najden</p>';
              return;
          }
          
          const { data: obligationsData, error } = await supabase
              .from('substitute_trainers')
              .select(`
                  *,
                  original_trainer:trainers!substitute_trainers_original_trainer_id_fkey(first_name, last_name),
                  term:terms(id, day, start_time, end_time)
              `)
              .eq('substitute_trainer_id', trainerData.id);
          
          console.log('Rezultat nadomestnih obveznosti:', { obligationsData, error });
          
          if (error) throw error;
          
          if (obligationsData && obligationsData.length > 0) {
              const html = obligationsData.map(obligation => `
                  <div class="obligation-item" style="border: 1px solid #007bff; padding: 10px; margin: 5px 0; border-radius: 5px; background-color: #f8f9fa;">
                      <div><strong>Termin:</strong> ${DAYNAME[obligation.term.day]} ${obligation.term.start_time.slice(0, 5)}-${obligation.term.end_time.slice(0, 5)}</div>
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
          substituteObligationsList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov: ' + error.message + '</p>';
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
       
       // Preveri, ali se datum ujema z dnem v tednu termina
       const selectedTerm = TERMS.find(t => t.id === termId);
       if (selectedTerm) {
           const selectedDate = new Date(date);
           const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
           
           if (dayOfWeek !== selectedTerm.day) {
               const dayNames = ["", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
               alert(`Datum mora biti ${dayNames[selectedTerm.day]}. Izberite pravilni datum.`);
               return;
           }
       }
      
               // Pokaži modal za potrditev
       const selectedTrainer = Array.from(substituteTrainerSelect.options).find(opt => opt.value === substituteTrainerId);
      
      substituteConfirmationDetails.innerHTML = `
          <p><strong>Termin:</strong> ${DAYNAME[selectedTerm.day]} ${selectedTerm.start_time.slice(0, 5)}-${selectedTerm.end_time.slice(0, 5)}</p>
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
           
           // Posodobi sezname
           await loadMySubstitutions();
           await loadSubstituteObligations();
           
           // Ponovno naloži podatke, če je bilo brisanje uspešno
           await loadDataFromSupabase();
           
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
  
       // Preveri, ali je trener nadomestni trener in naloži prisotnost
   async function checkAndLoadTrainerAttendance(termId, date) {
       try {
           console.log('checkAndLoadTrainerAttendance - termId:', termId, 'date:', date);
           console.log('trainerAttendanceSection element:', trainerAttendanceSection);
           console.log('trainerAttendanceTable element:', trainerAttendanceTable);
           
           // Preveri, ali obstajajo potrebni elementi
           if (!trainerAttendanceSection) {
               console.log('Element trainerAttendanceSection ne obstaja, preskačem');
               return;
           }
           
           if (!trainerAttendanceTable) {
               console.log('Element trainerAttendanceTable ne obstaja, preskačem');
               return;
           }
           
           // Najdi trenerja
           const { data: trainerData, error: trainerError } = await supabase
               .from('trainers')
               .select('id')
               .eq('user_id', currentUser.id)
               .single();
           
           if (trainerError) throw trainerError;
           
           console.log('Trener ID:', trainerData.id);
           
           // Preveri, ali je trener nadomestni trener za ta termin in datum
           const { data: substituteData, error: substituteError } = await supabase
               .from('substitute_trainers')
               .select('*')
               .eq('substitute_trainer_id', trainerData.id)
               .eq('term_id', termId)
               .eq('substitute_date', date)
               .single();
           
           console.log('Nadomestni podatki:', { substituteData, substituteError });
           
           if (substituteError && substituteError.code !== 'PGRST116') {
               throw substituteError;
           }
           
           // Če je trener nadomestni trener, prikaži sekcijo za prisotnost trenerja
           if (substituteData) {
               console.log('Trener je nadomestni trener, prikazujem sekcijo za prisotnost');
               trainerAttendanceSection.style.display = 'block';
               await loadTrainerAttendance(termId, date);
           } else {
               console.log('Trener ni nadomestni trener, skrivam sekcijo za prisotnost');
               trainerAttendanceSection.style.display = 'none';
           }
           
       } catch (error) {
           console.error('Napaka pri preverjanju nadomestnega trenerja:', error);
           if (trainerAttendanceSection) {
               trainerAttendanceSection.style.display = 'none';
           }
       }
   }
   
   // Naloži prisotnost trenerja
   async function loadTrainerAttendance(termId, date) {
       try {
           console.log('loadTrainerAttendance - termId:', termId, 'date:', date);
           console.log('trainerAttendanceTable element:', trainerAttendanceTable);
           
           // Preveri, ali obstajajo potrebni elementi
           if (!trainerAttendanceTable) {
               console.log('Element trainerAttendanceTable ne obstaja, preskačem');
               return;
           }
           
           // Najdi trenerja
           const { data: trainerData, error: trainerError } = await supabase
               .from('trainers')
               .select('id, first_name, last_name')
               .eq('user_id', currentUser.id)
               .single();
           
           if (trainerError) throw trainerError;
           
           console.log('Trener ID:', trainerData.id);
           
           // Naloži prisotnost trenerja
           const { data: attendanceData, error: attendanceError } = await supabase
               .from('trainer_attendance')
               .select('*')
               .eq('trainer_id', trainerData.id)
               .eq('term_id', termId)
               .eq('date', date)
               .single();
           
           console.log('Prisotnost trenerja:', { attendanceData, attendanceError });
           
           if (attendanceError && attendanceError.code !== 'PGRST116') {
               throw attendanceError;
           }
           
           // Prikaži prisotnost trenerja v tabeli
           const isPresent = attendanceData ? attendanceData.present : false;
           const note = attendanceData ? attendanceData.note || '' : '';
           
           trainerAttendanceTable.innerHTML = `
               <tr>
                   <td>${trainerData.first_name} ${trainerData.last_name} (nadomestni trener)</td>
                   <td>
                       <input type="checkbox" ${isPresent ? 'checked' : ''} 
                              onchange="updateTrainerAttendance('${trainerData.id}', '${termId}', '${date}', ${!isPresent}, '${note}')">
                   </td>
                   <td>
                       <input type="text" value="${note}" 
                              onchange="updateTrainerAttendance('${trainerData.id}', '${termId}', '${date}', ${isPresent}, this.value)" 
                              placeholder="Opomba">
                   </td>
               </tr>
           `;
           
       } catch (error) {
           console.error('Napaka pri nalaganju prisotnosti trenerja:', error);
       }
   }
  
       // Posodobi prisotnost trenerja (globalna funkcija)
   window.updateTrainerAttendance = async function(trainerId, termId, date, present, note) {
       try {
           console.log('updateTrainerAttendance - trainerId:', trainerId, 'termId:', termId, 'date:', date, 'present:', present, 'note:', note);
           
           // Shrani prisotnost
           const { error: upsertError } = await supabase
               .from('trainer_attendance')
               .upsert({
                   trainer_id: trainerId,
                   term_id: termId,
                   date: date,
                   present: present,
                   note: note
               });
           
           if (upsertError) throw upsertError;
           
           console.log('Prisotnost trenerja shranjena');
           
       } catch (error) {
           console.error('Napaka pri shranjevanju prisotnosti trenerja:', error);
           alert('Napaka pri shranjevanju prisotnosti trenerja');
       }
   };



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

  // Počakaj, da se DOM popolnoma naloži, nato začni z autentikacijo
  setTimeout(() => {
      console.log('=== DELAYED INIT START ===');
      console.log('Preverjam elemente po 500ms...');
      console.log('elAttendanceTable:', !!elAttendanceTable);
      console.log('elSubstitutionTable:', !!elSubstitutionTable);
      
      if (elAttendanceTable && elSubstitutionTable) {
          console.log('Elementi so naloženi, začenjam z autentikacijo...');
          initializeTrainerElements();
          checkAuth();
          // Naloži podatke za nadomestne trenerje
          loadSubstituteData();
          // Naloži nadomestne termine
          loadSubstituteTerms();
      } else {
          console.error('Elementi še vedno niso naloženi, poskušam ponovno naložiti...');
                           // Poskusi ponovno naložiti elemente
                 const retryAttendanceTable = document.getElementById("attendanceTable");
                 const retrySubstitutionTable = document.getElementById("substitutionTable");
          
          if (retryAttendanceTable && retrySubstitutionTable) {
              console.log('Elementi so sedaj naloženi, začenjam z autentikacijo...');
              // Posodobi globalne reference
              elAttendanceTable = retryAttendanceTable;
              elSubstitutionTable = retrySubstitutionTable;
              initializeTrainerElements();
              checkAuth();
              // Naloži podatke za nadomestne trenerje
              loadSubstituteData();
              // Naloži nadomestne termine
              loadSubstituteTerms();
          } else {
              console.error('Elementi še vedno niso naloženi, prekinjam');
          }
      }
      console.log('=== DELAYED INIT END ===');
  }, 500);

});