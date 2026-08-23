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
    let seasons = [];
    let filteredSwimmers = [];
    
    // UI elementi
    const elSwimmersList = document.getElementById('swimmersList');
    const elSearchInput = document.getElementById('searchInput');
    const elTotalSwimmers = document.getElementById('totalSwimmers');
    const elActiveSwimmers = document.getElementById('activeSwimmers');
    const elTotalTerms = document.getElementById('totalTerms');
    
    // Elementi za modal urejanja plavalca
    const elEditSwimmerModal = document.getElementById('editSwimmerModal');
    const elEditSwimmerFirst = document.getElementById('editSwimmerFirst');
    const elEditSwimmerLast = document.getElementById('editSwimmerLast');
    const elEditSwimmerEmail = document.getElementById('editSwimmerEmail');
    const elEditSwimmerPhone = document.getElementById('editSwimmerPhone');
    const elEditSwimmerAddress = document.getElementById('editSwimmerAddress');
    const elEditSwimmerPostalCode = document.getElementById('editSwimmerPostalCode');
    const elSaveEditSwimmerBtn = document.getElementById('saveEditSwimmerBtn');
    const elCloseEditSwimmerModalBtn = document.getElementById('closeEditSwimmerModalBtn');
    const elEditSwimmerInfo = document.getElementById('editSwimmerInfo');
    
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
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function getSeasonName(seasonId) {
        if (!seasonId) return 'Brez sezone';
        return seasons.find(s => s.id === seasonId)?.name || 'Neznana sezona';
    }

    function groupSwimmerTermsBySeason(termIds) {
        const grouped = new Map();
        termIds.forEach(termId => {
            const term = terms.find(t => t.id === termId);
            const key = term?.season_id || '__none__';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(term || { id: termId, missing: true });
        });
        const seasonSortKey = key => {
            if (key === '__none__') return '0000-01-01';
            return seasons.find(s => s.id === key)?.date_from || '0000-01-01';
        };
        return [...grouped.entries()].sort((a, b) => seasonSortKey(b[0]).localeCompare(seasonSortKey(a[0])));
    }

    function renderTermsBySeason(termIds) {
        if (!termIds.length) {
            return `<div class="terms-section"><div class="no-terms" style="padding: 12px; font-size: 12px;">Ni dodeljenih terminov</div></div>`;
        }
        return groupSwimmerTermsBySeason(termIds).map(([seasonKey, seasonTerms]) => {
            const seasonName = getSeasonName(seasonKey === '__none__' ? null : seasonKey);
            const sorted = seasonTerms
                .filter(t => !t.missing)
                .sort((a, b) => {
                    if (a.day !== b.day) return a.day - b.day;
                    return a.start_time.localeCompare(b.start_time);
                });
            const missing = seasonTerms.filter(t => t.missing);
            return `
                <div class="terms-section">
                    <div class="terms-title">${seasonName}</div>
                    <div class="terms-grid">
                        ${sorted.map(term => {
                            const inactive = !isTermActive(term);
                            return `
                                <div class="term-chip" style="${inactive ? 'background:#f9fafb;color:#9ca3af;border-color:#e5e7eb;' : ''}">
                                    ${formatTermTime(term)}
                                    <small>${formatDate(term.date_from)} - ${formatDate(term.date_to)}</small>
                                </div>
                            `;
                        }).join('')}
                        ${missing.map(t => `<div class="term-chip" style="background:#fef2f2;color:#991b1b;">${t.id}</div>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async function loadSeasons() {
        try {
            const { data, error } = await supabase
                .from('seasons')
                .select('*')
                .order('date_from', { ascending: false });
            if (error) throw error;
            seasons = data || [];
        } catch (error) {
            console.error('Napaka pri nalaganju sezon:', error);
        }
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
            elSwimmersList.innerHTML = '<div class="no-terms" style="grid-column: 1 / -1; padding: 30px; text-align: center;">Ni plavalcev, ki ustrezajo iskalnemu kriteriju.</div>';
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
                        <div class="swimmer-info">
                            <h3 class="swimmer-name">${swimmer.first_name} ${swimmer.last_name}</h3>
                            ${swimmer.email ? `<div class="swimmer-contact"><span class="swimmer-contact-icon">📧</span> ${swimmer.email}</div>` : ''}
                            ${swimmer.phone ? `<div class="swimmer-contact"><span class="swimmer-contact-icon">📞</span> ${swimmer.phone}</div>` : ''}
                            ${swimmer.address || swimmer.postal_code ? `<div class="swimmer-contact"><span class="swimmer-contact-icon">🏠</span> ${[swimmer.address, swimmer.postal_code].filter(Boolean).join(', ')}</div>` : ''}
                        </div>
                        <div class="swimmer-actions">
                            <div class="swimmer-term-count">
                                ${assignedTerms.length} termin${assignedTerms.length === 1 ? '' : assignedTerms.length === 2 ? 'a' : 'ov'}
                            </div>
                            <button class="btn pri" onclick="editSwimmer('${swimmer.id}')" style="font-size: 11px; padding: 5px 10px;">
                                Uredi
                            </button>
                        </div>
                    </div>
                    
                    ${activeTerms.length > 0 ? `
                        <div class="terms-section">
                            <div class="terms-title">Aktivni termini</div>
                            <div class="terms-grid">
                                ${activeTerms.map(term => `
                                    <div class="term-chip">
                                        ${formatTermTime(term)}
                                        <small>${formatDate(term.date_from)} - ${formatDate(term.date_to)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${inactiveTerms.length > 0 ? `
                        <div class="terms-section">
                            <div class="terms-title" style="color: #9ca3af;">Zaključeni termini</div>
                            <div class="terms-grid">
                                ${inactiveTerms.map(term => `
                                    <div class="term-chip" style="background: #f9fafb; color: #9ca3af; border-color: #e5e7eb;">
                                        ${formatTermTime(term)}
                                        <small>${formatDate(term.date_from)} - ${formatDate(term.date_to)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${assignedTerms.length === 0 ? `
                        <div class="terms-section">
                            <div class="no-terms" style="padding: 12px; font-size: 12px;">
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
                (swimmer.phone && swimmer.phone.includes(term)) ||
                (swimmer.address && swimmer.address.toLowerCase().includes(term)) ||
                (swimmer.postal_code && swimmer.postal_code.includes(term))
            );
        }
        
        renderSwimmers();
    }
    
    // ===== Funkcionalnost urejanja plavalcev =====
    
    window.editSwimmer = function(swimmerId) {
        const swimmer = swimmers.find(s => s.id === swimmerId);
        if (!swimmer) {
            alert('Plavalec ne obstaja.');
            return;
        }

        // Polni polja v modalu s trenutnimi podatki
        elEditSwimmerFirst.value = swimmer.first_name || '';
        elEditSwimmerLast.value = swimmer.last_name || '';
        elEditSwimmerEmail.value = swimmer.email || '';
        elEditSwimmerPhone.value = swimmer.phone || '';
        elEditSwimmerAddress.value = swimmer.address || '';
        elEditSwimmerPostalCode.value = swimmer.postal_code || '';
        elEditSwimmerInfo.textContent = '';
        
        // Prikaži modal
        elEditSwimmerModal.style.display = 'flex';
        
        // Shrani ID plavalca za shranjevanje
        elEditSwimmerModal.setAttribute('data-swimmer-id', swimmerId);
    };

    elSaveEditSwimmerBtn.addEventListener('click', async () => {
        const swimmerId = elEditSwimmerModal.getAttribute('data-swimmer-id');
        if (!swimmerId) {
            alert('Napaka: ID plavalca ni najden.');
            return;
        }

        // Preberi vrednosti iz polj
        const first = elEditSwimmerFirst.value.trim();
        const last = elEditSwimmerLast.value.trim();
        const email = elEditSwimmerEmail.value.trim() || null;
        const phone = elEditSwimmerPhone.value.trim() || null;
        const address = elEditSwimmerAddress.value.trim() || null;
        const postalCode = elEditSwimmerPostalCode.value.trim() || null;

        // Validacija
        if (!first || !last) {
            elEditSwimmerInfo.textContent = 'Ime in priimek sta obvezna polja.';
            elEditSwimmerInfo.style.color = '#dc3545';
            return;
        }

        if (email && !isValidEmail(email)) {
            elEditSwimmerInfo.textContent = 'Vnesite veljaven email naslov.';
            elEditSwimmerInfo.style.color = '#dc3545';
            return;
        }

        elEditSwimmerInfo.textContent = 'Shranjevanje...';
        elEditSwimmerInfo.style.color = '#666';

        try {
            // Posodobi v bazi
            const updateData = {
                first_name: first,
                last_name: last,
                email: email,
                phone: phone,
                address: address,
                postal_code: postalCode
            };

            const { error } = await supabase
                .from('swimmers')
                .update(updateData)
                .eq('id', swimmerId);

            if (error) {
                console.error('Napaka pri shranjevanju plavalca:', error);
                elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + error.message;
                elEditSwimmerInfo.style.color = '#dc3545';
                return;
            }

            // Posodobi lokalno stanje
            const swimmer = swimmers.find(s => s.id === swimmerId);
            if (swimmer) {
                swimmer.first_name = first;
                swimmer.last_name = last;
                swimmer.email = email;
                swimmer.phone = phone;
                swimmer.address = address;
                swimmer.postal_code = postalCode;
            }

            // Osveži seznam
            filteredSwimmers = [...swimmers];
            renderSwimmers();

            // Zapri modal
            elEditSwimmerModal.style.display = 'none';
            elEditSwimmerInfo.textContent = '';

        } catch (error) {
            console.error('Napaka pri shranjevanju plavalca:', error);
            elEditSwimmerInfo.textContent = 'Napaka pri shranjevanju: ' + error.message;
            elEditSwimmerInfo.style.color = '#dc3545';
        }
    });

    elCloseEditSwimmerModalBtn.addEventListener('click', () => {
        elEditSwimmerModal.style.display = 'none';
        elEditSwimmerInfo.textContent = '';
    });

    // Zapri modal ob kliku zunaj
    window.addEventListener('click', (e) => {
        if (e.target === elEditSwimmerModal) {
            elEditSwimmerModal.style.display = 'none';
            elEditSwimmerInfo.textContent = '';
        }
    });

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
