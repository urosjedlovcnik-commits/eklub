// Popravljena admin autentikacija z Supabase auth
class AdminAuth {
    constructor() {
        this.ADMIN_EMAIL = 'uros.jedlovcnik@gmail.com';
        this.checkAuth();
    }

    // Preveri, če je uporabnik admin
    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
                this.redirectToLogin();
                return false;
            }

            // Preveri, če je uporabnik admin
            const { data: trainerData, error: trainerError } = await supabase
                .from('trainers')
                .select('*')
                .eq('user_id', user.id)
                .eq('email', this.ADMIN_EMAIL)
                .single();

            if (trainerError || !trainerData) {
                console.log('Uporabnik ni admin');
                this.redirectToLogin();
                return false;
            }

            console.log('Admin je prijavljen:', trainerData);
            return true;

        } catch (error) {
            console.error('Napaka pri preverjanju admin autentikacije:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // Preusmeri na admin login
    redirectToLogin() {
        if (window.location.pathname !== '/admin-login.html' && 
            !window.location.pathname.includes('admin-login.html')) {
            window.location.href = 'admin-login.html';
        }
    }

    // Odjava admina
    async logout() {
        try {
            await supabase.auth.signOut();
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Napaka pri odjavi:', error);
            window.location.href = 'admin-login.html';
        }
    }

    // Pridobi admin podatke
    async getAdminData() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) return null;

            const { data: trainerData, error: trainerError } = await supabase
                .from('trainers')
                .select('*')
                .eq('user_id', user.id)
                .eq('email', this.ADMIN_EMAIL)
                .single();

            if (trainerError || !trainerData) return null;

            return {
                email: trainerData.email,
                first_name: trainerData.first_name,
                last_name: trainerData.last_name,
                role: 'admin'
            };

        } catch (error) {
            console.error('Napaka pri pridobivanju admin podatkov:', error);
            return null;
        }
    }

    // Preveri, če je admin prijavljen (brez preusmeritve)
    async isAuthenticated() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) return false;

            const { data: trainerData, error: trainerError } = await supabase
                .from('trainers')
                .select('*')
                .eq('user_id', user.id)
                .eq('email', this.ADMIN_EMAIL)
                .single();

            return !trainerError && trainerData;

        } catch (error) {
            return false;
        }
    }
}

// Inicializiraj admin autentikacijo
const adminAuth = new AdminAuth();

// Dodaj admin info v header, če je admin prijavljen
async function addAdminInfo() {
    if (await adminAuth.isAuthenticated()) {
        const adminData = await adminAuth.getAdminData();
        if (adminData) {
            // Dodaj admin info v toolbar
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) {
                const adminInfo = document.createElement('div');
                adminInfo.style.marginLeft = 'auto';
                adminInfo.style.display = 'flex';
                adminInfo.style.alignItems = 'center';
                adminInfo.style.gap = '10px';
                
                adminInfo.innerHTML = `
                    <span style="color: #007bff; font-weight: bold;">Admin: ${adminData.first_name} ${adminData.last_name}</span>
                    <button class="btn" onclick="adminAuth.logout()" style="background: #dc3545; color: white;">Odjava</button>
                `;
                
                toolbar.appendChild(adminInfo);
            }
        }
    }
}

// Dodaj admin info ob nalaganju strani
document.addEventListener('DOMContentLoaded', () => {
    addAdminInfo();
});
