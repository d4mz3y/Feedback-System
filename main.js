document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedbackForm');
    const responseMessage = document.getElementById('responseMessage');
    const submitBtn = document.getElementById('submitBtn');

    const emailInput = document.getElementById('clientEmail');
    const emailError = document.getElementById('emailError');
    const inputs = feedbackForm.querySelectorAll('input[required], textarea[required]');

    const howFoundOutOther = document.getElementById('howFoundOutOther');
    const howFoundOutRadios = feedbackForm.querySelectorAll('input[name="howFoundOut"]');

    // Show the "please specify" field only when "Others" is selected
    howFoundOutRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'Others' && radio.checked) {
                howFoundOutOther.classList.remove('hidden');
                howFoundOutOther.required = true;
            } else if (radio.checked) {
                howFoundOutOther.classList.add('hidden');
                howFoundOutOther.required = false;
                howFoundOutOther.value = '';
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
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });

    function validateForm() {
        let isValid = true;

        // Check all required fields
        inputs.forEach(input => {
            if (input.type === 'radio') {
                if (!feedbackForm.querySelector(`input[name="${input.name}"]:checked`)) isValid = false;
            } else if (!input.value.trim()) {
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
                showMessage("Thank you! Your KYC form has been submitted successfully.", "success");
                feedbackForm.reset();
                howFoundOutOther.classList.add('hidden');
                howFoundOutOther.required = false;
                validateForm();
            } else {
                throw new Error('Server returned an error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage("Oops! Something went wrong. Please try again later.", "error");
        } finally {
            submitBtn.innerText = 'Submit KYC Form';
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
