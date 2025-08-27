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
    const elAttendanceTable = document.getElementById("attendanceTable");
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
      elSaveNotesBtn.textContent = "Shrani zapisek";
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
      elCancelNoteBtn.onclick = () => {
        closeModal(elNoteModal);
      };
      elCloseNoteModalBtn.onclick = () => {
        closeModal(elNoteModal);
      };
      elNoteModal.addEventListener("click", (e) => {
        if (e.target === elNoteModal) {
          closeModal(elNoteModal);
        }
      });
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
      const today = new Date(); today.setHours(0,0,0,0);
      
      swimmers.forEach(s => {
        res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
      });

      const allAttendance = Object.entries(attendance);
      for (const [date, termData] of allAttendance) {
        const d = new Date(date); d.setHours(0,0,0,0);
        if (d >= monthStart && d <= monthEnd) {
          for (const termId in termData) {
            if (isInactive(d, termId)) continue;
            for (const swimmerId in termData[termId]) {
              if (termData[termId][swimmerId] === true && res[swimmerId]) {
                res[swimmerId].att++;
              }
            }
          }
        }
      }

      for (const [date, termData] of allAttendance) {
        const d = new Date(date); d.setHours(0,0,0,0);
        if (d >= monthStart && d <= monthEnd) {
          for (const termId in termData) {
            if (isInactive(d, termId)) continue;
            const term = termById(termId);
            if (!term) continue;

            const assignedToTerm = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
            for (const s of assignedToTerm) {
              if(res[s.id]) {
                res[s.id].pos++;
              }
            }
          }
        }
      }

      return res;
    }

    function renderSummary(data) {
      elSummaryBox.innerHTML = "";
      if (Object.keys(data).length === 0) {
        elSummaryBox.innerHTML = "<p class='muted'>Ni plavalcev za prikaz.</p>";
        return;
      }
      
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      thead.innerHTML = "<tr><th>Plavalec</th><th>Prisotnost</th><th>Procent</th></tr>";
      
      Object.values(data).sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first)).forEach(s => {
        const tr = document.createElement("tr");
        const percentage = s.pos > 0 ? (s.att / s.pos * 100).toFixed(0) : 0;
        let pClass = "unfilled";
        if (percentage > 90) pClass = "ok";
        else if (percentage > 50) pClass = "partial";
        
        tr.innerHTML = `<td>${s.first} ${s.last}</td><td>${s.att} / ${s.pos}</td><td><span class="${pClass}">${percentage}%</span></td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      elSummaryBox.appendChild(table);
    }
    
    elPrev.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonth(); });
    elNext.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonth(); });
    
    // ===== Urejanje plavalcev =====
    function refreshSwimmerPanel(){
      elSwimmerSelect.innerHTML = "";
      elSwimmerInfo.innerHTML = "";
      const opt = document.createElement("option"); opt.textContent = "Izberi plavalca..."; opt.disabled=true; opt.selected=true; elSwimmerSelect.appendChild(opt);

      swimmers.filter(s=>!s.is_deleted).sort((a,b)=>(a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
        const opt = document.createElement("option"); opt.value=s.id; opt.textContent = `${s.first_name} ${s.last_name}`; elSwimmerSelect.appendChild(opt);
      });
    }

    elAddSwimmerBtn.addEventListener("click", async ()=>{
      const first=elNewFirst.value.trim(), last=elNewLast.value.trim();
      if(!first || !last){ alert("Prosim, vnesite ime in priimek."); return; }
      const { data, error } = await supabase.from('swimmers').insert([{ first_name:first, last_name:last, is_deleted: false, terms: [] }]).select();
      if(error){ console.error('Napaka pri dodajanju plavalca:', error); alert("Napaka pri dodajanju. Preverite konzolo."); return; }
      swimmers.push(data[0]);
      elNewFirst.value=""; elNewLast.value="";
      refreshSwimmerPanel();
      renderMonth();
    });

    elSwimmerSelect.addEventListener("change", (e)=>{
      const s = swimmers.find(s=>s.id === e.target.value);
      if(!s) return;
      elSwimmerInfo.innerHTML = `
        <div class="form-group">
          <p><strong>Ime:</strong> ${s.first_name}</p>
          <p><strong>Priimek:</strong> ${s.last_name}</p>
          <p><strong>Dodeljeni termini:</strong></p>
          <ul id="assignedTermsList"></ul>
        </div>
      `;
      const assignedList = document.getElementById("assignedTermsList");
      const unassignedTerms = TERMS.filter(t=>!s.terms.includes(t.id)).sort((a,b)=>a.label.localeCompare(b.label));

      if (unassignedTerms.length > 0) {
        elTermSelect.innerHTML = "";
        const opt = document.createElement("option"); opt.textContent = "Dodaj termin..."; opt.disabled=true; opt.selected=true; elTermSelect.appendChild(opt);
        unassignedTerms.forEach(t => {
          const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.label; elTermSelect.appendChild(opt);
        });
        elTermSelect.style.display = "block";
        elAssignTermBtn.style.display = "block";
      } else {
        elTermSelect.style.display = "none";
        elAssignTermBtn.style.display = "none";
      }
      
      elDeleteSwimmerBtn.style.display = "block";
      elDeleteSwimmerBtn.dataset.swimmerId = s.id;
      
      renderAssignedTerms(s);
    });

    function renderAssignedTerms(swimmer){
      const list = document.getElementById("assignedTermsList");
      list.innerHTML = "";
      swimmer.terms.sort((a,b)=> a.localeCompare(b)).forEach(termId=>{
        const term = termById(termId);
        if(!term) return;
        const li = document.createElement("li");
        li.innerHTML = `${term.label} <button class="btn remove-btn" data-term-id="${termId}" data-swimmer-id="${swimmer.id}">✖</button>`;
        list.appendChild(li);
      });
      document.querySelectorAll("#assignedTermsList .remove-btn").forEach(btn=>{
        btn.addEventListener("click", removeTermFromSwimmer);
      });
    }

    elAssignTermBtn.addEventListener("click", async ()=>{
      const swimmerId = elSwimmerSelect.value;
      const termId = elTermSelect.value;
      if(!swimmerId || !termId) return;
      const s = swimmers.find(s=>s.id===swimmerId);
      if(!s) return;
      const newTerms = [...s.terms, termId];
      const { error } = await supabase.from('swimmers').update({ terms: newTerms }).eq('id', swimmerId);
      if(error){ console.error('Napaka pri dodeljevanju termina:', error); }
      s.terms = newTerms;
      refreshSwimmerPanel();
      elSwimmerSelect.value = swimmerId;
      elSwimmerSelect.dispatchEvent(new Event('change'));
      renderMonth();
    });

    elDeleteSwimmerBtn.addEventListener("click", async (e)=>{
      const swimmerId = e.target.dataset.swimmerId;
      if(!confirm("Ste prepričani, da želite izbrisati tega plavalca?")){ return; }
      const { error } = await supabase.from('swimmers').update({ is_deleted: true }).eq('id', swimmerId);
      if(error){ console.error('Napaka pri brisanju plavalca:', error); alert("Napaka pri brisanju. Preverite konzolo."); return; }
      swimmers = swimmers.filter(s=>s.id!==swimmerId);
      refreshSwimmerPanel();
      renderMonth();
    });

    async function removeTermFromSwimmer(e){
      const swimmerId = e.target.dataset.swimmerId;
      const termId = e.target.dataset.termId;
      const s = swimmers.find(s=>s.id===swimmerId);
      if(!s) return;
      s.terms = s.terms.filter(t => t !== termId);
      const { error } = await supabase.from('swimmers').update({ terms: s.terms }).eq('id', swimmerId);
      if(error){ console.error('Napaka pri odstranjevanju termina:', error); }
      refreshSwimmerPanel();
      elSwimmerSelect.value = swimmerId;
      elSwimmerSelect.dispatchEvent(new Event('change'));
      renderMonth();
    }

    // ===== Uvoz in izvoz =====
    elCsvInput.addEventListener("change", async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const rows = text.split("\n").map(r=>r.trim()).filter(Boolean);
      const header = rows[0].split(',').map(h=>h.trim());
      const data = rows.slice(1).map(r=>{
        const values=r.split(',').map(v=>v.trim());
        return header.reduce((acc,h,i)=>{acc[h]=values[i] || ""; return acc;}, {});
      });

      const newSwimmers = data.map(d=>{
        const terms = d.terms ? d.terms.split(',').map(t=>t.trim()).filter(Boolean) : [];
        return { first_name: d.first_name, last_name: d.last_name, terms, is_deleted: false };
      });
      
      const today = iso(new Date());

      try {
        await supabase.from('swimmers').delete().not('id', 'is.null');
        await supabase.from('swimmers').insert(newSwimmers);
        await supabase.from('attendance').delete().gte('date', today);
        
        await fetchAllData();
        alert("Plavalci uspešno uvoženi.");
      } catch (error) {
        console.error("Napaka pri uvozu plavalcev:", error);
        alert("Napaka pri uvozu. Preverite konzolo.");
      }
    });

    elCsvTermsInput.addEventListener("change", async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const rows = text.split("\n").map(r=>r.trim()).filter(Boolean);
      const header = rows[0].split(',').map(h=>h.trim());
      const data = rows.slice(1).map(r=>{
        const values=r.split(',').map(v=>v.trim());
        return header.reduce((acc,h,i)=>{acc[h]=values[i] || ""; a}, {});
      });

      const newTerms = data.map(d=>{
        const dateFrom = parseDate(d.date_from);
        const dateTo = parseDate(d.date_to);
        const day = parseInt(d.day);
        
        if(!dateFrom || !dateTo || isNaN(day)) {
          console.error(`Napaka pri razčlenjevanju vrstice: ${d.id}`);
          return null;
        }
        
        return {
          id: d.id,
          label: d.label || d.id,
          day,
          start_time: d.start_time,
          end_time: d.end_time,
          date_from: dateFrom,
          date_to: dateTo
        };
      }).filter(Boolean);

      try {
        await supabase.from('terms').delete().not('id', 'is.null');
        await supabase.from('terms').insert(newTerms);
        await fetchAllData();
        alert("Termini uspešno uvoženi.");
      } catch(error) {
        console.error("Napaka pri uvozu terminov:", error);
        alert("Napaka pri uvozu terminov. Preverite konzolo.");
      }
    });
    
    function populateExportSelects() {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      elExportMonthSelect.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        const option = document.createElement("option");
        option.value = i;
        option.textContent = date.toLocaleDateString("sl-SI", { month: "long" });
        if (i === currentMonth) {
          option.selected = true;
        }
        elExportMonthSelect.appendChild(option);
      }

      elExportYearSelect.innerHTML = "";
      const startYear = 2024;
      for (let i = startYear; i <= currentYear + 1; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        if (i === currentYear) {
          option.selected = true;
        }
        elExportYearSelect.appendChild(option);
      }
    }

    elExportCsvBtn.addEventListener("click", async () => {
      const year = elExportYearSelect.value;
      const month = elExportMonthSelect.value;
      const monthIndex = parseInt(month, 10);
      
      const summaryData = calculateSummaryData(year, monthIndex);
      
      const header = ["Ime", "Priimek", "Prisotnost", "Procent Prisotnosti"];
      const csvContent = "data:text/csv;charset=utf-8," 
                         + header.join(",") + "\n"
                         + Object.values(summaryData).map(s => {
                           const percentage = s.pos > 0 ? (s.att / s.pos * 100).toFixed(0) : 0;
                           return `${s.first},${s.last},${s.att}/${s.pos},"${percentage}%"`;
                         }).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `povzetek_prisotnosti_${year}-${monthIndex + 1}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // ===== Upravljanje terminov =====
    elAddTermBtn.addEventListener("click", async ()=>{
      const id = elNewTermDay.value + "-" + elNewTermStart.value.replace(':','-') + "-" + elNewTermEnd.value.replace(':','-');
      const day = elNewTermDay.value;
      const start = elNewTermStart.value;
      const end = elNewTermEnd.value;
      const dateFrom = parseDate(elNewTermDateFrom.value);
      const dateTo = parseDate(elNewTermDateTo.value);

      if(!id || !day || !start || !end || !dateFrom || !dateTo) {
        alert("Prosim, izpolnite vsa polja za termin.");
        return;
      }
      
      const newTerm = { id, day: DAY_SHORT_MAP[day.toLowerCase()], start_time: start, end_time: end, date_from: dateFrom, date_to: dateTo, label: `${DAY_SHORT_NAME[DAY_SHORT_MAP[day.toLowerCase()]]} ${start}-${end}`};
      
      try {
        const { error } = await supabase.from('terms').insert([newTerm]);
        if(error) throw error;
        TERMS.push(newTerm);
        renderTermList();
        elNewTermDateFrom.value=""; elNewTermDateTo.value="";
        alert("Termin uspešno dodan.");
      } catch (error) {
        console.error("Napaka pri dodajanju termina:", error);
        alert("Napaka pri dodajanju termina. Preverite konzolo.");
      }
    });

    function renderTermList(){
      elTermList.innerHTML = "";
      TERMS.sort((a,b)=>a.label.localeCompare(b.label)).forEach(t=>{
        const li=document.createElement("li");
        li.innerHTML = `
          ${t.label} (od: ${formatDate(t.date_from)}, do: ${formatDate(t.date_to)})
          <button class="btn neutral edit-btn" data-term-id="${t.id}">Uredi</button>
          <button class="btn remove-btn delete-btn" data-term-id="${t.id}">✖</button>
        `;
        elTermList.appendChild(li);
      });
      // Event delegation, da ne dodajamo poslušalcev vsakič znova
      // Popravljeno za bolj robustno delovanje v vseh brskalnikih
      document.querySelectorAll("#termList .edit-btn").forEach(btn=>{
        btn.addEventListener("click", openEditTermModal);
      });
    }
    
    // Dodan poslušalec na starševski element, ki posluša vse klike
    elTermList.addEventListener("click", async (e) => {
        const deleteButton = e.target.closest(".delete-btn");
        if (deleteButton) {
            const termId = deleteButton.dataset.termId;
            if(!confirm("Ste prepričani, da želite izbrisati ta termin? Plavalci bodo izključeni iz termina.")){ return; }
      
            try {
                const { error: attError } = await supabase.from('attendance').delete().eq('term_id', termId);
                if(attError) throw attError;
                
                const { data: termStatusData, error: tsError } = await supabase.from('term_status').delete().eq('term_id', termId);
                if(tsError) throw tsError;
                
                const { data: swimmerData, error: swError } = await supabase.from('swimmers').select('*').contains('terms', [termId]);
                if(swError) throw swError;

                const updates = swimmerData.map(s => {
                    s.terms = s.terms.filter(t => t !== termId);
                    return { id: s.id, terms: s.terms };
                });

                if (updates.length > 0) {
                    const { error: updateError } = await supabase.from('swimmers').upsert(updates);
                    if(updateError) throw updateError;
                }

                const { error } = await supabase.from('terms').delete().eq('id', termId);
                if(error) throw error;
                
                await fetchAllData();
                alert("Termin uspešno izbrisan.");
            } catch(error) {
                console.error("Napaka pri brisanju termina:", error);
                alert("Napaka pri brisanju termina. Preverite konzolo.");
            }
        }
    });

    let editTermCtx = null;
    function openEditTermModal(e){
      const termId = e.target.dataset.termId;
      const term = termById(termId);
      if(!term) return;
      editTermCtx = term;
      elEditTermModalTitle.textContent = `Uredi termin: ${term.label}`;
      elEditTermDateFrom.value = formatDate(term.date_from);
      elEditTermDateTo.value = formatDate(term.date_to);
      openModal(elEditTermModal);
    }
    
    elCloseEditTermModalBtn.addEventListener("click", ()=>{ closeModal(elEditTermModal); });
    elEditTermModal.addEventListener("click", (e)=>{ if(e.target === elEditTermModal) closeModal(elEditTermModal); });
    
    elSaveEditTermBtn.addEventListener("click", async ()=>{
      if(!editTermCtx) return;
      const dateFrom = parseDate(elEditTermDateFrom.value);
      const dateTo = parseDate(elEditTermDateTo.value);
      if(!dateFrom || !dateTo){ alert("Neveljaven format datuma."); return; }
      
      const { error } = await supabase
        .from('terms')
        .update({ date_from: dateFrom, date_to: dateTo })
        .eq('id', editTermCtx.id);
        
      if(error){
        console.error('Napaka pri shranjevanju sprememb termina:', error);
        alert("Napaka pri shranjevanju. Preverite konzolo.");
        return;
      }
      
      editTermCtx.date_from = dateFrom;
      editTermCtx.date_to = dateTo;
      
      closeModal(elEditTermModal);
      await fetchAllData();
      alert("Spremembe shranjene.");
    });


    // ===== Inicijalizacija =====
    async function fetchAllData() {
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
        renderTermList();
        renderMonth();

      } catch (error) {
        console.error('Napaka pri nalaganju podatkov:', error);
      }
    }
    
    const SUPABASE_URL = "https://tizjimlwfkoniixbetgr.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MD...
    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    fetchAllData();
    
    // Ob pravilni naložitvi stran, spremenimo nastavitve za SUPABASE, da je dostopen izven naloženih funkcij
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    window.supabase = supabase;
});