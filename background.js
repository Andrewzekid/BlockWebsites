import { comparePassword } from './utils/crypto-utils.js';

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url.startsWith("http")) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: printTabUrl,
            }).catch(error => console.log("Injection failed:", error));
        }
    });
});

// Initialize storage if needed
chrome.storage.local.get(["blockedWebsites", "hashedPassword", "redirectUrl", "blockedKeywords"], function(result) {
    const updates = {};

    if (result.blockedWebsites === undefined) {
        updates.blockedWebsites = ["youtube.com"];
        console.log("Initializing blocked websites");
    }

    // Password initialization removed - we don't auto-initialize passwords

    if (result.redirectUrl === undefined) {
        updates.redirectUrl = "https://www.outlook.com";
        console.log("Initializing redirect URL");
    }

    if (result.blockedKeywords === undefined) {
        updates.blockedKeywords = [];
        console.log("Initializing blocked keywords");
    }

    // Save updates if any
    if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, () => {
            console.log("Storage initialized!");
        });
    }
});

// Function to verify password - now uses Web Crypto API
function verifyPassword(inputPassword) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['hashedPassword'], async(data) => {
            if (!data.hashedPassword) {
                resolve(inputPassword === "");
                return;
            }

            try {
                const isMatch = await comparePassword(inputPassword, data.hashedPassword);
                resolve(isMatch);
            } catch (err) {
                console.error("Error verifying password:", err);
                reject(err);
            }
        });
    });
}

// Message handler for password verification requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'verifyPassword') {
        verifyPassword(request.password)
            .then(isMatch => {
                sendResponse({ isValid: isMatch });
            })
            .catch(err => {
                sendResponse({ isValid: false, error: err.message });
            });

        return true; // Keep the messaging channel open for async response
    }
});

// Function to print the tab URL (used in the executeScript call)
function printTabUrl() {
    console.log("Current URL:", window.location.href);
}

// Enhanced function to hide the extensions puzzle icon
function injectHidePuzzleIconCSS(tabId) {
    // More aggressive CSS to hide the extensions icon
    const css = `
        /* Hide Chrome's extension icon with multiple selectors */
        #extension-icon,
        #extensions-menu-button,
        .extension-button,
        .extension-toolbar-icon,
        .extension-icon,
        .toolbar-extensions-button,
        [title="Extensions"],
        [aria-label="Extensions"],
        [data-control-id="extensions"],
        div[role="button"][title="Extensions"],
        button[title="Extensions"],
        .ExtnIcn,
        .extension-action-menu,
        .extension-button-menu,
        /* Edge specific selectors */
        .ToolbarButton[title="Extensions"],
        /* Brave specific selectors */
        #extensionIcon
    `;

    chrome.scripting.insertCSS({
        target: { tabId: tabId },
        css: css
    }).catch(error => console.log("CSS injection failed:", error));
}

// Enhanced function to apply strict mode to all tabs
function applyStrictModeToAllTabs() {
    chrome.storage.local.get(['strictMode'], (data) => {
        if (data.strictMode) {
            // Apply to all existing tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url && tab.url.startsWith('http')) {
                        injectHidePuzzleIconCSS(tab.id);

                        // Re-inject after a delay to catch dynamic UI changes
                        setTimeout(() => {
                            injectHidePuzzleIconCSS(tab.id);
                        }, 1000);
                    }
                });
            });

            // Set up a recurring check to ensure the CSS stays applied
            setInterval(() => {
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.url && tab.url.startsWith('http')) {
                            injectHidePuzzleIconCSS(tab.id);
                        }
                    });
                });
            }, 5000); // Check every 5 seconds
        }
    });
}

// Apply on extension startup and installation
chrome.runtime.onStartup.addListener(applyStrictModeToAllTabs);
chrome.runtime.onInstalled.addListener(applyStrictModeToAllTabs);

// Listen for strict mode changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.strictMode && namespace === 'local') {
        if (changes.strictMode.newValue === true) {
            applyStrictModeToAllTabs();
        }
    }
});

// Enhanced URL blocking for extension management pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Apply CSS when tab is complete
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        chrome.storage.local.get(['strictMode'], (data) => {
            if (data.strictMode) {
                injectHidePuzzleIconCSS(tabId);

                // Re-inject after a delay to catch dynamic UI changes
                setTimeout(() => {
                    injectHidePuzzleIconCSS(tabId);
                }, 1000);
            }
        });
    }

    // Block extension management URLs
    if (changeInfo.url) {
        chrome.storage.local.get(['strictMode', 'redirectUrl'], (data) => {
            if (data.strictMode) {
                // Comprehensive list of URLs to block
                const blockedPatterns = [
                    'chrome://extensions',
                    'chrome://settings/extensions',
                    'edge://extensions',
                    'brave://extensions',
                    'chrome://apps',
                    'chrome://settings/manageProfile',
                    'chrome://settings/resetProfileSettings',
                    'chrome://settings/clearBrowserData',
                    'chrome://settings/reset'
                ];

                const isBlocked = blockedPatterns.some(pattern =>
                    changeInfo.url.startsWith(pattern) || changeInfo.url.includes(pattern)
                );

                if (isBlocked) {
                    // Redirect to the redirect URL
                    const redirectUrl = data.redirectUrl || 'https://www.outlook.com';
                    chrome.tabs.update(tabId, { url: redirectUrl });
                }
            }
        });
    }
});