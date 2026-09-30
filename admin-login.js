document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorBox = document.getElementById('loginError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = 'Logging in...';
        errorBox.classList.add('hidden');

        try {
            const response = await fetch('/admin/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    rememberMe: document.getElementById('rememberMe').checked
                })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/admin';
            } else {
                errorBox.innerText = data.error || 'Login failed. Please try again.';
                errorBox.classList.remove('hidden');
            }
        } catch (error) {
            errorBox.innerText = 'Something went wrong. Please try again.';
            errorBox.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Log In';
        }
    });
});
