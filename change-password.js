// Modal za spremembo gesla (koledar + admin panel)
(function () {
    const MODAL_ID = 'changePasswordModal';

    function ensureModal() {
        if (document.getElementById(MODAL_ID)) return document.getElementById(MODAL_ID);

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = MODAL_ID;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="box" style="max-width:420px">
                <div class="box-header">
                    <strong>Spremeni geslo</strong>
                    <button type="button" class="btn" id="closeChangePasswordBtn">Zapri</button>
                </div>
                <div class="box-body">
                    <p class="muted" style="margin:0 0 12px;font-size:14px">Novo geslo velja za prijavo na koledar in admin panel.</p>
                    <div id="changePasswordError" class="login-error" style="display:none"></div>
                    <div id="changePasswordSuccess" class="login-error" style="display:none;background:#f0fdf4;border-color:#bbf7d0;color:#166534"></div>
                    <form id="changePasswordForm">
                        <div class="login-field" style="margin-bottom:12px">
                            <label for="changePasswordNew" style="display:block;font-weight:600;margin-bottom:6px">Novo geslo</label>
                            <input type="password" id="changePasswordNew" required minlength="8" autocomplete="new-password" placeholder="Vsaj 8 znakov" style="width:100%;box-sizing:border-box">
                        </div>
                        <div class="login-field" style="margin-bottom:12px">
                            <label for="changePasswordConfirm" style="display:block;font-weight:600;margin-bottom:6px">Ponovite geslo</label>
                            <input type="password" id="changePasswordConfirm" required minlength="8" autocomplete="new-password" placeholder="••••••••" style="width:100%;box-sizing:border-box">
                        </div>
                        <button type="submit" class="btn pri" id="changePasswordSubmitBtn" style="width:100%">Shrani novo geslo</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindModal(modal);
        return modal;
    }

    function bindModal(modal) {
        const form = modal.querySelector('#changePasswordForm');
        const closeBtn = modal.querySelector('#closeChangePasswordBtn');
        const errorEl = modal.querySelector('#changePasswordError');
        const successEl = modal.querySelector('#changePasswordSuccess');
        const submitBtn = modal.querySelector('#changePasswordSubmitBtn');

        function close() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }

        function showError(msg) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
        }

        function showSuccess(msg) {
            successEl.textContent = msg;
            successEl.style.display = 'block';
            errorEl.style.display = 'none';
        }

        function resetForm() {
            form.reset();
            errorEl.style.display = 'none';
            successEl.style.display = 'none';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Shrani novo geslo';
        }

        closeBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            successEl.style.display = 'none';

            const newPassword = modal.querySelector('#changePasswordNew').value;
            const confirmPassword = modal.querySelector('#changePasswordConfirm').value;

            if (newPassword.length < 8) {
                showError('Geslo mora imeti vsaj 8 znakov.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showError('Gesli se ne ujemata.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Shranjevanje …';

            try {
                await trainerAuth.changePassword(newPassword);
                showSuccess('Geslo je shranjeno.');
                setTimeout(() => {
                    close();
                    resetForm();
                }, 1200);
            } catch (err) {
                showError(err.message || 'Shranjevanje ni uspelo.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Shrani novo geslo';
            }
        });

        modal._open = () => {
            resetForm();
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            modal.querySelector('#changePasswordNew').focus();
        };
    }

    window.setupChangePasswordButton = function (buttonId) {
        if (typeof trainerAuth === 'undefined') return;
        const btn = document.getElementById(buttonId);
        if (!btn || btn.dataset.changePasswordBound) return;
        btn.dataset.changePasswordBound = '1';
        const modal = ensureModal();
        btn.addEventListener('click', () => modal._open());
    };
})();
