# 🛡️ SafeLink Scanner - Browser Security Extension

A powerful Chrome/Edge extension that scans URLs in real-time against multiple security databases to protect you from malicious websites, phishing attempts, and other online threats.

## 🌟 Features

### Multi-Source Security Scanning
- **VirusTotal** - Checks against 70+ antivirus engines
- **Google Safe Browsing** - Google's threat intelligence
- **URLScan.io** - Detailed website analysis
- **Google Hacking Database Patterns** - Detects malicious URL patterns

### Real-Time Protection
- ✅ Automatic scanning when you visit new URLs
- ✅ Visual badge indicators (Green ✓ = Safe, Red ⚠ = Danger)
- ✅ Desktop notifications for dangerous sites
- ✅ On-page warning banners
- ✅ Phishing detection

### Smart Features
- 🚀 Result caching (avoids duplicate scans)
- 📊 Detailed security reports in popup
- 🔄 Manual rescan option
- 💾 Persistent scan history

---

## 📦 Installation

### Step 1: Download the Extension

Clone or download all files to a folder on your computer.

### Step 2: Get API Keys (Required for Full Functionality)

#### VirusTotal API Key (FREE)
1. Go to https://www.virustotal.com/gui/join-us
2. Sign up for a free account
3. Go to your profile → API Key
4. Copy your API key

#### Google Safe Browsing API Key (FREE)
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Safe Browsing API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

#### URLScan.io API Key (FREE)
1. Go to https://urlscan.io/
2. Sign up for a free account
3. Go to Settings → API
4. Copy your API key

### Step 3: Configure API Keys

1. Open `background.js` file
2. Find this section at the top:

```javascript
const API_KEYS = {
  virusTotal: 'YOUR_VIRUSTOTAL_API_KEY',
  googleSafeBrowsing: 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY',
  urlScan: 'YOUR_URLSCAN_API_KEY'
};
```

3. Replace the placeholder text with your actual API keys:

```javascript
const API_KEYS = {
  virusTotal: 'a1b2c3d4e5f6g7h8i9j0...',
  googleSafeBrowsing: 'AIzaSy...',
  urlScan: 'abc123-def456-...'
};
```

4. Save the file

### Step 4: Load Extension in Chrome/Edge

1. Open Chrome/Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **"Developer mode"** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `safelink-extension` folder
6. The extension is now installed! 🎉

---

## 🎯 How to Use

### Automatic Protection
- Simply browse the web normally
- The extension automatically scans every URL you visit
- Check the extension icon badge:
  - **Green ✓** = Safe website
  - **Red ⚠** = Dangerous website detected
  - **Orange ...** = Scan in progress

### View Detailed Report
1. Click the extension icon in your toolbar
2. See comprehensive security report including:
   - Overall safety status
   - VirusTotal scan results
   - Google Safe Browsing status
   - Pattern analysis
   - Specific warnings and threats

### Manual Rescan
- Click the "🔄 Rescan URL" button in the popup
- Useful if you want to check a URL again

---

## 🔍 What It Detects

### Malware & Viruses
- Trojans, ransomware, spyware
- Malicious downloads
- Infected websites

### Phishing Attempts
- Fake login pages
- Credential harvesting sites
- Brand impersonation

### Suspicious Patterns
- SQL injection attempts
- Cross-site scripting (XSS)
- Directory traversal attacks
- Encoded malicious URLs

### Social Engineering
- Scam websites
- Fake tech support
- Deceptive content

---

## 📊 Understanding the Results

### VirusTotal Scores
- **0 Malicious** = Clean
- **1-3 Malicious** = Potentially suspicious
- **4+ Malicious** = Likely dangerous

### Google Safe Browsing
- **Safe** = No known threats
- **Threats Found** = Dangerous (shows threat types)

### Pattern Analysis
- Checks URL structure for malicious patterns
- Detects dangerous file extensions
- Identifies suspicious query parameters

---

## ⚙️ Configuration Options

### Adjust Cache Duration
In `background.js`, modify:
```javascript
const CACHE_DURATION = 3600000; // 1 hour (in milliseconds)
```

### Disable Notifications
Comment out this section in `background.js`:
```javascript
// chrome.notifications.create({ ... });
```

### Add Custom Patterns
Add to the `suspiciousPatterns` array in `background.js`:
```javascript
const suspiciousPatterns = [
  /your-custom-pattern/i,
  // ... existing patterns
];
```

---

## 🛠️ Troubleshooting

### Extension Not Working
1. Check if Developer Mode is enabled
2. Reload the extension (click reload icon)
3. Check browser console for errors (F12)

### API Keys Not Working
1. Verify keys are correctly pasted (no extra spaces)
2. Check if APIs are enabled in respective dashboards
3. Ensure you haven't exceeded free tier limits

### No Scan Results Showing
1. Wait a few seconds (scans take time)
2. Click "Rescan URL" button
3. Check if URL is supported (not chrome:// pages)

### Badge Not Updating
1. Refresh the current page
2. Reload the extension
3. Check background.js console for errors

---

## 📁 Project Structure

```
safelink-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker (scanning logic)
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── content.js             # Content script (on-page warnings)
├── content.css            # Styles for warning banner
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

---

## 🔐 Privacy & Security

### Data Handling
- URLs are sent to third-party APIs for scanning
- No personal data is collected or stored
- Scan results are cached locally only
- No data is sent to our servers (extension is client-side only)

### API Security
- API keys are stored in extension code (keep them private!)
- Never share your API keys publicly
- Consider using environment-specific keys

---

## 🚀 Advanced Features

### For Developers

#### Add New Security Check
1. Create a new function in `background.js`:
```javascript
async function scanWithNewAPI(url) {
  // Your scanning logic
  return { safe: true/false, details: '...' };
}
```

2. Add to scanning pipeline:
```javascript
const results = await Promise.allSettled([
  scanWithVirusTotal(url),
  scanWithNewAPI(url),  // Add here
  // ...
]);
```

---

## 📝 Future Enhancements

- [ ] Support for Firefox
- [ ] Whitelist/blacklist management
- [ ] Detailed threat reports
- [ ] Scheduled scans
- [ ] Integration with more security APIs
- [ ] Machine learning-based detection
- [ ] PDF report generation

---

## 🤝 Contributing

Want to improve SafeLink Scanner? Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - Free to use and modify

---

## ⚠️ Disclaimer

This extension provides security scanning as a helpful tool, but:
- It cannot guarantee 100% protection
- Always use common sense online
- Keep your browser and OS updated
- Use additional security measures (antivirus, firewall, etc.)

---

## 📞 Support

If you encounter issues:
1. Check the Troubleshooting section
2. Review browser console for errors
3. Verify API keys are correct
4. Ensure APIs are not rate-limited

---

## 🎓 Learning Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [VirusTotal API Docs](https://developers.virustotal.com/reference/overview)
- [Google Safe Browsing API](https://developers.google.com/safe-browsing)
- [Web Security Best Practices](https://owasp.org/)

---

Made with ❤️ for safer web browsing

**Version:** 1.0.0  
**Last Updated:** 2024
