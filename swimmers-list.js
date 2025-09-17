// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {
    
    // Uporabi centralizirano konfiguracijo
    const supabase = createSupabaseClient();
    if (!supabase) {
        document.getElementById('swimmersList').innerHTML = '<div class="error">Napaka: Ne morem vzpostaviti povezave z bazo podatkov.</div>';
        return;
    }
    
    // Stanja bodo naložena asinhrono
    let swimmers = [];
    let terms = [];
    let filteredSwimmers = [];
    
    // UI elementi
    const elSwimmersList = document.getElementById('swimmersList');
    const elSearchInput = document.getElementById('searchInput');
    const elTotalSwimmers = document.getElementById('totalSwimmers');
    const elActiveSwimmers = document.getElementById('activeSwimmers');
    const elTotalTerms = document.getElementById('totalTerms');
    
    // Dnevi v tednu
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];
    
    // ===== Pomožne funkcije =====
    
    function formatTermTime(term) {
        return `${DAY_SHORT_NAME[term.day]} ${term.start_time.slice(0, 5)}–${term.end_time.slice(0, 5)}`;
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-').map(Number);
        return `${String(d).padStart(2, '0')} / ${String(m).padStart(2, '0')} / ${y}`;
    }
    
    function isTermActive(term) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        return term.date_to >= todayStr;
    }
    
    // ===== Nalaganje podatkov =====
    
    async function loadSwimmers() {
        try {
            const { data, error } = await supabase
                .from('swimmers')
                .select('*')
                .eq('is_deleted', false)
                .order('last_name', { ascending: true })
                .order('first_name', { ascending: true });
            
            if (error) {
                console.error('Napaka pri nalaganju plavalcev:', error);
                throw error;
            }
            
            swimmers = data || [];
            filteredSwimmers = [...swimmers];
            updateStatistics();
            renderSwimmers();
        } catch (error) {
            console.error('Napaka pri nalaganju plavalcev:', error);
            elSwimmersList.innerHTML = '<div class="error">Napaka pri nalaganju plavalcev. Preverite internetno povezavo.</div>';
        }
    }
    
    async function loadTerms() {
        try {
            const { data, error } = await supabase
                .from('terms')
                .select('*')
                .order('day', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (error) {
                console.error('Napaka pri nalaganju terminov:', error);
                throw error;
            }
            
            terms = data || [];
            updateStatistics();
        } catch (error) {
            console.error('Napaka pri nalaganju terminov:', error);
        }
    }
    
    // ===== Statistike =====
    
    function updateStatistics() {
        const totalSwimmers = swimmers.length;
        const activeSwimmers = swimmers.filter(s => s.terms && s.terms.length > 0).length;
        const totalTerms = terms.filter(t => isTermActive(t)).length;
        
        elTotalSwimmers.textContent = totalSwimmers;
        elActiveSwimmers.textContent = activeSwimmers;
        elTotalTerms.textContent = totalTerms;
    }
    
    // ===== Prikaz plavalcev =====
    
    function renderSwimmers() {
        if (filteredSwimmers.length === 0) {
            elSwimmersList.innerHTML = '<div class="no-terms">Ni plavalcev, ki ustrezajo iskalnemu kriteriju.</div>';
            return;
        }
        
        let html = '';
        
        filteredSwimmers.forEach(swimmer => {
            const assignedTerms = swimmer.terms || [];
            const activeTerms = assignedTerms
                .map(termId => terms.find(t => t.id === termId))
                .filter(term => term && isTermActive(term))
                .sort((a, b) => {
                    if (a.day !== b.day) return a.day - b.day;
                    return a.start_time.localeCompare(b.start_time);
                });
            
            const inactiveTerms = assignedTerms
                .map(termId => terms.find(t => t.id === termId))
                .filter(term => term && !isTermActive(term))
                .sort((a, b) => {
                    if (a.day !== b.day) return a.day - b.day;
                    return a.start_time.localeCompare(b.start_time);
                });
            
            html += `
                <div class="swimmer-card">
                    <div class="swimmer-header">
                        <div>
                            <h3 class="swimmer-name">${swimmer.first_name} ${swimmer.last_name}</h3>
                            ${swimmer.email ? `<div class="swimmer-contact">📧 ${swimmer.email}</div>` : ''}
                            ${swimmer.phone ? `<div class="swimmer-contact">📞 ${swimmer.phone}</div>` : ''}
                        </div>
                        <div class="swimmer-contact">
                            ${assignedTerms.length} termin${assignedTerms.length === 1 ? '' : assignedTerms.length === 2 ? 'a' : 'ov'}
                        </div>
                    </div>
                    
                    ${activeTerms.length > 0 ? `
                        <div class="terms-section">
                            <div class="terms-title">Aktivni termini:</div>
                            <div class="terms-grid">
                                ${activeTerms.map(term => `
                                    <div class="term-chip">
                                        ${formatTermTime(term)}
                                        <br>
                                        <small style="color: #6b7280;">${formatDate(term.date_from)} - ${formatDate(term.date_to)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${inactiveTerms.length > 0 ? `
                        <div class="terms-section">
                            <div class="terms-title" style="color: #9ca3af;">Zaključeni termini:</div>
                            <div class="terms-grid">
                                ${inactiveTerms.map(term => `
                                    <div class="term-chip" style="background: #f9fafb; color: #9ca3af; border-color: #e5e7eb;">
                                        ${formatTermTime(term)}
                                        <br>
                                        <small style="color: #9ca3af;">${formatDate(term.date_from)} - ${formatDate(term.date_to)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${assignedTerms.length === 0 ? `
                        <div class="terms-section">
                            <div class="no-terms">
                                Ni dodeljenih terminov
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        elSwimmersList.innerHTML = html;
    }
    
    // ===== Iskanje =====
    
    function filterSwimmers(searchTerm) {
        if (!searchTerm.trim()) {
            filteredSwimmers = [...swimmers];
        } else {
            const term = searchTerm.toLowerCase();
            filteredSwimmers = swimmers.filter(swimmer => 
                swimmer.first_name.toLowerCase().includes(term) ||
                swimmer.last_name.toLowerCase().includes(term) ||
                (swimmer.email && swimmer.email.toLowerCase().includes(term)) ||
                (swimmer.phone && swimmer.phone.includes(term))
            );
        }
        
        renderSwimmers();
    }
    
    // ===== Event listenerji =====
    
    elSearchInput.addEventListener('input', (e) => {
        filterSwimmers(e.target.value);
    });
    
    // ===== Inicializacija =====
    
    async function init() {
        elSwimmersList.innerHTML = '<div class="loading">Nalaganje podatkov...</div>';
        
        try {
            await Promise.all([loadSwimmers(), loadTerms()]);
        } catch (error) {
            console.error('Napaka pri inicializaciji:', error);
            elSwimmersList.innerHTML = '<div class="error">Napaka pri nalaganju podatkov. Preverite internetno povezavo.</div>';
        }
    }
    
    init();
});
