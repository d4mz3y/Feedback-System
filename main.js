document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedbackForm');
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('ratingValue');
    const responseMessage = document.getElementById('responseMessage');
    const submitBtn = document.getElementById('submitBtn');

    // New Fields
    const emailInput = document.getElementById('clientEmail');
    const emailError = document.getElementById('emailError');
    const inputs = feedbackForm.querySelectorAll('input[required], textarea[required]');

    // Star Rating Logic
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            ratingInput.value = value;
            updateStars(value);
            validateForm();
        });

        star.addEventListener('mouseover', () => {
            const value = star.getAttribute('data-value');
            updateStars(value);
        });

        star.addEventListener('mouseleave', () => {
            updateStars(ratingInput.value);
        });
    });

    function updateStars(value) {
        stars.forEach(star => {
            if (star.getAttribute('data-value') <= value) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

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
            if (!input.value.trim()) isValid = false;
        });

        // Check email specifically
        if (!validateEmail(emailInput.value)) isValid = false;

        // Check star rating
        if (ratingInput.value === "0") isValid = false;

        submitBtn.disabled = !isValid;
    }

    // Form Submission Logic
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            memberName: document.getElementById('memberName').value,
            clientName: document.getElementById('clientName').value,
            numGuards: document.getElementById('numGuards').value,
            commencementDate: document.getElementById('commencementDate').value,
            clientEmail: emailInput.value,
            phoneNumber: document.getElementById('countryCode').value + document.getElementById('phoneNumber').value,
            rating: ratingInput.value,
            comments: document.getElementById('comments').value
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
                showMessage("Thank you! Your feedback has been submitted successfully.", "success");
                feedbackForm.reset();
                updateStars(0);
                ratingInput.value = "0";
                validateForm();
            } else {
                throw new Error('Server returned an error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage("Oops! Something went wrong. Please try again later.", "error");
        } finally {
            submitBtn.innerText = 'Submit Review';
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
