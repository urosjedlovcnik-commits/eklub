// 🗓️ Trainer Calendar - Prikaz koledarja glede na vlogo trenerja

class TrainerCalendar {
    constructor(trainerSession) {
        this.session = trainerSession;
        this.supabase = createAuthSupabaseClient();
        this.terms = [];
        this.swimmers = [];
        this.attendance = {};
    }

    // Naloži podatke
    async loadData() {
        try {
            // 🧪 DEMO MODE - uporabi simulirane podatke
            const demoMode = false; // Spremenite na true za demo, false za realne podatke
            
            if (demoMode) {
                this.loadDemoData();
                return;
            }
            
            // Naloži termine (glede na dovoljenja)
            if (this.session.permissions.canViewAllTrainings) {
                // Admin vloge - vsi termini
                const { data: allTerms, error: termsError } = await this.supabase
                    .from('terms')
                    .select('*')
                    .order('day', { ascending: true })
                    .order('start_time', { ascending: true });
                    
                if (termsError) throw termsError;
                this.terms = allTerms || [];
            } else {
                // Osnovni trener - samo svoje termine
                // Zaenkrat prikaži vse termine, ker trainer_terms tabela morda ne obstaja
                const { data: allTerms, error: termsError } = await this.supabase
                    .from('terms')
                    .select('*')
                    .order('day', { ascending: true })
                    .order('start_time', { ascending: true });
                    
                if (termsError) throw termsError;
                this.terms = allTerms || [];
            }

            // Naloži plavalce
            const { data: swimmers, error: swimmersError } = await this.supabase
                .from('swimmers')
                .select('*');
                
            if (swimmersError) throw swimmersError;
            this.swimmers = swimmers || [];

            // Naloži prisotnost za trenutni mesec
            await this.loadAttendanceForMonth(new Date());

            debugLog('Podatki naloženi', {
                terms: this.terms.length,
                swimmers: this.swimmers.length,
                permissions: this.session.permissions.level
            });

        } catch (error) {
            debugLog('Napaka pri nalaganju podatkov', error);
            throw error;
        }
    }

    // 🧪 Demo podatki za testiranje
    loadDemoData() {
        // Simulirani termini
        const allDemoTerms = [
            {
                id: 'pon-18:00-19:00',
                day: 1, // Ponedeljek
                start_time: '18:00:00',
                end_time: '19:00:00',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                type: 'swimming'
            },
            {
                id: 'pon-19:00-20:00',
                day: 1,
                start_time: '19:00:00',
                end_time: '20:00:00',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                type: 'swimming'
            },
            {
                id: 'sre-18:00-19:00',
                day: 3, // Sreda
                start_time: '18:00:00',
                end_time: '19:00:00',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                type: 'swimming'
            },
            {
                id: 'čet-20:00-21:00',
                day: 4, // Četrtek
                start_time: '20:00:00',
                end_time: '21:00:00',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                type: 'swimming'
            },
            {
                id: 'pet-17:00-18:00',
                day: 5, // Petek
                start_time: '17:00:00',
                end_time: '18:00:00',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                type: 'swimming'
            }
        ];

        // Filtriraj termine glede na vlogo
        if (this.session.permissions.canViewAllTrainings) {
            // Trainer admin vidi vse termine
            this.terms = allDemoTerms;
        } else {
            // Osnovni trener vidi samo svoje termine (simuliraj dodelitve)
            const ownTermIds = ['sre-18:00-19:00', 'pet-17:00-18:00']; // Primer dodelitve
            this.terms = allDemoTerms.filter(term => ownTermIds.includes(term.id));
        }

        // Simulirani plavalci
        this.swimmers = [
            { id: 1, first_name: 'Ana', last_name: 'Novak', terms: ['pon-18:00-19:00', 'sre-18:00-19:00'] },
            { id: 2, first_name: 'Marko', last_name: 'Kovač', terms: ['pon-19:00-20:00', 'čet-20:00-21:00'] },
            { id: 3, first_name: 'Sara', last_name: 'Zupan', terms: ['sre-18:00-19:00', 'pet-17:00-18:00'] }
        ];

        // Simuliraj prisotnost za danes
        const today = this.formatDateISO(new Date());
        this.attendance[today] = {
            'sre-18:00-19:00': {
                1: true, // Ana prisotna
                3: true  // Sara prisotna
            },
            'pet-17:00-18:00': {
                3: false // Sara odsotna
            }
        };

        debugLog('Demo podatki naloženi', {
            terms: this.terms.length,
            swimmers: this.swimmers.length,
            permissions: this.session.permissions.level
        });
    }

    // Naloži prisotnost za mesec
    async loadAttendanceForMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        try {
            const { data: attendanceData, error } = await this.supabase
                .from('attendance')
                .select('*')
                .gte('date', this.formatDateISO(monthStart))
                .lte('date', this.formatDateISO(monthEnd));

            if (error) throw error;

            this.attendance = {};
            attendanceData?.forEach(row => {
                if (!this.attendance[row.date]) this.attendance[row.date] = {};
                if (!this.attendance[row.date][row.term_id]) this.attendance[row.date][row.term_id] = {};
                this.attendance[row.date][row.term_id][row.swimmer_id] = row.status;
            });

        } catch (error) {
            debugLog('Napaka pri nalaganju prisotnosti', error);
        }
    }

    // Renderaj koledar za mesec
    async renderMonth(date, showAllTerms = false) {
        await this.loadData();

        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        const startDayOfWeek = firstDay.getDay();
        
        // Nastavi začetek na ponedeljek
        startDate.setDate(startDate.getDate() - (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1));

        const calendarContainer = document.getElementById('calendarDays');
        calendarContainer.innerHTML = '';

        // Generiraj 6 tednov (42 dni)
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = this.createDayElement(currentDate, month, showAllTerms);
            calendarContainer.appendChild(dayElement);
        }
    }

    // Ustvari element dneva
    createDayElement(date, currentMonth, showAllTerms) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        // Označi dneve drugih mesecev
        if (date.getMonth() !== currentMonth) {
            dayDiv.classList.add('other-month');
        }
        
        // Označi danes
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        // Številka dneva
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayDiv.appendChild(dayNumber);

        // Kontejner za dogodke
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';
        
        // Pridobi termine za ta dan
        const dayTerms = this.getTermsForDate(date, showAllTerms);
        
        dayTerms.forEach(term => {
            const eventElement = this.createEventElement(term, date, showAllTerms);
            eventsContainer.appendChild(eventElement);
        });

        dayDiv.appendChild(eventsContainer);
        return dayDiv;
    }

    // Pridobi termine za datum
    getTermsForDate(date, showAllTerms) {
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
        const isoDate = this.formatDateISO(date);
        
        let relevantTerms = this.terms.filter(term => 
            term.day === dayOfWeek && 
            isoDate >= term.date_from && 
            isoDate <= term.date_to
        );

        // Filtriraj glede na način prikaza
        if (!showAllTerms && !this.session.permissions.canViewAllTrainings) {
            // Osnovni trener - samo svoje termine
            const ownTermIds = new Set();
            
            // Dodaj redno dodeljene termine
            // (že filtriran v loadData() funkciji)
            
            // Dodaj nadomeščanja
            // TODO: Implementiraj nadomeščanja iz substitute_trainers tabele
            
            relevantTerms = relevantTerms; // Že filtrirano v loadData()
        }

        return relevantTerms.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    // Ustvari element dogodka
    createEventElement(term, date, showAllTerms) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event';
        
        // Določi tip dogodka
        if (this.isOwnTerm(term.id)) {
            eventDiv.classList.add('event-own');
        } else {
            eventDiv.classList.add('event-all');
        }

        // Vsebina dogodka
        const timeText = `${term.start_time.slice(0, 5)}-${term.end_time.slice(0, 5)}`;
        eventDiv.innerHTML = `
            <div style="font-weight: 600;">${timeText}</div>
            <div style="font-size: 10px; opacity: 0.8;">${this.getTermSummary(term, date)}</div>
        `;

        // Klik na dogodek
        eventDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTermDetails(term, date);
        });

        return eventDiv;
    }

    // Preveri, če je termin trenerjev
    isOwnTerm(termId) {
        if (this.session.permissions.canViewAllTrainings) {
            // Admin vloge - preverimo preko trainer_terms
            // Za poenostavitev vrnemo true za vse (lahko izboljšamo)
            return false; // Vsi termini so označeni kot "drugi"
        } else {
            // Osnovni trener - vsi prikazani termini so njegovi
            return true;
        }
    }

    // Pridobi povzetek termina
    getTermSummary(term, date) {
        const isoDate = this.formatDateISO(date);
        const termAttendance = this.attendance[isoDate]?.[term.id] || {};
        
        // Preštej plavalce, ki so dodeljeni temu terminu
        const assignedSwimmers = this.swimmers.filter(s => 
            s.terms && s.terms.includes(term.id) && !s.is_deleted
        );
        
        const totalSwimmers = assignedSwimmers.length;
        const presentCount = Object.values(termAttendance).filter(status => status === true).length;
        
        if (totalSwimmers === 0) {
            return 'Ni plavalcev';
        }
        
        if (presentCount === 0) {
            return `${totalSwimmers} plavalcev`;
        }
        
        return `${presentCount}/${totalSwimmers}`;
    }

    // Odpri podrobnosti termina
    openTermDetails(term, date) {
        // Preusmeritev na glavni sistem z datumom
        const isoDate = this.formatDateISO(date);
        const url = `../index.html?date=${isoDate}&term=${term.id}`;
        window.open(url, '_blank');
    }

    // Formatiranje datuma
    formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Dodaj nadomeščanja (implementiraj kasneje)
    async getSubstitutions(date) {
        try {
            const isoDate = this.formatDateISO(date);
            
            const { data: substitutions, error } = await this.supabase
                .from('substitute_trainers')
                .select(`
                    *,
                    terms (*)
                `)
                .eq('substitute_trainer_id', this.session.trainer.id)
                .eq('substitute_date', isoDate);
                
            if (error) throw error;
            return substitutions || [];
            
        } catch (error) {
            debugLog('Napaka pri pridobivanju nadomeščanj', error);
            return [];
        }
    }
}

// Izvozi za uporabo
window.TrainerCalendar = TrainerCalendar;
