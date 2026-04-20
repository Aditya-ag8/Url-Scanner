
// API Keys (Users need to add their own keys)
const API_KEYS = {
  virusTotal: 'API KEY',
  googleSafeBrowsing: 'API KEY',
  urlScan: 'API KEY'
};

// Cache to store scan results (avoid duplicate scans)
const scanCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

// Listen for tab updates (when user navigates to a new URL)
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    const url = details.url;
    
    // Skip chrome:// and extension URLs
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return;
    }

    console.log('Scanning URL:', url);
    await scanURL(url, details.tabId);
  }
});

// Main URL scanning function
async function scanURL(url, tabId) {
  try {
    // Check cache first
    const cached = getCachedResult(url);
    if (cached) {
      console.log('Using cached result for:', url);
      await updateBadgeAndNotify(url, cached, tabId);
      return;
    }

    // Show scanning status
    chrome.action.setBadgeText({ text: '...', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500', tabId }); // Orange

    // Run all scans in parallel
    const results = await Promise.allSettled([
      scanWithVirusTotal(url),
      scanWithGoogleSafeBrowsing(url),
      scanWithURLScan(url),
      checkGoogleHackingDB(url)
    ]);

    // Aggregate results
    const scanResult = {
      url,
      timestamp: Date.now(),
      virusTotal: results[0].status === 'fulfilled' ? results[0].value : { error: true },
      googleSafeBrowsing: results[1].status === 'fulfilled' ? results[1].value : { error: true },
      urlScan: results[2].status === 'fulfilled' ? results[2].value : { error: true },
      googleHackingDB: results[3].status === 'fulfilled' ? results[3].value : { error: true },
      overallStatus: determineOverallStatus(results)
    };

    // Cache the result
    cacheResult(url, scanResult);

    // Update badge and notify user
    await updateBadgeAndNotify(url, scanResult, tabId);

  } catch (error) {
    console.error('Error scanning URL:', error);
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId });
  }
}

// VirusTotal API scan
async function scanWithVirusTotal(url) {
  if (!API_KEYS.virusTotal || API_KEYS.virusTotal === 'YOUR_VIRUSTOTAL_API_KEY') {
    return { error: true, message: 'API key not configured' };
  }

  try {
    const urlId = btoa(url).replace(/=/g, '');
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: {
        'x-apikey': API_KEYS.virusTotal
      }
    });

    if (response.status === 404) {
      // URL not in database, submit for scanning
      const submitResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: {
          'x-apikey': API_KEYS.virusTotal,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `url=${encodeURIComponent(url)}`
      });
      
      return { scanned: false, submitted: true, message: 'Submitted for scanning' };
    }

    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    
    return {
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      safe: stats.malicious === 0 && stats.suspicious === 0
    };
  } catch (error) {
    console.error('VirusTotal error:', error);
    return { error: true, message: error.message };
  }
}

// Google Safe Browsing API
async function scanWithGoogleSafeBrowsing(url) {
  if (!API_KEYS.googleSafeBrowsing || API_KEYS.googleSafeBrowsing === 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY') {
    return { error: true, message: 'API key not configured' };
  }

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEYS.googleSafeBrowsing}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client: {
            clientId: 'safelink-scanner',
            clientVersion: '1.0.0'
          },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }]
          }
        })
      }
    );

    const data = await response.json();
    
    return {
      safe: !data.matches || data.matches.length === 0,
      threats: data.matches || [],
      threatTypes: data.matches ? data.matches.map(m => m.threatType) : []
    };
  } catch (error) {
    console.error('Google Safe Browsing error:', error);
    return { error: true, message: error.message };
  }
}

// URLScan.io API
async function scanWithURLScan(url) {
  if (!API_KEYS.urlScan || API_KEYS.urlScan === 'YOUR_URLSCAN_API_KEY') {
    return { error: true, message: 'API key not configured' };
  }

  try {
    // Submit URL for scanning
    const submitResponse = await fetch('https://urlscan.io/api/v1/scan/', {
      method: 'POST',
      headers: {
        'API-Key': API_KEYS.urlScan,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, visibility: 'public' })
    });

    const submitData = await submitResponse.json();
    
    return {
      submitted: true,
      uuid: submitData.uuid,
      resultUrl: submitData.result,
      message: 'Scan submitted, check results in popup'
    };
  } catch (error) {
    console.error('URLScan error:', error);
    return { error: true, message: error.message };
  }
}

// Check against common Google Hacking Database patterns
async function checkGoogleHackingDB(url) {
  // Common malicious patterns from Google Hacking Database
  const suspiciousPatterns = [
    /\bexec\b/i,
    /\beval\b/i,
    /\bpasswd\b/i,
    /\bselect.*from/i,
    /\bunion.*select/i,
    /\bdrop.*table/i,
    /\binsert.*into/i,
    /\.\.\/\.\.\//,  // Directory traversal
    /%00/,           // Null byte
    /%2e%2e/,        // Encoded dots
    /\bscript\b.*\bonload\b/i,
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i
  ];

  // FIXED: Only check for dangerous executable extensions, not all files
  const suspiciousExtensions = [
    '.exe', '.bat', '.cmd', '.scr', '.vbs', '.jar', '.msi', '.dll'
  ];

  const warnings = [];

  // Check URL patterns
  suspiciousPatterns.forEach((pattern) => {
    if (pattern.test(url)) {
      warnings.push(`Suspicious pattern detected in URL`);
    }
  });

  // FIXED: Only check for executable extensions in the path, not domain
  const urlPath = new URL(url).pathname.toLowerCase();
  suspiciousExtensions.forEach(ext => {
    if (urlPath.endsWith(ext)) {
      warnings.push(`Potentially dangerous file type: ${ext}`);
    }
  });

  // Check for IP addresses instead of domains (still useful for phishing detection)
  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
    warnings.push('Using IP address instead of domain name');
  }

  return {
    safe: warnings.length === 0,
    warnings,
    patternsChecked: suspiciousPatterns.length
  };
}

// Determine overall safety status
function determineOverallStatus(results) {
  let safe = true;
  let warnings = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const value = result.value;
      
      // Check VirusTotal
      if (index === 0 && !value.error) {
        if (value.malicious > 0) {
          safe = false;
          warnings.push(`VirusTotal: ${value.malicious} engines detected malware`);
        }
        if (value.suspicious > 0) {
          warnings.push(`VirusTotal: ${value.suspicious} engines flagged as suspicious`);
        }
      }
      
      // Check Google Safe Browsing
      if (index === 1 && !value.error && !value.safe) {
        safe = false;
        warnings.push(`Google: ${value.threatTypes.join(', ')}`);
      }
      
      // Check Google Hacking DB patterns
      if (index === 3 && !value.safe) {
        safe = false;
        warnings.push(...value.warnings);
      }
    }
  });

  return { safe, warnings };
}

// Cache management
function getCachedResult(url) {
  const cached = scanCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached;
  }
  return null;
}

function cacheResult(url, result) {
  scanCache.set(url, result);
  
  // Clean old cache entries
  if (scanCache.size > 1000) {
    const entries = Array.from(scanCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    scanCache.delete(entries[0][0]);
  }
}

// Update badge and send notification
async function updateBadgeAndNotify(url, scanResult, tabId) {
  const status = scanResult.overallStatus;

  if (status.safe) {
    // Safe URL
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#00AA00', tabId });
  } else {
    // Dangerous URL - AUTO OPEN POPUP
    chrome.action.setBadgeText({ text: '⚠', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId });
    
    // Send notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '⚠️ Potentially Dangerous Website',
      message: `This website may be unsafe!\n${status.warnings.slice(0, 2).join('\n')}`,
      priority: 2
    });

    // AUTOMATICALLY OPEN POPUP when threat detected
    try {
      await chrome.action.openPopup();
    } catch (error) {
      // Popup can only be opened in response to user action in some cases
      console.log('Could not auto-open popup:', error);
    }
  }

  // Store result for popup
  chrome.storage.local.set({ [`scan_${tabId}`]: scanResult });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getScanResult') {
    chrome.storage.local.get([`scan_${request.tabId}`], (result) => {
      sendResponse(result[`scan_${request.tabId}`] || null);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'rescanURL') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        scanCache.delete(tabs[0].url);
        await scanURL(tabs[0].url, tabs[0].id);
        sendResponse({ success: true });
      }
    });
    return true;
  }
});
