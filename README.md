# Marketing Team Feedback Portal

A premium single-page web application designed to collect and manage client feedback for their marketing team.

## Features

- **Interactive Feedback Form**:
  - Marketing Representative selection.
  - Client Details (Name, Email, Phone with country code).
  - Job Specifics (Number of guards, Commencement date).
  - Star Rating system.
  - Real-time field validation and reactive submit button.
- **Automated Notifications**: Sends a professionally formatted HTML email summary to designated administrators upon every submission.
- **Responsive Design**: Works perfectly on desktop and mobile devices.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Email Service**: Nodemailer (configured for SMTP).

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://www.npmjs.com/)

   git clone Feedbacksystem
   cd Feedbacksystem
   ```

2. **Install dependencies**:
   
   npm install
   ```

3. **Configure Environment Variables**:
   - Locate the `.env.example` file in the root directory.
   - Create a new file named `.env` based on this template:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your actual SMTP credentials and recipient emails:
     - `EMAIL_USER`: Your SMTP email address.
     - `EMAIL_PASS`: Your app-specific password (if using Gmail, ensure App Passwords are enabled).
     - `RECIPIENT_EMAILS`: A comma-separated list of emails to receive notifications.

## Running the Project

### Development Mode
Runs the server with `nodemon` for automatic restarts on code changes:
```bash
npm run dev
```

### Production Mode
Runs the server normally:
```bash
npm start
```

The application will be available at `http://localhost:3001` (or your configured `PORT`).

## Project Structure

- `index.html`: The main single-page structure.
- `style.css`: Custom premium branding and layout styles.
- `main.js`: Frontend logic, validation, and form submission.
- `server.js`: Node.js/Express backend and email handling.


## Security Note

**Never commit your `.env` file to version control.** It is included in `.gitignore` (if applicable) to prevent sensitive credentials from leaking. Use `.env.example` as a template for other contributors.

---
© 2026 damXey. All rights reserved.
