// Content script - runs on every page
// Shows warnings directly on potentially dangerous pages

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showWarning') {
    showWarningBanner(request.data);
  }
});

function showWarningBanner(data) {
  // Remove existing banner if any
  const existing = document.getElementById('safelink-warning-banner');
  if (existing) {
    existing.remove();
  }

  // Create warning banner
  const banner = document.createElement('div');
  banner.id = 'safelink-warning-banner';
  banner.className = 'safelink-warning';
  
  banner.innerHTML = `
    <div class="safelink-warning-content">
      <div class="safelink-warning-icon">⚠️</div>
      <div class="safelink-warning-text">
        <h3>Warning: Potentially Dangerous Website</h3>
        <p>${data.message || 'This website may contain malicious content or phishing attempts.'}</p>
        <div class="safelink-warning-details">
          ${data.warnings && data.warnings.length > 0 ? 
            '<ul>' + data.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('') + '</ul>' 
            : ''}
        </div>
      </div>
      <button class="safelink-warning-close" id="safelink-close-btn">✕</button>
    </div>
    <div class="safelink-warning-actions">
      <button class="safelink-btn safelink-btn-danger" id="safelink-leave-btn">
        Leave This Site
      </button>
      <button class="safelink-btn safelink-btn-secondary" id="safelink-proceed-btn">
        I Understand the Risks
      </button>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  // Add event listeners
  document.getElementById('safelink-close-btn').addEventListener('click', () => {
    banner.style.display = 'none';
  });

  document.getElementById('safelink-leave-btn').addEventListener('click', () => {
    window.history.back();
  });

  document.getElementById('safelink-proceed-btn').addEventListener('click', () => {
    banner.style.display = 'none';
  });

  // Push page content down
  if (document.body) {
    document.body.style.marginTop = '200px';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check for suspicious forms (phishing detection)
function checkForPhishingIndicators() {
  const forms = document.querySelectorAll('form');
  const suspiciousIndicators = [];

  forms.forEach((form, index) => {
    // Check for password fields
    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 0) {
      // Check if form is NOT using HTTPS
      if (window.location.protocol !== 'https:') {
        suspiciousIndicators.push('Password form on non-HTTPS page');
      }

      // Check for suspicious keywords
      const formText = form.innerText.toLowerCase();
      const phishingKeywords = ['verify', 'suspend', 'unusual activity', 'confirm your identity', 'account locked'];
      
      phishingKeywords.forEach(keyword => {
        if (formText.includes(keyword)) {
          suspiciousIndicators.push(`Suspicious keyword detected: "${keyword}"`);
        }
      });
    }
  });

  return suspiciousIndicators;
}

// Run phishing check after page loads
window.addEventListener('load', () => {
  const indicators = checkForPhishingIndicators();
  if (indicators.length > 0) {
    console.log('SafeLink Scanner: Potential phishing indicators detected', indicators);
  }
});
