// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let attendance = {};
    let termStatus = {};

    const DAYNAME = ["", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];
    
    // ===== UI elementi =====
    const elMonthLabel = document.getElementById("monthLabel");
    const elCalendarGrid = document.getElementById("calendarGrid");
    const elPrev = document.getElementById("prevBtn");
    const elNext = document.getElementById("nextBtn");
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDesc = document.getElementById("newTermDesc");
    const elAddTermBtn = document.getElementById("addTermBtn");
    const elEditSwimmerModal = document.getElementById("editSwimmerModal");
    const elSwimmerPanel = document.getElementById("swimmerPanel");
    const elCurrentDateLabel = document.getElementById("currentDateLabel");
    const elCurrentTermLabel = document.getElementById("currentTermLabel");
    const elAttendanceTable = document.getElementById("attendanceTable");
    const elDeactivateBtn = document.getElementById("deactivateBtn");
    const elReactivateBtn = document = document.getElementById("reactivateBtn");
    const elDayModal = document.getElementById("dayModal");
    const elDayModalList = document.getElementById("dayModalList");
    const elAttendanceSummaryTable = document.getElementById("attendanceSummaryTable");
    const elCsvExportFrom = document.getElementById("csvExportFrom");
    const elCsvExportTo = document.getElementById("csvExportTo");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");

    let currentYear, currentMonth;
    let currentSelectedDate, currentSelectedTermId;

    // Supabase
    const SUPABASE_URL = "https://tizjimlwfkoniixbetgr.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MTgwNzI4NDI3OH0.52wK54vF8r_i8z2uU0cWw3oV92D0lqM5mHq03V778jA";
    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =======================================================
    //             ASINHRONO NALAGANJE PODATKOV
    // =======================================================

    async function loadData() {
        try {
            const { data: termsData, error: termsError } = await supabase.from('terms').select('*').order('day_of_week').order('start_time');
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
            console.error('Napaka pri nalaganju podatkov:', error.message);
        }
    }

    // =======================================================
    //             FUNKCIJE PRIKAZA
    // =======================================================

    function renderMonth() {
        const today = new Date();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        elMonthLabel.textContent = `${firstDayOfMonth.toLocaleString('sl-SI', { month: 'long', year: 'numeric' })}`;
        elCalendarGrid.innerHTML = '';

        let startingDay = firstDayOfMonth.getDay();
        if (startingDay === 0) startingDay = 7;

        for (let i = 1; i < startingDay; i++) {
            elCalendarGrid.innerHTML += `<div class="day disabled"></div>`;
        }

        for (let date = 1; date <= lastDayOfMonth.getDate(); date++) {
            const day = new Date(currentYear, currentMonth, date);
            const dateString = day.toISOString().split('T')[0];
            const dayOfWeek = day.getDay();
            const todayString = today.toISOString().split('T')[0];

            let dayHtml = `<div class="day" data-date="${dateString}">`;

            if (dateString === todayString) {
                dayHtml = `<div class="day today" data-date="${dateString}">`;
            }

            dayHtml += `<div class="num">${date}</div>`;

            const dailyTerms = TERMS.filter(term => term.day_of_week === (dayOfWeek === 0 ? 7 : dayOfWeek));
            const dailyTermStatuses = termStatus[dateString] || {};

            dailyTerms.forEach(term => {
                const termId = term.id;
                const status = dailyTermStatuses[termId] ? dailyTermStatuses[termId].status : null;
                const note = dailyTermStatuses[termId] ? dailyTermStatuses[termId].note : '';
                const isDisabled = status === 'deactivated';

                let eventClass = 'event';
                if (isDisabled) {
                    eventClass += ' disabled';
                }

                const isMobile = window.innerWidth <= 768;
                const timeContent = isMobile ? `${term.start_time.substring(0, 5)}` : `${term.start_time.substring(0, 5)} - ${term.end_time.substring(0, 5)}`;
                
                dayHtml += `
                <div class="${eventClass}" data-term-id="${termId}" data-date="${dateString}" data-note="${note || ''}">
                    <span class="time">${timeContent}</span>
                    <span class="muted">${term.description}</span>
                </div>`;
            });

            dayHtml += `</div>`;
            elCalendarGrid.innerHTML += dayHtml;
        }

        attachDayListeners();
    }
    
    function attachDayListeners() {
        document.querySelectorAll('.day').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                if (e.target.closest('.event')) {
                    const eventEl = e.target.closest('.event');
                    currentSelectedDate = eventEl.dataset.date;
                    currentSelectedTermId = eventEl.dataset.termId;
                    const termNote = eventEl.dataset.note;
                    const termStatus = eventEl.classList.contains('disabled') ? 'deactivated' : 'active';
                    
                    const term = TERMS.find(t => t.id == currentSelectedTermId);
                    if (!term) return;

                    elCurrentDateLabel.textContent = `${DAYNAME[new Date(currentSelectedDate).getDay() || 7]}, ${new Date(currentSelectedDate).toLocaleDateString('sl-SI')}`;
                    elCurrentTermLabel.textContent = `${term.start_time.substring(0, 5)} - ${term.end_time.substring(0, 5)} (${term.description})`;
                    
                    elDeactivateBtn.style.display = termStatus === 'active' ? 'block' : 'none';
                    elReactivateBtn.style.display = termStatus === 'deactivated' ? 'block' : 'none';
                    
                    refreshAttendanceTable();
                    elEditSwimmerModal.style.display = 'flex';
                } else {
                    const dateString = dayEl.dataset.date;
                    if (!dateString) return;
                    
                    const day = new Date(dateString);
                    const dayOfWeek = day.getDay() || 7;
                    const dailyTerms = TERMS.filter(term => term.day_of_week === dayOfWeek);
                    
                    elDayModal.querySelector('.modal-title').textContent = `Termini za ${day.toLocaleDateString('sl-SI')}`;
                    elDayModalList.innerHTML = '';
                    
                    if (dailyTerms.length === 0) {
                        elDayModalList.innerHTML = `<p class="muted">Na ta dan ni rednih terminov.</p>`;
                    } else {
                        dailyTerms.forEach(term => {
                            const termEl = document.createElement('div');
                            termEl.classList.add('term-item');
                            termEl.innerHTML = `
                                <div>
                                    <div class="term-item-label">${term.description}</div>
                                    <div class="term-item-dates">${term.start_time.substring(0, 5)} - ${term.end_time.substring(0, 5)}</div>
                                </div>
                            `;
                            elDayModalList.appendChild(termEl);
                        });
                    }
                    
                    elDayModal.style.display = 'flex';
                }
            });
        });
    }

    async function refreshAttendanceTable() {
        if (!currentSelectedDate || !currentSelectedTermId) return;

        const currentAttendance = attendance[currentSelectedDate] && attendance[currentSelectedDate][currentSelectedTermId] ? attendance[currentSelectedDate][currentSelectedTermId] : {};
        const term = TERMS.find(t => t.id == currentSelectedTermId);
        const isDeactivated = termStatus[currentSelectedDate] && termStatus[currentSelectedDate][currentSelectedTermId] && termStatus[currentSelectedDate][currentSelectedTermId].status === 'deactivated';
        
        const termSwimmers = swimmers.filter(s => s.term_id.includes(term.id));

        elAttendanceTable.innerHTML = '';

        const headerRow = `<tr><th>Plavalec</th><th>Status</th></tr>`;
        elAttendanceTable.innerHTML += headerRow;

        swimmers.sort((a, b) => a.last_name.localeCompare(b.last_name)).forEach(swimmer => {
            const status = currentAttendance[swimmer.id] || 'N';
            const isOriginalSwimmer = termSwimmers.some(s => s.id === swimmer.id);
            const isActiveSwimmer = swimmer.is_active;

            if (isActiveSwimmer) {
                const statusMap = { 'P': 'Prisoten', 'O': 'Odsoten', 'N': 'Ni opredeljeno', 'I': 'Opravičen', 'E': 'Naredil izpit', 'T': 'Trener', 'M': 'Menedžment', 'S': 'Nadomeščanje' };
                const statusColorMap = { 'P': 'ok', 'O': 'warn', 'N': 'neutral', 'I': 'neutral', 'E': 'neutral', 'T': 'neutral', 'M': 'neutral', 'S': 'neutral' };
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${swimmer.first_name} ${swimmer.last_name}</td>
                    <td class="status-cell" data-swimmer-id="${swimmer.id}">
                        <select class="btn ${isDeactivated ? 'disabled' : statusColorMap[status] || 'neutral'}" ${isDeactivated ? 'disabled' : ''}>
                            <option value="N" ${status === 'N' ? 'selected' : ''}>Ni opredeljeno</option>
                            <option value="P" ${status === 'P' ? 'selected' : ''}>Prisoten</option>
                            <option value="O" ${status === 'O' ? 'selected' : ''}>Odsoten</option>
                            <option value="I" ${status === 'I' ? 'selected' : ''}>Opravičen</option>
                            <option value="E" ${status === 'E' ? 'selected' : ''}>Naredil izpit</option>
                            <option value="T" ${status === 'T' ? 'selected' : ''}>Trener</option>
                            <option value="M" ${status === 'M' ? 'selected' : ''}>Menedžment</option>
                            <option value="S" ${status === 'S' ? 'selected' : ''}>Nadomeščanje</option>
                        </select>
                    </td>
                `;
                elAttendanceTable.appendChild(row);

                const selectEl = row.querySelector('select');
                selectEl.addEventListener('change', async (e) => {
                    let newStatus = e.target.value;
                    if (!isOriginalSwimmer && newStatus === 'P') {
                        newStatus = 'S';
                        e.target.value = 'S';
                    }
                    await updateAttendance(swimmer.id, newStatus);
                    e.target.classList.remove('ok', 'warn', 'neutral');
                    e.target.classList.add(statusColorMap[newStatus] || 'neutral');
                });
            }
        });
    }


    function refreshSwimmerPanel() {
        const today = new Date();
        const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());

        const swimmersSummary = swimmers.filter(s => s.is_active).map(swimmer => {
            let totalTrainings = 0;
            let totalPresent = 0;
            let totalMakeup = 0;
            let firstTraining = null;
            let lastTraining = null;

            for (const date in attendance) {
                const day = new Date(date);
                if (day < twoMonthsAgo) continue;

                for (const termId in attendance[date]) {
                    const status = attendance[date][termId][swimmer.id];
                    const term = TERMS.find(t => t.id == termId);
                    if (!term) continue;

                    const isOriginalSwimmer = swimmers.find(s => s.id === swimmer.id)?.term_id.includes(termId);
                    const isDeactivated = termStatus[date] && termStatus[date][termId] && termStatus[date][termId].status === 'deactivated';
                    
                    if (isDeactivated) continue;

                    if (isOriginalSwimmer) {
                        totalTrainings++;
                        if (status === 'P') {
                            totalPresent++;
                        }
                    } else if (status === 'S') {
                         totalMakeup++;
                    }

                    if (status === 'P' || status === 'I' || status === 'S' || status === 'O') {
                        if (!firstTraining || day < firstTraining) {
                            firstTraining = day;
                        }
                        if (!lastTraining || day > lastTraining) {
                            lastTraining = day;
                        }
                    }
                }
            }

            const attendancePercentage = totalTrainings > 0 ? ((totalPresent + totalMakeup) / totalTrainings * 100).toFixed(1) : 0;
            
            return {
                id: swimmer.id,
                name: `${swimmer.first_name} ${swimmer.last_name}`,
                attendancePercentage: attendancePercentage,
                totalTrainings: totalTrainings,
                totalPresent: totalPresent,
                totalMakeup: totalMakeup,
                firstTraining: firstTraining ? firstTraining.toLocaleDateString('sl-SI') : 'Ni podatka',
                lastTraining: lastTraining ? lastTraining.toLocaleDateString('sl-SI') : 'Ni podatka'
            };
        });

        swimmersSummary.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

        elAttendanceSummaryTable.innerHTML = `<tr><th>Ime in priimek</th><th>Prisotnost</th></tr>`;

        swimmersSummary.forEach(s => {
            const attendanceColor = s.attendancePercentage >= 90 ? 'ok' : s.attendancePercentage >= 70 ? 'pri' : 'warn';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${s.name}</td>
                <td class="${attendanceColor}">${s.attendancePercentage}% (${s.totalPresent} / ${s.totalTrainings} +${s.totalMakeup})</td>
            `;
            elAttendanceSummaryTable.appendChild(row);
        });
    }

    // =======================================================
    //             INTERAKCIJE IN GUMBI
    // =======================================================

    elPrev.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderMonth();
        refreshSwimmerPanel();
    });

    elNext.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderMonth();
        refreshSwimmerPanel();
    });

    elAddTermBtn.addEventListener('click', async () => {
        const firstName = elNewFirst.value.trim();
        const lastName = elNewLast.value.trim();
        const dayOfWeek = parseInt(elNewTermDay.value);
        const startTime = elNewTermStart.value;
        const endTime = elNewTermEnd.value;
        const description = elNewTermDesc.value.trim();

        if (firstName && lastName) {
            await addNewSwimmer(firstName, lastName);
        } else if (dayOfWeek && startTime && endTime && description) {
            await addNewTerm(dayOfWeek, startTime, endTime, description);
        } else {
            alert("Prosim, izpolnite vsa polja za dodajanje.");
        }
    });

    document.querySelectorAll('.modal .close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    elDeactivateBtn.addEventListener('click', () => {
        const note = prompt("Vnesite opombo za deaktivacijo:");
        if (note !== null) {
            deactivateTerm(currentSelectedDate, currentSelectedTermId, note);
        }
    });

    elReactivateBtn.addEventListener('click', () => {
        deactivateTerm(currentSelectedDate, currentSelectedTermId, null);
    });

    elExportCsvBtn.addEventListener('click', () => {
        const fromDate = elCsvExportFrom.value;
        const toDate = elCsvExportTo.value;
        exportAttendanceToCsv(fromDate, toDate);
    });

    // =======================================================
    //             SUPABASE FUNKCIJE
    // =======================================================

    async function addNewTerm(dayOfWeek, startTime, endTime, description) {
        const { data, error } = await supabase.from('terms').insert([{ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, description: description }]).select();
        if (error) {
            alert('Napaka pri dodajanju termina: ' + error.message);
        } else {
            TERMS.push(data[0]);
            renderMonth();
            alert('Termin uspešno dodan!');
        }
    }

    async function addNewSwimmer(firstName, lastName) {
        const { data, error } = await supabase.from('swimmers').insert([{ first_name: firstName, last_name: lastName }]).select();
        if (error) {
            alert('Napaka pri dodajanju plavalca: ' + error.message);
        } else {
            swimmers.push(data[0]);
            refreshSwimmerPanel();
            alert('Plavalec uspešno dodan!');
        }
    }

    async function updateAttendance(swimmerId, newStatus) {
        if (!attendance[currentSelectedDate]) {
            attendance[currentSelectedDate] = {};
        }
        if (!attendance[currentSelectedDate][currentSelectedTermId]) {
            attendance[currentSelectedDate][currentSelectedTermId] = {};
        }

        const { data, error } = await supabase.from('attendance').upsert([{
            date: currentSelectedDate,
            term_id: currentSelectedTermId,
            swimmer_id: swimmerId,
            status: newStatus
        }], { onConflict: ['date', 'term_id', 'swimmer_id'] }).select();

        if (error) {
            console.error('Napaka pri posodabljanju prisotnosti:', error.message);
            alert('Napaka pri posodabljanju prisotnosti.');
        } else {
            attendance[currentSelectedDate][currentSelectedTermId][swimmerId] = newStatus;
            refreshSwimmerPanel();
        }
    }

    async function deactivateTerm(date, termId, note) {
        let status = 'active';
        if (note !== null) {
            status = 'deactivated';
        }

        const { data, error } = await supabase.from('term_status').upsert([{
            date: date,
            term_id: termId,
            status: status,
            note: note
        }], { onConflict: ['date', 'term_id'] }).select();

        if (error) {
            console.error('Napaka pri posodabljanju statusa termina:', error.message);
            alert('Napaka pri posodabljanju statusa termina.');
        } else {
            if (!termStatus[date]) termStatus[date] = {};
            termStatus[date][termId] = { status: status, note: note };
            renderMonth();
            elEditSwimmerModal.style.display = 'none';
        }
    }

    // =======================================================
    //             OSTALE POMOŽNE FUNKCIJE
    // =======================================================

    function populateExportSelects() {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);

        function createOption(date) {
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = date.toLocaleDateString('sl-SI', { year: 'numeric', month: 'long', day: 'numeric' });
            return option;
        }

        let tempDate = new Date(start);
        while (tempDate <= end) {
            elCsvExportFrom.appendChild(createOption(tempDate));
            elCsvExportTo.appendChild(createOption(tempDate));
            tempDate.setDate(tempDate.getDate() + 1);
        }
    }

    function exportAttendanceToCsv(startDate, endDate) {
        const fromDate = new Date(startDate);
        const toDate = new Date(endDate);
        const csvRows = [];
        const swimmerIds = swimmers.filter(s => s.is_active).map(s => s.id);
        const swimmerMap = swimmers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

        const headerRow = ['Datum', 'Dan', 'Termin', ...swimmers.filter(s => s.is_active).map(s => `${s.first_name} ${s.last_name}`)];
        csvRows.push(headerRow.join(';'));

        const dates = Object.keys(attendance).sort();
        dates.forEach(date => {
            const day = new Date(date);
            if (day >= fromDate && day <= toDate) {
                const dailyTerms = Object.keys(attendance[date]).sort();
                dailyTerms.forEach(termId => {
                    const term = TERMS.find(t => t.id == termId);
                    if (term) {
                        const row = [date, DAYNAME[day.getDay() || 7], `${term.start_time.substring(0, 5)} - ${term.end_time.substring(0, 5)} (${term.description})`];
                        swimmerIds.forEach(swimmerId => {
                            const status = attendance[date][termId][swimmerId] || 'N';
                            row.push(status);
                        });
                        csvRows.push(row.join(';'));
                    }
                });
            }
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `prisotnost_${startDate}_do_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =======================================================
    //             ZAGON APLIKACIJE
    // =======================================================

    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    loadData();

});