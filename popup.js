// Popup script - displays scan results

document.addEventListener('DOMContentLoaded', async () => {
  const contentDiv = document.getElementById('content');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      showError('Unable to get current tab URL');
      return;
    }

    // Skip chrome:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showInfo('Chrome internal pages are not scanned');
      return;
    }

    // Try to get results multiple times with better waiting
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkForResults = async () => {
      attempts++;
      
      chrome.runtime.sendMessage(
        { action: 'getScanResult', tabId: tab.id },
        (result) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            showError('Extension error. Try reloading the extension.');
            return;
          }

          if (result && result.timestamp) {
            // We have valid results
            displayResults(result, tab.url);
          } else if (attempts < maxAttempts) {
            // Keep waiting
            showLoading(`Scanning... (${attempts}/${maxAttempts})`);
            setTimeout(checkForResults, 1500); // Check every 1.5 seconds
          } else {
            // Timeout - show manual rescan option
            showTimeout(tab.url);
          }
        }
      );
    };

    // Start checking for results
    checkForResults();

  } catch (error) {
    console.error('Error:', error);
    showError('An error occurred while scanning');
  }
});

function displayResults(scanResult, url) {
  const status = scanResult.overallStatus;
  const isSafe = status.safe;

  let html = `
    <div class="container">
      <div class="status-card ${isSafe ? 'status-safe' : 'status-danger'}">
        <div class="status-icon">${isSafe ? '✅' : '⚠️'}</div>
        <div class="status-text">${isSafe ? 'This site appears safe' : 'Potential threats detected'}</div>
        <div class="url-display">${escapeHtml(url)}</div>
        
        ${!isSafe && status.warnings.length > 0 ? `
          <ul class="warnings-list">
            ${status.warnings.map(w => `<li>⚠️ ${escapeHtml(w)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="scan-results">
        <h3 style="color: white; margin-bottom: 15px; font-size: 16px;">Detailed Scan Results</h3>
        
        ${renderVirusTotalResult(scanResult.virusTotal)}
        ${renderGoogleSafeBrowsingResult(scanResult.googleSafeBrowsing)}
        ${renderURLScanResult(scanResult.urlScan)}
        ${renderGoogleHackingDBResult(scanResult.googleHackingDB)}
      </div>

      <button class="button button-primary" id="rescanBtn">
        🔄 Rescan URL
      </button>

      ${renderConfigWarning(scanResult)}
    </div>

    <div class="footer">
      Last scanned: ${new Date(scanResult.timestamp).toLocaleString()}<br>
      SafeLink Scanner v1.0.0
    </div>
  `;

  document.getElementById('content').innerHTML = html;
  
  // Add event listener after HTML is inserted
  const rescanBtn = document.getElementById('rescanBtn');
  if (rescanBtn) {
    rescanBtn.addEventListener('click', rescanURL);
  }
}

function renderVirusTotalResult(result) {
  if (!result || result.error) {
    return `
      <div class="scan-item">
        <div class="scan-item-header">
          <div class="scan-item-title">🦠 VirusTotal</div>
          <span class="scan-badge badge-warning">Not Configured</span>
        </div>
        <div class="scan-item-details">
          ${result?.message || 'API key not configured'}
        </div>
      </div>
    `;
  }

  if (result.submitted) {
    return `
      <div class="scan-item">
        <div class="scan-item-header">
          <div class="scan-item-title">🦠 VirusTotal</div>
          <span class="scan-badge badge-warning">Submitted</span>
        </div>
        <div class="scan-item-details">
          URL submitted for scanning. Check back later.
        </div>
      </div>
    `;
  }

  const isSafe = result.malicious === 0 && result.suspicious === 0;

  return `
    <div class="scan-item">
      <div class="scan-item-header">
        <div class="scan-item-title">🦠 VirusTotal</div>
        <span class="scan-badge ${isSafe ? 'badge-safe' : 'badge-danger'}">
          ${isSafe ? 'Clean' : `${result.malicious} Malicious`}
        </span>
      </div>
      <div class="scan-item-details">
        <strong>Malicious:</strong> ${result.malicious} |
        <strong>Suspicious:</strong> ${result.suspicious} |
        <strong>Harmless:</strong> ${result.harmless}
      </div>
    </div>
  `;
}

function renderGoogleSafeBrowsingResult(result) {
  if (!result || result.error) {
    return `
      <div class="scan-item">
        <div class="scan-item-header">
          <div class="scan-item-title">🔍 Google Safe Browsing</div>
          <span class="scan-badge badge-warning">Not Configured</span>
        </div>
        <div class="scan-item-details">
          ${result?.message || 'API key not configured'}
        </div>
      </div>
    `;
  }

  return `
    <div class="scan-item">
      <div class="scan-item-header">
        <div class="scan-item-title">🔍 Google Safe Browsing</div>
        <span class="scan-badge ${result.safe ? 'badge-safe' : 'badge-danger'}">
          ${result.safe ? 'Safe' : 'Threats Found'}
        </span>
      </div>
      <div class="scan-item-details">
        ${result.safe ? 'No known threats detected' : `Threat types: ${result.threatTypes.join(', ')}`}
      </div>
    </div>
  `;
}

function renderURLScanResult(result) {
  if (!result || result.error) {
    return `
      <div class="scan-item">
        <div class="scan-item-header">
          <div class="scan-item-title">🌐 URLScan.io</div>
          <span class="scan-badge badge-warning">Not Configured</span>
        </div>
        <div class="scan-item-details">
          ${result?.message || 'API key not configured'}
        </div>
      </div>
    `;
  }

  if (result.submitted) {
    return `
      <div class="scan-item">
        <div class="scan-item-header">
          <div class="scan-item-title">🌐 URLScan.io</div>
          <span class="scan-badge badge-warning">Scanning</span>
        </div>
        <div class="scan-item-details">
          ${result.message}
          ${result.resultUrl ? `<br><a href="${result.resultUrl}" target="_blank" style="color: #667eea;">View Results</a>` : ''}
        </div>
      </div>
    `;
  }

  return '';
}

function renderGoogleHackingDBResult(result) {
  if (!result || result.error) {
    return '';
  }

  return `
    <div class="scan-item">
      <div class="scan-item-header">
        <div class="scan-item-title">🔐 Pattern Analysis</div>
        <span class="scan-badge ${result.safe ? 'badge-safe' : 'badge-danger'}">
          ${result.safe ? 'Clean' : `${result.warnings.length} Issues`}
        </span>
      </div>
      <div class="scan-item-details">
        ${result.safe ? `Checked ${result.patternsChecked} malicious patterns - all clear` : 
          result.warnings.map(w => `• ${escapeHtml(w)}`).join('<br>')}
      </div>
    </div>
  `;
}

function renderConfigWarning(scanResult) {
  const hasErrors = scanResult.virusTotal?.error || scanResult.googleSafeBrowsing?.error || scanResult.urlScan?.error;

  if (!hasErrors) return '';

  return `
    <div class="config-warning">
      <div class="config-warning-title">⚙️ Configuration Required</div>
      <div class="config-warning-text">
        Some security checks require API keys. To enable full protection:<br>
        1. Get free API keys from the respective services<br>
        2. Update keys in background.js<br>
        3. Reload the extension
      </div>
    </div>
  `;
}

function showLoading(message = 'Scanning...') {
  document.getElementById('content').innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showError(message) {
  document.getElementById('content').innerHTML = `
    <div class="container">
      <div class="status-card status-danger">
        <div class="status-icon">❌</div>
        <div class="status-text">Error</div>
        <div class="scan-item-details">${escapeHtml(message)}</div>
      </div>
    </div>
  `;
}

function showInfo(message) {
  document.getElementById('content').innerHTML = `
    <div class="container">
      <div class="status-card status-warning">
        <div class="status-icon">ℹ️</div>
        <div class="status-text">Information</div>
        <div class="scan-item-details">${escapeHtml(message)}</div>
      </div>
    </div>
  `;
}

function showTimeout(url) {
  document.getElementById('content').innerHTML = `
    <div class="container">
      <div class="status-card status-warning">
        <div class="status-icon">⏱️</div>
        <div class="status-text">Scan Taking Longer Than Expected</div>
        <div class="url-display">${escapeHtml(url)}</div>
        <div class="scan-item-details" style="margin: 15px 0;">
          The security scan is taking longer than usual. This could be due to:
          <ul style="margin-top: 10px; padding-left: 20px;">
            <li>API rate limits</li>
            <li>Slow network connection</li>
            <li>First-time URL submission</li>
          </ul>
        </div>
        <button class="button button-primary" id="manualRescanBtn">
          🔄 Try Again
        </button>
      </div>
    </div>
  `;
  
  const manualRescanBtn = document.getElementById('manualRescanBtn');
  if (manualRescanBtn) {
    manualRescanBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

function rescanURL() {
  showLoading('Rescanning URL...');
  chrome.runtime.sendMessage({ action: 'rescanURL' }, () => {
    setTimeout(() => location.reload(), 2000);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}