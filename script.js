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
    const elTermSelect = document.getElementById("termSelect");
    const elAssignTermBtn = document.getElementById("assignTermBtn");
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn"); 
    const elSwimmerInfo = document.getElementById("swimmerInfo");
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
    const elModal = document.getElementById("eventModal");
    const elModalTitle = document.getElementById("modalTitle");
    const elModalMeta = document.getElementById("modalMeta");
    const elAttendanceTable = document.getElementById("attendanceTable"); // Popravljena vrstica
    const elToggleEventBtn = document.getElementById("toggleEventBtn");
    const elCloseModalBtn = document.getElementById("closeModalBtn");
    const elModalSwimmerSelect = document.getElementById("modalSwimmerSelect");
    const elAddToEventBtn = document.getElementById("addToEventBtn");
    const elInactiveNote = document.getElementById("inactiveNote");
    const elNotesInput = document.getElementById("notesInput");
    const elSaveNotesBtn = document.getElementById("saveNotesBtn");
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
    function termById(id){ return TERMS.find(t=>t.id===id); }

    function getAttendanceStatus(date, termId) {
        const ymd = iso(date);
        
        const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
        const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
        
        const termAtt = attendance[ymd]?.[termId] || {};
        
        const markedAssignedSwimmersCount = assignedSwimmerIds.filter(id => termAtt.hasOwnProperty(id)).length;
        
        const totalAssignedCount = assignedSwimmers.length;

        if (totalAssignedCount === 0) {
            return 'complete'; 
        } else if (markedAssignedSwimmersCount === 0) {
            return 'unfilled';
        } else if (markedAssignedSwimmersCount === totalAssignedCount) {
            return 'complete';
        } else {
            return 'partial';
        }
    }
    
    function getTermStatus(date, termId){
      const ymd = iso(date);
      const status = termStatus[ymd]?.[termId]?.status || "active";
      const note = termStatus[ymd]?.[termId]?.note || "";
      const notes = termStatus[ymd]?.[termId]?.notes || "";
      return { status, note, notes };
    }
    function isInactive(date, termId){ return getTermStatus(date, termId).status === "inactive"; }


    // ===== Pogled meseca =====
    let viewDate = new Date(); viewDate.setDate(1);

    function renderMonth(){
      const y=viewDate.getFullYear(), m=viewDate.getMonth();
      elMonthLabel.textContent = new Date(y,m,1).toLocaleDateString("sl-SI", {month:"long",year:"numeric"});
      elCalendarGrid.innerHTML = "";

      const pad = startWeekday(y,m)-1;
      for(let i=0;i<pad;i++){
        const div=document.createElement("div"); div.className="day disabled"; elCalendarGrid.appendChild(div);
      }

      const dim = daysInMonth(y,m);
      for(let d=1; d<=dim; d++){
        const date = new Date(y,m,d);
        const day = document.createElement("div");
        day.className="day"+(isToday(date)?" today":"");
        const num = document.createElement("div"); num.className="num"; num.textContent=d; day.appendChild(num);

        const todays = getTermsForDate(date);
        todays.sort((a,b)=> a.start_time.localeCompare(b.start_time));

        todays.forEach(t=>{
          const e = document.createElement("div");
          e.className = "event";

          if (isPast(date) || isToday(date)) {
            const status = getAttendanceStatus(date, t.id);
            e.classList.add(status);
          }
          
          if (isInactive(date, t.id)) {
              e.classList.add("disabled");
          }
          
          e.innerHTML = `<span class="time">${t.start_time.slice(0, 5)}<span class="end-time">–${t.end_time.slice(0, 5)}</span></span>`;

          e.title = t.label;
          e.dataset.termId = t.id;
          day.appendChild(e);
        });

        if (todays.length > 0) {
          day.addEventListener("click", (e) => {
            e.stopPropagation();
            if (todays.length === 1) {
              openEvent(date, todays[0].id);
            } else {
              openDayModal(date);
            }
          });
        }
        
        // Prikaz "več dogodkov" samo, če se ne prikažejo vsi
        if (window.innerWidth <= 768 && todays.length > 2) {
          const more = document.createElement("div");
          more.className = "more-events-indicator";
          more.textContent = `+ ${todays.length - 2} več...`;
          day.appendChild(more);
        }
        
        elCalendarGrid.appendChild(day);
      }
      const summaryData = calculateSummaryData(y, m);
      renderSummary(summaryData);
    }

    // ===== NOV MODAL: izbira termina na določen dan (za mobilno verzijo) =====
    function openDayModal(date) {
      const todaysTerms = getTermsForDate(date).sort((a,b) => a.start_time.localeCompare(b.start_time));
      elDayModalTitle.textContent = `Termini za ${date.toLocaleDateString("sl-SI", { weekday: 'long', day: 'numeric', month: 'long' })}`;
      elDayModalList.innerHTML = "";

      if (todaysTerms.length === 0) {
        elDayModalList.innerHTML = "<p class='muted' style='text-align: center;'>Na ta dan ni terminov.</p>";
      } else {
        todaysTerms.forEach(t => {
          const e = document.createElement("div");
          e.className = "event";
          
          if (isPast(date) || isToday(date)) {
            const status = getAttendanceStatus(date, t.id);
            e.classList.add(status);
          }

          if (isInactive(date, t.id)) {
              e.classList.add("disabled");
          }

          e.innerHTML = `<span class="time">${t.start_time.slice(0, 5)}<span class="end-time">–${t.end_time.slice(0, 5)}</span></span>`;
          
          e.addEventListener("click", () => {
            closeDayModal();
            openEvent(date, t.id);
          });
          elDayModalList.appendChild(e);
        });
      }
      openModal(elDayModal);
    }

    function closeDayModal() { closeModal(elDayModal); }
    elCloseDayModalBtn.addEventListener("click", closeDayModal);
    elDayModal.addEventListener("click", (e) => { if (e.target === elDayModal) closeDayModal(); });

    // ===== MODAL: odpranje dogodka =====
    let modalCtx = { date:null, termId:null };

    async function refreshDayData(date) {
      const ymd = iso(date);
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', ymd);
      
      if (attError) { console.error('Napaka pri osveževanju prisotnosti za dan:', attError); return; }
      
      const { data: statusData, error: statusError } = await supabase
        .from('term_status')
        .select('*')
        .eq('date', ymd);

      if (statusError) { console.error('Napaka pri osveževanju statusa termina za dan:', statusError); return; }
      
      attendance[ymd] = attData.reduce((acc, row) => {
        acc[row.term_id] = acc[row.term_id] || {};
        acc[row.term_id][row.swimmer_id] = row.status;
        return acc;
      }, {});

      termStatus[ymd] = statusData.reduce((acc, row) => {
        acc[row.term_id] = { status: row.status, note: row.note, notes: row.notes };
        return acc;
      }, {});
    }


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

      const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => swimmers.find(s => s.id === swimmerId)).filter(Boolean);
      const assignedActiveSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted && !termAtt[s.id]);
      const allSwimmersForEvent = [...new Set([...swimmersWithAttendance, ...assignedActiveSwimmers])];
      
      elAttendanceTable.innerHTML = "";
      if(allSwimmersForEvent.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td"); td.colSpan=2; td.className="muted"; td.textContent="Ni dodeljenih plavalcev za ta termin.";
        tr.appendChild(td); elAttendanceTable.appendChild(tr);
      } else {
        allSwimmersForEvent.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
          const tr=document.createElement("tr");
          const td1=document.createElement("td"); td1.textContent = `${s.first_name} ${s.last_name}`;
          
          const td2=document.createElement("td");
          td2.style.display = "flex"; td2.style.gap = "4px";
          td2.style.alignItems = "center";

          const status = termAtt[s.id];
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isInactive(date, termId)) { btnPresent.disabled = true; }
          if (status === true) { btnPresent.classList.add("ok"); } else { btnPresent.classList.add("neutral"); }
          btnPresent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          if (status === false) { btnAbsent.classList.add("warn"); } else { btnAbsent.classList.add("neutral"); }
          btnAbsent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              await refreshDayData(date);
              openEvent(date, termId);
              refreshSwimmerPanel();
              renderMonth();
            }
          });
          
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          if (isInactive(date, termId)) { btnRemove.disabled = true; }
          btnRemove.addEventListener("click", async ()=>{
              const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('date', ymd)
                .eq('term_id', termId)
                .eq('swimmer_id', s.id);
            if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
                await refreshDayData(date);
                openEvent(date, termId);
                refreshSwimmerPanel();
                renderMonth();
            }
          });
          
          tr.appendChild(td1); tr.appendChild(td2); 
          
          td2.appendChild(btnPresent);
          td2.appendChild(btnAbsent);
          td2.appendChild(btnRemove);
          
          elAttendanceTable.appendChild(tr);
        });
      }

      elModalSwimmerSelect.innerHTML = "";
      const currentEventSwimmerIds = allSwimmersForEvent.map(s => s.id);
      const unassigned = swimmers.filter(s => !currentEventSwimmerIds.includes(s.id) && !s.is_deleted)
                               .sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
      
      if(unassigned.length > 0) {
        unassigned.forEach(s => {
          const o = document.createElement("option");
          o.value = s.id;
          o.textContent = `${s.first_name} ${s.last_name}`;
          elModalSwimmerSelect.appendChild(o);
        });
        elAddToEventBtn.style.display = "inline-block";
        elModalSwimmerSelect.style.display = "inline-block";
      } else {
        const o = document.createElement("option");
        o.textContent = "Vsi plavalci so že dodeljeni.";
        o.disabled = true;
        elModalSwimmerSelect.appendChild(o);
        elAddToEventBtn.style.display = "none";
        elModalSwimmerSelect.style.display = "none";
      }

      const termStatusObj = getTermStatus(date, termId);
      if (termStatusObj.status === "inactive") {
        elToggleEventBtn.textContent = "Aktiviraj trening";
        elInactiveNote.textContent = termStatusObj.note;
        elInactiveNote.style.display = "block";
      } else {
        elToggleEventBtn.textContent = "Deaktiviraj trening";
        elInactiveNote.textContent = "";
        elInactiveNote.style.display = "none";
      }
      
      elNotesInput.value = termStatusObj.notes || "";
      
      elSaveNotesBtn.textContent = "Shrani trening";
      elSaveNotesBtn.onclick = async () => {
        const notes = elNotesInput.value;
        const { error } = await supabase
          .from('term_status')
          .upsert({ date: ymd, term_id: termId, notes: notes }, { onConflict: ['date', 'term_id'] });
        if (error) {
          console.error("Napaka pri shranjevanju zapiska:", error);
          alert("Napaka pri shranjevanju zapiska. Preverite konzolo.");
        } else {
          await refreshDayData(date);
          alert("Zapisek shranjen!");
        }
      };

      elToggleEventBtn.onclick = async () => {
        const currentStatus = getTermStatus(date, termId).status;
        const currentNote = getTermStatus(date, termId).note;
        if (currentStatus === "active") {
          elNoteInput.value = currentNote;
          openModal(elNoteModal);
        } else {
          const { error } = await supabase
            .from('term_status')
            .upsert({ date: ymd, term_id: termId, status: "active", note: null }, { onConflict: ['date', 'term_id'] });
          if (error) {
            console.error('Napaka pri aktiviranju statusa:', error);
            alert('Napaka pri aktivaciji. Preverite konzolo.');
            return;
          }
          await refreshDayData(date);
          await openEvent(date, termId);
          renderMonth();
        }
      };
      
      elConfirmNoteBtn.onclick = async () => {
        const note = elNoteInput.value.trim();
        if (!note) {
          alert("Prosim, vnesite opombo pred potrditvijo.");
          return;
        }
        const ymd = iso(modalCtx.date);
        const termId = modalCtx.termId;
        const { error } = await supabase
          .from('term_status')
          .upsert({ date: ymd, term_id: termId, status: "inactive", note }, { onConflict: ['date', 'term_id'] });
        if (error) {
          console.error('Napaka pri posodabljanju statusa:', error);
          alert('Napaka pri deaktivaciji. Preverite konzolo.');
          return;
        }
        closeModal(elNoteModal);
        await refreshDayData(modalCtx.date);
        await openEvent(modalCtx.date, modalCtx.termId);
        renderMonth();
      };
      
      elCancelNoteBtn.onclick = () => { closeModal(elNoteModal); };
      elCloseNoteModalBtn.onclick = () => { closeModal(elNoteModal); };
      elNoteModal.addEventListener("click", (e) => { if (e.target === elNoteModal) { closeModal(elNoteModal); } });

      openModal(elModal);
    }

    function openModal(modalEl){
      modalEl.style.display = "flex";
      modalEl.setAttribute("aria-hidden", "false");
    }
    
    function closeModal(modalEl){
      modalEl.style.display = "none";
      modalEl.setAttribute("aria-hidden", "true");
    }

    elCloseModalBtn.addEventListener("click", ()=>{
      closeModal(elModal);
      renderMonth();
    });
    
    elModal.addEventListener("click", (e)=>{
      if(e.target === elModal){
        closeModal(elModal);
        renderMonth();
      }
    });

    elAddToEventBtn.addEventListener("click", async ()=>{
      const swimmerId = elModalSwimmerSelect.value;
      const swimmer = swimmers.find(s=>s.id === swimmerId);
      if(!swimmer) return;
      const ymd = iso(modalCtx.date);
      const { error } = await supabase
        .from('attendance')
        .upsert({ date: ymd, term_id: modalCtx.termId, swimmer_id: swimmer.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
      if (error) {
        console.error('Napaka pri dodajanju plavalca v trening:', error);
      } else {
        await refreshDayData(modalCtx.date);
        openEvent(modalCtx.date, modalCtx.termId);
        refreshSwimmerPanel();
        renderMonth();
      }
    });

    // ===== POPRAVLJENA FUNKCIJA ZA POVZETEK =====
    function calculateSummaryData(year, month) {
      const res = {};
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      swimmers.forEach(s => {
        res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
      });

      const allAttendance = Object.entries(attendance);
      for (const [date, termData] of allAttendance) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        if (d >= monthStart && d <= monthEnd) {
          for (const termId in termData) {
            for (const swimmerId in termData[termId]) {
              const status = termData[termId][swimmerId];
              if (res[swimmerId]) {
                const term = termById(termId);
                if (term) {
                  res[swimmerId].att++;
                  if (status === true) {
                    res[swimmerId].pos++;
                  }
                }
              }
            }
          }
        }
      }
      return res;
    }
    
    function renderSummary(summaryData) {
      const tbody = document.createElement("tbody");
      for(const id in summaryData){
        const s = summaryData[id];
        const tr = document.createElement("tr");
        const att = s.att > 0 ? `${s.pos} / ${s.att} (${Math.round(s.pos/s.att*100)}%)` : "0 / 0 (0%)";
        tr.innerHTML = `<td>${s.first} ${s.last}</td><td>${att}</td>`;
        tbody.appendChild(tr);
      }
      elSummaryTable.querySelector("tbody").innerHTML = "";
      elSummaryTable.querySelector("tbody").appendChild(tbody);
    }
    
    // ===== OSTALE FUNKCIJE =====
    function refreshSwimmerPanel(){
        elSwimmerSelect.innerHTML = "";
        elTermSelect.innerHTML = "";
        elSwimmerInfo.innerHTML = "";
        
        const activeSwimmers = swimmers.filter(s => !s.is_deleted).sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
        const allTerms = TERMS.sort((a,b)=> (a.day+" "+a.start_time).localeCompare(b.day+" "+b.start_time));
        
        activeSwimmers.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = `${s.first_name} ${s.last_name}`;
            elSwimmerSelect.appendChild(opt);
        });
        
        allTerms.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0,5)}-${t.end_time.slice(0,5)}`;
            elTermSelect.appendChild(opt);
        });

        elSwimmerSelect.onchange = displaySwimmerTerms;
        if(elSwimmerSelect.value) displaySwimmerTerms();
    }
    
    function displaySwimmerTerms(){
        const id = elSwimmerSelect.value;
        const swimmer = swimmers.find(s=>s.id === id);
        if(!swimmer) return;
        
        elSwimmerInfo.innerHTML = `<h3>Termini</h3>`;
        const termsDiv = document.createElement("div");
        termsDiv.className = "swimmer-terms";
        if(swimmer.terms.length === 0){
          termsDiv.innerHTML = "<p class='muted'>Plavalec nima dodeljenih terminov.</p>";
        } else {
          swimmer.terms.forEach(termId => {
            const t = termById(termId);
            if(t){
              const chip = document.createElement("span");
              chip.className = "chip";
              chip.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0,5)}-${t.end_time.slice(0,5)}`;
              
              const removeBtn = document.createElement("button");
              removeBtn.className = "remove-term-btn";
              removeBtn.innerHTML = "&times;";
              removeBtn.onclick = async ()=>{
                  swimmer.terms = swimmer.terms.filter(tid => tid !== termId);
                  const { error } = await supabase.from('swimmers').update({ terms: swimmer.terms }).eq('id', id);
                  if (error) { console.error(error); alert("Napaka pri odstranjevanju termina!"); } else {
                      await loadData();
                  }
              };
              chip.appendChild(removeBtn);
              termsDiv.appendChild(chip);
            }
          });
        }
        elSwimmerInfo.appendChild(termsDiv);
    }
    
    elAssignTermBtn.addEventListener("click", async ()=>{
        const swimmerId = elSwimmerSelect.value;
        const termId = elTermSelect.value;
        if(!swimmerId || !termId) return;
        
        const swimmer = swimmers.find(s=>s.id===swimmerId);
        if(swimmer && !swimmer.terms.includes(termId)){
            swimmer.terms.push(termId);
            const { error } = await supabase.from('swimmers').update({ terms: swimmer.terms }).eq('id', swimmerId);
            if (error) { console.error(error); alert("Napaka pri dodeljevanju termina!"); } else {
                await loadData();
            }
        }
    });

    elDeleteSwimmerBtn.addEventListener("click", async ()=>{
      const swimmerId = elSwimmerSelect.value;
      if (!swimmerId) { return; }
      if (confirm("Ste prepričani, da želite izbrisati plavalca?")){
        const { error } = await supabase.from('swimmers').update({ is_deleted: true }).eq('id', swimmerId);
        if (error) { console.error(error); alert("Napaka pri brisanju plavalca!"); } else {
          await loadData();
        }
      }
    });

    function renderTermList(){
      elTermList.innerHTML = "";
      const allTerms = TERMS.sort((a,b)=> (a.day+" "+a.start_time).localeCompare(b.day+" "+b.start_time));
      allTerms.forEach(t => {
        const item = document.createElement("div");
        item.className = "chip";
        item.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0,5)}-${t.end_time.slice(0,5)}`;
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-term-btn";
        removeBtn.innerHTML = "&times;";
        removeBtn.onclick = async ()=>{
          if(confirm("Ste prepričani, da želite izbrisati ta termin? Odstranjeni bodo tudi vsi podatki o prisotnosti za ta termin.")){
            const { error } = await supabase.from('terms').delete().eq('id', t.id);
            if (error) { console.error(error); alert("Napaka pri brisanju termina!"); } else {
              await loadData();
            }
          }
        };
        item.appendChild(removeBtn);

        const editBtn = document.createElement("button");
        editBtn.className = "edit-term-btn btn neutral";
        editBtn.textContent = "Uredi";
        editBtn.onclick = ()=>{ openEditTermModal(t); };
        item.appendChild(editBtn);

        elTermList.appendChild(item);
      });
    }

    function openEditTermModal(term){
      elEditTermModalTitle.textContent = `Urejanje termina: ${term.label}`;
      elEditTermDateFrom.value = term.date_from ? formatDate(term.date_from) : "";
      elEditTermDateTo.value = term.date_to ? formatDate(term.date_to) : "";
      
      const onSave = async () => {
        const dateFrom = parseDate(elEditTermDateFrom.value);
        const dateTo = parseDate(elEditTermDateTo.value);

        if(!dateFrom || !dateTo){
          alert("Neveljaven format datuma. Uporabite dd / mm / yyyy.");
          return;
        }

        const { error } = await supabase.from('terms').update({ date_from: dateFrom, date_to: dateTo }).eq('id', term.id);
        if(error){ console.error(error); alert("Napaka pri shranjevanju sprememb!"); } else {
          closeModal(elEditTermModal);
          await loadData();
        }
      };

      elSaveEditTermBtn.onclick = onSave;
      elCloseEditTermModalBtn.onclick = () => { closeModal(elEditTermModal); };
      elEditTermModal.addEventListener("click", (e) => { if(e.target === elEditTermModal) closeModal(elEditTermModal); });
      
      openModal(elEditTermModal);
    }

    elNotesBtn.addEventListener("click", ()=>{
      if(elNotesContainer.style.display === 'none' || elNotesContainer.style.display === '') {
        elNotesContainer.style.display = 'block';
      } else {
        elNotesContainer.style.display = 'none';
      }
    });

    // ===== UVOZ IN IZVOZ =====
    function parseCsv(csv){
      const lines = csv.split("\n").filter(line => line.trim() !== "");
      if (lines.length === 0) return [];
      const headers = lines[0].split(",").map(h => h.trim());
      const data = [];
      for(let i=1; i<lines.length; i++){
        const values = lines[i].split(",").map(v => v.trim());
        const row = {};
        headers.forEach((h,j) => { row[h] = values[j] || null; });
        data.push(row);
      }
      return data;
    }

    async function importSwimmers(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target.result;
        const newSwimmers = parseCsv(csv);
        
        const formattedSwimmers = newSwimmers.map(s => {
          let terms = [];
          if (s.terms) {
              terms = s.terms.split(';').map(t => t.trim());
          } else if (s.id) {
            terms = s.terms ? s.terms.split(',').map(t => t.trim()) : [];
            return {
              first_name: s.first_name,
              last_name: s.last_name,
              terms: terms
            };
          }
          return { first_name: s.first_name, last_name: s.last_name, terms: terms };
        }).filter(s => s.first_name || s.last_name);

        const { data, error } = await supabase.from('swimmers').insert(formattedSwimmers);
        if (error) { console.error('Napaka pri uvozu plavalcev:', error); alert('Napaka pri uvozu plavalcev!'); } else {
          alert("Plavalci uspešno uvoženi!");
          await loadData();
        }
      };
      reader.readAsText(file);
    }

    async function importTerms(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target.result;
        const newTerms = parseCsv(csv);

        const formattedTerms = newTerms.map(t => {
          const date_from = parseDate(t.date_from);
          const date_to = parseDate(t.date_to);
          return {
            id: t.id,
            day: parseInt(t.day, 10),
            start_time: t.start_time,
            end_time: t.end_time,
            date_from: date_from,
            date_to: date_to
          };
        });

        const { error } = await supabase.from('terms').insert(formattedTerms);
        if (error) { console.error('Napaka pri uvozu terminov:', error); alert('Napaka pri uvozu terminov!'); } else {
          alert("Termini uspešno uvoženi!");
          await loadData();
        }
      };
      reader.readAsText(file);
    }

    elCsvInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        importSwimmers(file);
      }
    });

    elCsvTermsInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        importTerms(file);
      }
    });

    function populateExportSelects() {
      const currentYear = new Date().getFullYear();
      const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);
      const months = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];

      elExportYearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      elExportMonthSelect.innerHTML = months.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    }

    function exportCsv() {
      const selectedMonth = parseInt(elExportMonthSelect.value);
      const selectedYear = parseInt(elExportYearSelect.value);

      const headers = ["Datum", "Termin", ...swimmers.filter(s => !s.is_deleted).map(s => `${s.first_name} ${s.last_name}`)];
      const rows = [];
      const days = daysInMonth(selectedYear, selectedMonth);

      for(let d=1; d<=days; d++){
        const date = new Date(selectedYear, selectedMonth, d);
        const dateStr = iso(date);
        
        const dailyTerms = getTermsForDate(date);
        dailyTerms.sort((a,b)=> a.start_time.localeCompare(b.start_time));
        
        dailyTerms.forEach(term => {
          const termLabel = `${DAY_SHORT_NAME[term.day]} ${term.start_time.slice(0,5)}-${term.end_time.slice(0,5)}`;
          const row = [dateStr, termLabel];
          
          swimmers.filter(s => !s.is_deleted).forEach(s => {
            const status = attendance[dateStr]?.[term.id]?.[s.id];
            if (status === true) {
              row.push("Prisoten");
            } else if (status === false) {
              row.push("Odsoten");
            } else {
              row.push("Ne");
            }
          });
          rows.push(row);
        });
      }

      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `prisotnost_${selectedYear}-${selectedMonth+1}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    elExportCsvBtn.addEventListener("click", exportCsv);
    

    // Začetno nalaganje podatkov
    loadData();

});