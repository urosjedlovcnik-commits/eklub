// Admin autentikacija
class AdminAuth {
    constructor() {
        this.ADMIN_EMAIL = 'uros.jedlovcnik@gmail.com';
        this.ADMIN_PASSWORD = 'uros2024'; // Spremenite to geslo!
        this.checkAuth();
    }

    // Preveri, če je uporabnik admin
    checkAuth() {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            this.redirectToLogin();
            return false;
        }

        try {
            // Preveri, če je token veljaven
            const tokenData = JSON.parse(atob(adminToken));
            const now = Math.floor(Date.now() / 1000);
            
            if (tokenData.exp <= now) {
                // Token je potekel
                localStorage.removeItem('adminToken');
                this.redirectToLogin();
                return false;
            }

            if (tokenData.email !== this.ADMIN_EMAIL || tokenData.role !== 'admin') {
                // Napačni podatki v tokenu
                localStorage.removeItem('adminToken');
                this.redirectToLogin();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Napaka pri preverjanju admin tokena:', error);
            localStorage.removeItem('adminToken');
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
    logout() {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    }

    // Pridobi admin podatke iz tokena
    getAdminData() {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) return null;

        try {
            const tokenData = JSON.parse(atob(adminToken));
            return {
                email: tokenData.email,
                role: tokenData.role
            };
        } catch (error) {
            return null;
        }
    }

    // Preveri, če je admin prijavljen (brez preusmeritve)
    isAuthenticated() {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) return false;

        try {
            const tokenData = JSON.parse(atob(adminToken));
            const now = Math.floor(Date.now() / 1000);
            
            return tokenData.exp > now && 
                   tokenData.email === this.ADMIN_EMAIL && 
                   tokenData.role === 'admin';
        } catch (error) {
            return false;
        }
    }
}

// Inicializiraj admin autentikacijo
const adminAuth = new AdminAuth();

// Dodaj admin info v header, če je admin prijavljen
function addAdminInfo() {
    if (adminAuth.isAuthenticated()) {
        const adminData = adminAuth.getAdminData();
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
                    <span style="color: #007bff; font-weight: bold;">Admin: ${adminData.email}</span>
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
