document.addEventListener('DOMContentLoaded', async () => {
    const userNameEl = document.getElementById('userName');
    const submissionsBody = document.getElementById('submissionsBody');
    const pagination = document.getElementById('pagination');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentPage = 1;

    // Confirm the session is valid before showing anything
    try {
        const meResponse = await fetch('/admin/api/me');
        if (!meResponse.ok) {
            window.location.href = '/admin/login';
            return;
        }
        const me = await meResponse.json();
        userNameEl.innerText = me.name;
    } catch (error) {
        window.location.href = '/admin/login';
        return;
    }

    async function loadSubmissions(page) {
        const response = await fetch(`/admin/api/submissions?page=${page}`);
        if (!response.ok) {
            window.location.href = '/admin/login';
            return;
        }
        const data = await response.json();
        currentPage = data.page;
        renderRows(data.submissions);
        renderPagination(data.page, data.pages);
    }

    function renderRows(submissions) {
        submissionsBody.innerHTML = '';
        if (submissions.length === 0) {
            submissionsBody.innerHTML = '<tr><td colspan="11" class="admin-empty">No submissions yet.</td></tr>';
            return;
        }
        submissions.forEach(sub => {
            const howFound = sub.howFoundOut === 'Others' && sub.howFoundOutOther
                ? `Others — ${sub.howFoundOutOther}`
                : sub.howFoundOut;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(new Date(sub.timestamp).toLocaleString())}</td>
                <td>${escapeHtml(sub.clientName)}</td>
                <td>${escapeHtml(sub.clientAddress)}</td>
                <td>${escapeHtml(sub.clientEmail)}</td>
                <td>${escapeHtml(sub.phoneNumber)}</td>
                <td>${escapeHtml(sub.numGuards)}</td>
                <td>${escapeHtml(sub.deploymentDate)}</td>
                <td>${escapeHtml(howFound)}</td>
                <td>${escapeHtml(sub.referredByStaff || '—')}</td>
                <td>${escapeHtml(sub.deploymentOfficer || '—')}</td>
                <td>${escapeHtml(sub.generalComment || '—')}</td>
            `;
            submissionsBody.appendChild(row);
        });
    }

    function renderPagination(page, pages) {
        pagination.innerHTML = '';
        if (pages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn admin-btn-secondary';
        prevBtn.innerText = 'Previous';
        prevBtn.disabled = page <= 1;
        prevBtn.addEventListener('click', () => loadSubmissions(page - 1));

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn admin-btn-secondary';
        nextBtn.innerText = 'Next';
        nextBtn.disabled = page >= pages;
        nextBtn.addEventListener('click', () => loadSubmissions(page + 1));

        const label = document.createElement('span');
        label.innerText = ` Page ${page} of ${pages} `;

        pagination.appendChild(prevBtn);
        pagination.appendChild(label);
        pagination.appendChild(nextBtn);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    logoutBtn.addEventListener('click', async () => {
        await fetch('/admin/api/logout', { method: 'POST' });
        window.location.href = '/admin/login';
    });

    // Change password modal
    const modal = document.getElementById('changePasswordModal');
    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        modal.classList.remove('hidden');
    });
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    const changePasswordForm = document.getElementById('changePasswordForm');
    const changePasswordError = document.getElementById('changePasswordError');
    const changePasswordSuccess = document.getElementById('changePasswordSuccess');

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        changePasswordError.classList.add('hidden');
        changePasswordSuccess.classList.add('hidden');

        const response = await fetch('/admin/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: document.getElementById('currentPassword').value,
                newPassword: document.getElementById('newPassword').value
            })
        });
        const data = await response.json();

        if (response.ok) {
            changePasswordSuccess.classList.remove('hidden');
            changePasswordForm.reset();
        } else {
            changePasswordError.innerText = data.error || 'Something went wrong.';
            changePasswordError.classList.remove('hidden');
        }
    });

    loadSubmissions(currentPage);
});
