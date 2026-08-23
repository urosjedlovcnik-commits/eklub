// 🔐 Trainer Authentication Manager

class TrainerAuthManager {
    constructor() {
        console.log('🔍 DEBUG: TrainerAuthManager constructor start');
        this.supabase = createAuthSupabaseClient();
        console.log('🔍 DEBUG: Supabase client:', this.supabase);
        this.currentUser = null;
        this.currentTrainer = null;
        this.userPermissions = null;
        console.log('🔍 DEBUG: TrainerAuthManager constructor end');
    }

    // Prijavitev trenerja
    async loginTrainer(email, password) {
        try {
            debugLog('Poskus prijave', { email });
            
            // 🧪 DEMO MODE - Simulacija prijave za testiranje
            const demoMode = true; // Nastavi na true za demo login, false za pravo Supabase Auth
            
            if (demoMode) {
                return await this.loginTrainerDemo(email, password);
            }
            
            // 1. Prijavi z Supabase Auth (pravi način)
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (authError) {
                throw new Error(`Napaka pri prijavi: ${authError.message}`);
            }
            
            debugLog('Supabase Auth uspešen', authData.user);
            
            // 2. Pridobi trenerjev profil in vlogo
            const trainer = await this.getTrainerProfile(authData.user.id);
            
            if (!trainer) {
                await this.supabase.auth.signOut();
                throw new Error('Nimate dostopa kot trener');
            }
            
            // 3. Nastavi session
            this.currentUser = authData.user;
            this.currentTrainer = trainer;
            this.userPermissions = this.calculatePermissions(trainer.role);
            
            // 4. Shrani session lokalno
            this.saveSession();
            
            debugLog('Prijava uspešna', {
                trainer: trainer,
                permissions: this.userPermissions
            });
            
            return {
                success: true,
                trainer: trainer,
                permissions: this.userPermissions
            };
            
        } catch (error) {
            debugLog('Napaka pri prijavi', error);
            throw error;
        }
    }

    // 🧪 Demo prijava (simulacija za testiranje)
    async loginTrainerDemo(email, password) {
        debugLog('DEMO MODE: Simulacija prijave', { email });
        
        // Preveri demo podatke
        const demoUsers = {
            'uros.jedlovcnik@gmail.com': {
                id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2',
                first_name: 'Uroš',
                last_name: 'Jedlovčnik',
                email: 'uros.jedlovcnik@gmail.com',
                role: 'super_admin',
                password: 'PlavalnaSola2025!'
            },
            'm4j0n3z4@gmail.com': {
                id: '8f7c54c3-6cb4-4192-ab3d-7cb73a01c020',
                first_name: 'urke',
                last_name: 'prdurke',
                email: 'm4j0n3z4@gmail.com',
                role: 'trainer_admin',
                password: 'DEMO123!'
            },
            'uros@playworldgame.ocm': {
                id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2-fake',
                first_name: 'Urke',
                last_name: 'Care',
                email: 'uros@playworldgame.ocm',
                role: 'trainer',
                password: 'DEMO123!'
            }
        };
        
        const demoUser = demoUsers[email];
        if (!demoUser || demoUser.password !== password) {
            throw new Error('Napačen email ali geslo (demo mode)');
        }
        
        // Simuliraj uspešno prijavo
        this.currentUser = { id: demoUser.id, email: demoUser.email };
        this.currentTrainer = demoUser;
        this.userPermissions = this.calculatePermissions(demoUser.role);
        
        // Shrani demo session
        this.saveSession();
        
        debugLog('DEMO prijava uspešna', {
            trainer: this.currentTrainer,
            permissions: this.userPermissions
        });
        
        return {
            success: true,
            trainer: this.currentTrainer,
            permissions: this.userPermissions
        };
    }

    // Pridobi trenerjev profil
    async getTrainerProfile(userId) {
        try {
            console.log('🔍 DEBUG: getTrainerProfile() - userId:', userId);
            
            // Najprej poskusi po user_id stolpcu (povezava z auth.users)
            let { data: trainer, error } = await this.supabase
                .from('trainers')
                .select('*')
                .eq('user_id', userId)
                .single();
                
            console.log('🔍 DEBUG: Pridobivanje po user_id:', { trainer, error });
                
            if (error || !trainer) {
                console.log('🔍 DEBUG: Ni najden po user_id, poskušam po emailu');
                
                // Če ni najden po user_id, poskusi po emailu
                const { data: authUser, error: authError } = await this.supabase.auth.getUser();
                console.log('🔍 DEBUG: Auth user:', { authUser, authError });
                
                if (authError || !authUser.user) {
                    console.log('🔍 DEBUG: Napaka pri pridobivanju Auth uporabnika', authError);
                    return null;
                }
                
                const { data: trainerByEmail, error: emailError } = await this.supabase
                    .from('trainers')
                    .select('*')
                    .eq('email', authUser.user.email)
                    .single();
                    
                console.log('🔍 DEBUG: Pridobivanje po emailu:', { trainerByEmail, emailError });
                    
                if (emailError || !trainerByEmail) {
                    console.log('🔍 DEBUG: Napaka pri pridobivanju profila po emailu', emailError);
                    return null;
                }
                
                trainer = trainerByEmail;
            }
            
            console.log('🔍 DEBUG: Vrnjen trener:', trainer);
            return trainer;
        } catch (error) {
            console.log('🔍 DEBUG: Napaka pri pridobivanju profila:', error);
            return null;
        }
    }

    // Izračunaj dovoljenja na podlagi vloge
    calculatePermissions(role) {
        switch (role) {
            case AUTH_CONFIG.ROLES.SUPER_ADMIN:
                return {
                    level: AUTH_CONFIG.PERMISSIONS.FULL_ACCESS,
                    canViewAllTrainings: true,
                    canEditAllTrainings: true,
                    canManageTrainers: true,
                    canManageTerms: true,
                    description: 'Popoln dostop do sistema'
                };
            
            case AUTH_CONFIG.ROLES.TRAINER_ADMIN:
                return {
                    level: AUTH_CONFIG.PERMISSIONS.ALL_TRAININGS,
                    canViewAllTrainings: true,
                    canEditAllTrainings: true,
                    canManageTrainers: false,
                    canManageTerms: false,
                    description: 'Dostop do vseh treningov'
                };
            
            case AUTH_CONFIG.ROLES.TRAINER:
                return {
                    level: AUTH_CONFIG.PERMISSIONS.OWN_TRAININGS_ONLY,
                    canViewAllTrainings: false,
                    canEditAllTrainings: false,
                    canManageTrainers: false,
                    canManageTerms: false,
                    description: 'Dostop samo do svojih treningov'
                };
            
            default:
                return {
                    level: AUTH_CONFIG.PERMISSIONS.NO_ACCESS,
                    canViewAllTrainings: false,
                    canEditAllTrainings: false,
                    canManageTrainers: false,
                    canManageTerms: false,
                    description: 'Ni dostopa'
                };
        }
    }

    // Preveri ali je trener prijavljen
    async checkTrainerAccess() {
        try {
            // 🧪 DEMO MODE - uporabi lokalni session
            const demoMode = true; // Nastavi na true za demo, false za pravo Supabase Auth
            
            if (demoMode) {
                return this.checkTrainerAccessDemo();
            }
            
            // 1. Preveri Supabase Auth session
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error || !user) {
                this.clearSession();
                return null;
            }
            
            // 2. Preveri lokalni session
            const localSession = this.getStoredSession();
            if (!localSession || localSession.userId !== user.id) {
                this.clearSession();
                return null;
            }
            
            // 3. Preveri trenerjev profil
            const trainer = await this.getTrainerProfile(user.id);
            if (!trainer) {
                await this.supabase.auth.signOut();
                this.clearSession();
                return null;
            }
            
            // 4. Nastavi trenutno stanje
            this.currentUser = user;
            this.currentTrainer = trainer;
            this.userPermissions = this.calculatePermissions(trainer.role);
            
            return {
                user: user,
                trainer: trainer,
                permissions: this.userPermissions
            };
            
        } catch (error) {
            debugLog('Napaka pri preverjanju dostopa', error);
            this.clearSession();
            return null;
        }
    }

    // 🧪 Demo preverjanje dostopa
    checkTrainerAccessDemo() {
        console.log('🔍 DEBUG: checkTrainerAccessDemo()');
        
        // Preveri lokalni session
        const localSession = this.getStoredSession();
        console.log('🔍 DEBUG: Lokalni session:', localSession);
        
        if (!localSession) {
            console.log('🔍 DEBUG: Ni lokalnega sessiona');
            return null;
        }
        
        // V demo načinu že imamo shranjenega trainerja v sessioni
        if (this.currentTrainer && this.userPermissions) {
            console.log('🔍 DEBUG: Session je veljaven:', {
                trainer: this.currentTrainer,
                permissions: this.userPermissions
            });
            
            return {
                user: this.currentUser,
                trainer: this.currentTrainer,
                permissions: this.userPermissions
            };
        }
        
        // Poskusi obnoviti iz sessiona
        const demoUsers = {
            'uros.jedlovcnik@gmail.com': {
                id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2',
                first_name: 'Uroš',
                last_name: 'Jedlovčnik',
                email: 'uros.jedlovcnik@gmail.com',
                role: 'super_admin'
            },
            'm4j0n3z4@gmail.com': {
                id: '8f7c54c3-6cb4-4192-ab3d-7cb73a01c020',
                first_name: 'urke',
                last_name: 'prdurke',
                email: 'm4j0n3z4@gmail.com',
                role: 'trainer_admin'
            },
            'uros@playworldgame.ocm': {
                id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2-fake',
                first_name: 'Urke',
                last_name: 'Care',
                email: 'uros@playworldgame.ocm',
                role: 'trainer'
            }
        };
        
        // Poišči uporabnika po ID iz sessiona
        const sessionTrainer = Object.values(demoUsers).find(user => user.id === localSession.trainerId);
        
        if (sessionTrainer) {
            console.log('🔍 DEBUG: Obnovljen trener iz sessiona:', sessionTrainer);
            
            this.currentUser = { id: sessionTrainer.id, email: sessionTrainer.email };
            this.currentTrainer = sessionTrainer;
            this.userPermissions = this.calculatePermissions(sessionTrainer.role);
            
            return {
                user: this.currentUser,
                trainer: this.currentTrainer,
                permissions: this.userPermissions
            };
        }
        
        console.log('🔍 DEBUG: Session ni veljaven, počistim');
        this.clearSession();
        return null;
    }

    // Odjava
    async logout() {
        try {
            await this.supabase.auth.signOut();
            this.clearSession();
            debugLog('Odjava uspešna');
        } catch (error) {
            debugLog('Napaka pri odjavi', error);
            this.clearSession(); // Vseeno počisti lokalno
        }
    }

    // Shrani session lokalno
    saveSession() {
        console.log('🔍 DEBUG: saveSession() klican');
        console.log('🔍 DEBUG: currentUser:', this.currentUser);
        console.log('🔍 DEBUG: currentTrainer:', this.currentTrainer);
        
        if (!this.currentUser || !this.currentTrainer) {
            console.log('🔍 DEBUG: Ne morem shraniti sessiona - manjkajo podatki');
            return;
        }
        
        const sessionData = {
            userId: this.currentUser.id,
            trainerId: this.currentTrainer.id, // To je ID iz trainers tabele
            trainerRole: this.currentTrainer.role,
            firstName: this.currentTrainer.first_name,
            lastName: this.currentTrainer.last_name,
            email: this.currentTrainer.email,
            loginTime: Date.now(),
            expiresAt: Date.now() + (AUTH_CONFIG.SESSION.DURATION_HOURS * 60 * 60 * 1000)
        };
        
        console.log('🔍 DEBUG: Session data za shranjevanje:', sessionData);
        
        console.log('🔍 DEBUG: Shranjujem session:', sessionData);
        localStorage.setItem(AUTH_CONFIG.SESSION.STORAGE_KEY, JSON.stringify(sessionData));
        console.log('🔍 DEBUG: Session shranjen');
    }

    // Pridobi shranjen session
    getStoredSession() {
        try {
            const sessionStr = localStorage.getItem('trainer_session');
            if (!sessionStr) return null;
            
            const session = JSON.parse(sessionStr);
            
            // Preveri, če je session potekel
            if (Date.now() > session.expiresAt) {
                this.clearSession();
                return null;
            }
            
            return session;
        } catch (error) {
            debugLog('Napaka pri branju sessiona', error);
            this.clearSession();
            return null;
        }
    }

    // 🔄 Obnovi trenerja iz sessiona (za demo način)
    restoreTrainerFromSession() {
        try {
            const localSession = this.getStoredSession();
            if (!localSession) return false;
            
            // Demo uporabniki
            const demoUsers = {
                'uros.jedlovcnik@gmail.com': {
                    id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2',
                    first_name: 'Uroš',
                    last_name: 'Jedlovčnik',
                    email: 'uros.jedlovcnik@gmail.com',
                    role: 'super_admin'
                },
                'm4j0n3z4@gmail.com': {
                    id: '8f7c54c3-6cb4-4192-ab3d-7cb73a01c020',
                    first_name: 'urke',
                    last_name: 'prdurke',
                    email: 'm4j0n3z4@gmail.com',
                    role: 'trainer_admin'
                },
                'uros@playworldgame.ocm': {
                    id: '8615f0eb-e1e9-4ce8-8d16-a7e677207da2-fake',
                    first_name: 'Urke',
                    last_name: 'Care',
                    email: 'uros@playworldgame.ocm',
                    role: 'trainer'
                }
            };
            
            // Poišči trenerja po emailu iz sessiona
            const sessionTrainer = Object.values(demoUsers).find(user => user.email === localSession.email);
            
            if (sessionTrainer) {
                console.log('🔍 DEBUG: Obnovljen trener iz sessiona:', sessionTrainer);
                
                this.currentUser = { id: sessionTrainer.id, email: sessionTrainer.email };
                this.currentTrainer = sessionTrainer;
                this.userPermissions = this.calculatePermissions(sessionTrainer.role);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Napaka pri obnovitvi trenerja:', error);
            return false;
        }
    }

    // Počisti session
    clearSession() {
        localStorage.removeItem('trainer_session');
        this.currentUser = null;
        this.currentTrainer = null;
        this.userPermissions = null;
    }

    // Pridobi termine za trenutnega trenerja (glede na vlogo)
    async getTrainerTerms(date = null) {
        // Preveri in obnovi trenerja iz sessiona (za demo način)
        if (!this.currentTrainer || !this.userPermissions) {
            const restored = this.restoreTrainerFromSession();
            if (!restored) {
                throw new Error('Niste prijavljeni');
            }
        }

        try {
            if (this.userPermissions.canViewAllTrainings) {
                // Admin vloge - vidi vse termine
                return await this.getAllTerms(date);
            } else {
                // Osnovni trener - samo svoje termine
                return await this.getOwnTerms(date);
            }
        } catch (error) {
            debugLog('Napaka pri pridobivanju terminov', error);
            throw error;
        }
    }

    // Pridobi vse termine (za admin vloge)
    async getAllTerms(date = null) {
        const { data: allTerms, error } = await this.supabase
            .from('terms')
            .select('*')
            .order('day', { ascending: true })
            .order('start_time', { ascending: true });
            
        if (error) throw error;
        return allTerms || [];
    }

    // Pridobi samo svoje termine
    async getOwnTerms(date = null) {
        // Zaenkrat vrnemo vse termine, ker trainer_terms tabela morda ne obstaja
        const { data: allTerms, error } = await this.supabase
            .from('terms')
            .select('*')
            .order('day', { ascending: true })
            .order('start_time', { ascending: true });
            
        if (error) throw error;
        
        return allTerms || [];
    }

    // Pridobi termine za koledar (z datumom)
    async getCalendarTerms(date) {
        // Preveri in obnovi trenerja iz sessiona (za demo način)
        if (!this.currentTrainer || !this.userPermissions) {
            const restored = this.restoreTrainerFromSession();
            if (!restored) {
                throw new Error('Niste prijavljeni');
            }
        }

        const allTerms = await this.getTrainerTerms();
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
        const isoDate = this.formatDateISO(date);
        
        return allTerms.filter(term => 
            term.day === dayOfWeek && 
            isoDate >= term.date_from && 
            isoDate <= term.date_to
        );
    }

    // Pomožna funkcija za formatiranje datuma
    formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 🏊‍♂️ TRENERJEVA PRISOTNOST
    // Pridobi prisotnost trenerja za določen datum
    async getTrainerAttendance(date) {
        // Preveri in obnovi trenerja iz sessiona (za demo način)
        if (!this.currentTrainer) {
            const restored = this.restoreTrainerFromSession();
            if (!restored) {
                throw new Error('Niste prijavljeni');
            }
        }

        try {
            const isoDate = this.formatDateISO(date);
            
            // 🧪 DEMO MODE - Simulacija prisotnosti iz localStorage
            const demoMode = true; // Nastavi na true za demo, false za pravo bazo
            
            if (demoMode) {
                const demoAttendance = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
                const attendance = demoAttendance.find(a => 
                    a.trainer_email === this.currentTrainer.email && 
                    a.date === isoDate
                );
                
                console.log('🔍 DEBUG: DEMO MODE - Prisotnost iz localStorage:', attendance);
                return attendance || null;
            }
            
            // PRAVI NAČIN - Supabase baza
            const { data: attendance, error } = await this.supabase
                .from('trainer_attendance')
                .select('*')
                .eq('trainer_id', this.currentTrainer.id)
                .eq('date', isoDate)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            return attendance || null;
        } catch (error) {
            debugLog('Napaka pri pridobivanju prisotnosti', error);
            throw error;
        }
    }

    // Posodobi prisotnost trenerja
    async updateTrainerAttendance(date, isPresent, notes = '') {
        // Preveri in obnovi trenerja iz sessiona (za demo način)
        if (!this.currentTrainer) {
            const restored = this.restoreTrainerFromSession();
            if (!restored) {
                throw new Error('Niste prijavljeni');
            }
        }

        try {
            const isoDate = this.formatDateISO(date);
            
            // 🧪 DEMO MODE - Simulacija prisotnosti brez baze
            const demoMode = true; // Nastavi na true za demo, false za pravo bazo
            
            if (demoMode) {
                console.log('🔍 DEBUG: DEMO MODE - Simuliram prisotnost:', {
                    trainer: this.currentTrainer.email,
                    date: isoDate,
                    isPresent,
                    notes
                });
                
                // V demo načinu shrani v localStorage
                const demoAttendance = {
                    id: `demo_${Date.now()}`,
                    trainer_id: this.currentTrainer.id,
                    trainer_email: this.currentTrainer.email,
                    date: isoDate,
                    is_present: isPresent,
                    notes: notes,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                // Shrani v localStorage pod demo_attendance
                const existingDemo = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
                const filteredDemo = existingDemo.filter(a => 
                    !(a.trainer_email === this.currentTrainer.email && a.date === isoDate)
                );
                filteredDemo.push(demoAttendance);
                localStorage.setItem('demo_attendance', JSON.stringify(filteredDemo));
                
                console.log('🔍 DEBUG: Demo prisotnost shranjena v localStorage');
                return demoAttendance;
            }
            
            // PRAVI NAČIN - Supabase baza
            // Preveri, če prisotnost že obstaja
            const existingAttendance = await this.getTrainerAttendance(date);
            
            if (existingAttendance) {
                // Posodobi obstoječo prisotnost
                const { data, error } = await this.supabase
                    .from('trainer_attendance')
                    .update({
                        is_present: isPresent,
                        notes: notes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingAttendance.id);

                if (error) throw error;
                return data;
            } else {
                // Ustvari novo prisotnost
                const { data, error } = await this.supabase
                    .from('trainer_attendance')
                    .insert({
                        trainer_id: this.currentTrainer.id,
                        date: isoDate,
                        is_present: isPresent,
                        notes: notes,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            debugLog('Napaka pri posodabljanju prisotnosti', error);
            throw error;
        }
    }

    // Pridobi statistiko prisotnosti
    async getAttendanceStats(startDate, endDate) {
        // Preveri in obnovi trenerja iz sessiona (za demo način)
        if (!this.currentTrainer) {
            const restored = this.restoreTrainerFromSession();
            if (!restored) {
                throw new Error('Niste prijavljeni');
            }
        }

        try {
            // 🧪 DEMO MODE - Simulacija statistike iz localStorage
            const demoMode = true; // Nastavi na true za demo, false za pravo bazo
            
            if (demoMode) {
                const demoAttendance = JSON.parse(localStorage.getItem('demo_attendance') || '[]');
                const trainerAttendance = demoAttendance.filter(a => 
                    a.trainer_email === this.currentTrainer.email &&
                    a.date >= this.formatDateISO(startDate) &&
                    a.date <= this.formatDateISO(endDate)
                );
                
                const totalDays = trainerAttendance.length;
                const presentDays = trainerAttendance.filter(a => a.is_present).length;
                const absentDays = totalDays - presentDays;

                console.log('🔍 DEBUG: DEMO MODE - Statistika iz localStorage:', {
                    total: totalDays,
                    present: presentDays,
                    absent: absentDays
                });

                return {
                    total: totalDays,
                    present: presentDays,
                    absent: absentDays,
                    percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                    details: trainerAttendance
                };
            }
            
            // PRAVI NAČIN - Supabase baza
            const { data: attendance, error } = await this.supabase
                .from('trainer_attendance')
                .select('*')
                .eq('trainer_id', this.currentTrainer.id)
                .gte('date', this.formatDateISO(startDate))
                .lte('date', this.formatDateISO(endDate))
                .order('date', { ascending: true });

            if (error) throw error;

            const totalDays = attendance.length;
            const presentDays = attendance.filter(a => a.is_present).length;
            const absentDays = totalDays - presentDays;

            return {
                total: totalDays,
                present: presentDays,
                absent: absentDays,
                percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                details: attendance
            };
        } catch (error) {
            debugLog('Napaka pri pridobivanju statistike prisotnosti', error);
            throw error;
        }
    }

    // Getterji za hitro preverjanje
    get isLoggedIn() {
        return this.currentUser && this.currentTrainer;
    }

    get isAdmin() {
        return this.userPermissions?.canViewAllTrainings || false;
    }

    get canManageSystem() {
        return this.userPermissions?.canManageTrainers || false;
    }

    get trainerName() {
        return this.currentTrainer ? 
            `${this.currentTrainer.first_name} ${this.currentTrainer.last_name}` : 
            'Neznano';
    }
}

// Globalna instanca
console.log('🔍 DEBUG: Inicializiram TrainerAuthManager');
window.trainerAuth = new TrainerAuthManager();
console.log('🔍 DEBUG: TrainerAuthManager inicializiran:', window.trainerAuth);
