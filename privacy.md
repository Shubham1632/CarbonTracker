
# 🌿 Privacy Policy for CarbonTracker Chrome Extension

_Last updated: **June 2024**_

Thank you for using the **CarbonTracker Chrome Extension**. Your privacy is important to us. This Privacy Policy explains how we collect, use, and share information when you use the Extension.

---

## 📥 1. Information We Collect

The Extension collects the following types of data:

### 📊 Usage Data:

- Number of tokens processed in ChatGPT conversations
- Number of user and assistant messages
- Number of web searches and website visits
- Carbon emission statistics calculated from your usage
- Timestamps of activity (e.g., session start time, last updated)

### 🖥 Technical Data:

- URLs of visited pages
  _(Only to determine if a page is a search engine or ChatGPT)_

### ❌ No Personal Data:

- The Extension does **not** collect, store, or transmit any personally identifiable information (PII), such as your name, email address, or account details.

---

## ⚙️ 2. How We Use Your Data

The data collected is used solely for the following purposes:

- To calculate and display your carbon emissions based on your usage of ChatGPT and web searches
- To provide you with statistics and insights about your environmental impact
- To store your usage statistics locally in your browser for your convenience

---

## 🛡️ 3. Data Storage and Security

### 📍 Local Storage:

- All data is stored locally in your browser using Chrome's `storage.local` API
- **No data** is transmitted to any external servers or third parties

### 🔐 Security:

- We use Chrome's secure storage mechanisms
- However, as with any browser extension, your data may be accessible to you or anyone with access to your device and browser profile

---

## 🚫 4. Data Sharing

- **No Third-Party Sharing:**We do **not** share, sell, or transmit your data to any third parties
- **No Analytics or Tracking:**
  The Extension does not use any analytics, advertising, or tracking services

---

## 👤 5. User Control and Data Deletion

- You can reset or delete your usage statistics at any time using the Extension's UI
- Uninstalling the Extension will remove all locally stored data related to the Extension

---

## 🧾 6. Permissions Justification

The Extension requests the following Chrome permissions, each justified as follows:

| 🛠️ Permission                                                           | 📋 Justification                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`storage`**                                                     | Used to save and retrieve user data, such as carbon emission statistics, user preferences, and widget settings. This enables persistent tracking and a personalized experience across browser sessions.                    |
| **`tabs`**                                                        | Required to access information about open tabs, such as URLs, to determine when a user visits a website or performs a web search. This is essential for accurately tracking web usage and emissions.                       |
| **`tabGroups`**                                                   | Allows the extension to interact with tab groups, which may be used for advanced features like grouping tracked tabs or providing aggregated statistics per group.                                                         |
| **`webNavigation`**                                               | Enables the extension to listen for navigation events (such as page loads and redirects) to accurately detect when a user performs a web search or visits a new page, ensuring precise emission tracking.                  |
| **`activeTab`**                                                   | Grants temporary access to the currently active tab when the extension is invoked. This is used for context-aware features, such as displaying emissions data relevant to the current page.                                |
| **`scripting`**                                                   | Allows the extension to inject scripts into web pages (e.g., content scripts for ChatGPT or other sites) to collect usage data and display UI components.                                                                  |
| **`host permissions`** (e.g., `<all_urls>` or specific domains) | Required to monitor and interact with web pages across specified domains in order to track web searches, visits, and emissions on supported sites.                                                                         |
| **Remote code usage**                                               | If remote code is used (e.g., loading scripts or resources from a CDN), it is for updating UI libraries or analytics in a secure and up-to-date manner. All remote resources are vetted to ensure user safety and privacy. |

---

## 🔄 7. Changes to This Policy

We may update this Privacy Policy from time to time.
Any changes will be posted in this file and, where appropriate, notified to you.

---

## 📬 8. Contact

If you have any questions or concerns about this Privacy Policy or the Extension, please contact the developer via the [Chrome Web Store listing](https://chrome.google.com/webstore).

---

_By using the CarbonTracker Chrome Extension, you agree to this Privacy Policy._
