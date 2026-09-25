document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedbackForm');
    const responseMessage = document.getElementById('responseMessage');
    const submitBtn = document.getElementById('submitBtn');

    const emailInput = document.getElementById('clientEmail');
    const emailError = document.getElementById('emailError');
    const allFields = feedbackForm.querySelectorAll('input, textarea');

    const howFoundOutOther = document.getElementById('howFoundOutOther');
    const howFoundOutRadios = feedbackForm.querySelectorAll('input[name="howFoundOut"]');
    const referredByStaffGroup = document.getElementById('referredByStaffGroup');
    const referredByStaff = document.getElementById('referredByStaff');

    // Show the "please specify" field only when "Others" is selected, and the
    // referring-staff field only when "Referred by Client" is selected —
    // a staff member isn't relevant for Website, Advert, or the other options.
    howFoundOutRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            howFoundOutRadios.forEach(r => r.closest('.radio-option').classList.toggle('selected', r.checked));

            if (radio.value === 'Others' && radio.checked) {
                howFoundOutOther.classList.remove('hidden');
                howFoundOutOther.required = true;
            } else if (radio.checked) {
                howFoundOutOther.classList.add('hidden');
                howFoundOutOther.required = false;
                howFoundOutOther.value = '';
            }

            if (radio.value === 'Referred by Client' && radio.checked) {
                referredByStaffGroup.classList.remove('hidden');
                referredByStaff.required = true;
            } else if (radio.checked) {
                referredByStaffGroup.classList.add('hidden');
                referredByStaff.required = false;
                referredByStaff.value = '';
            }

            validateForm();
        });
    });

    // Email Validation Logic
    emailInput.addEventListener('input', () => {
        const isValid = validateEmail(emailInput.value);
        if (emailInput.value && !isValid) {
            emailError.classList.remove('hidden');
            emailInput.classList.add('input-invalid');
        } else {
            emailError.classList.add('hidden');
            emailInput.classList.remove('input-invalid');
        }
        validateForm();
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // Form Interactivity Logic
    allFields.forEach(field => {
        field.addEventListener('input', validateForm);
    });

    function validateForm() {
        let isValid = true;

        // Re-check which fields are currently required — some (like the
        // referring-staff name) toggle required/optional based on other answers.
        const requiredFields = feedbackForm.querySelectorAll('input[required], textarea[required]');
        requiredFields.forEach(field => {
            if (field.type === 'radio') {
                if (!feedbackForm.querySelector(`input[name="${field.name}"]:checked`)) isValid = false;
            } else if (!field.value.trim()) {
                isValid = false;
            }
        });

        // Check email specifically
        if (!validateEmail(emailInput.value)) isValid = false;

        submitBtn.disabled = !isValid;
    }

    // Form Submission Logic
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const howFoundOutChecked = feedbackForm.querySelector('input[name="howFoundOut"]:checked');

        const formData = {
            clientName: document.getElementById('clientName').value,
            clientAddress: document.getElementById('clientAddress').value,
            clientEmail: emailInput.value,
            phoneNumber: document.getElementById('countryCode').value + document.getElementById('phoneNumber').value,
            numGuards: document.getElementById('numGuards').value,
            deploymentDate: document.getElementById('deploymentDate').value,
            howFoundOut: howFoundOutChecked ? howFoundOutChecked.value : '',
            howFoundOutOther: howFoundOutOther.value,
            referredByStaff: document.getElementById('referredByStaff').value,
            deploymentOfficer: document.getElementById('deploymentOfficer').value,
            generalComment: document.getElementById('generalComment').value
        };

        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showMessage("Thank you! Your form has been submitted successfully.", "success");
                feedbackForm.reset();
                howFoundOutOther.classList.add('hidden');
                howFoundOutOther.required = false;
                referredByStaffGroup.classList.add('hidden');
                referredByStaff.required = false;
                howFoundOutRadios.forEach(r => r.closest('.radio-option').classList.remove('selected'));
                validateForm();
            } else {
                throw new Error('Server returned an error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage("Oops! Something went wrong. Please try again later.", "error");
        } finally {
            submitBtn.innerText = 'Submit Onboarding Form';
            validateForm();
        }
    });

    function showMessage(text, type) {
        responseMessage.innerText = text;
        responseMessage.className = type;
        responseMessage.classList.remove('hidden');

        setTimeout(() => {
            responseMessage.classList.add('hidden');
        }, 5000);
    }
});
