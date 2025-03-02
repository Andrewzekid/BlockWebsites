// Load in all sites and keywords to be blocked
// Check if blockedWebsites key is stored in chrome.storage.local
chrome.storage.local.get(null, function(items) {
    const blocked = items["blockedWebsites"] || [];
    const blockedKeywords = items["blockedKeywords"] || [];
    const redirectUrl = items["redirectUrl"] || "https://www.outlook.com"; // Get custom redirect URL

    console.log("Blocked sites:", blocked);
    console.log("Blocked keywords:", blockedKeywords);
    console.log("Loading in storage...");

    // Check if current URL contains any blocked keywords
    const currentUrl = window.location.href.toLowerCase();

    // First check for exact domain matches
    if (blocked) {
        for (const website of blocked) {
            if (window.location.hostname.includes(website) && website !== "") {
                console.log(`${website} is blocked, redirecting...`);
                blockWebsite(redirectUrl);
                return; // Exit early if blocked
            }
        }
    }

    // Then check for keyword matches in the entire URL
    if (blockedKeywords && blockedKeywords.length > 0) {
        for (const keyword of blockedKeywords) {
            if (currentUrl.includes(keyword.toLowerCase())) {
                console.log(`URL contains blocked keyword "${keyword}", redirecting...`);
                blockWebsite(redirectUrl);
                return; // Exit early if blocked
            }
        }
    }

    // Initialize storage if needed
    if (!blocked) {
        chrome.storage.local.set({ "blockedWebsites": [] }, () => {
            console.log("Initialized blockedWebsites storage!");
        });
    }

    if (!blockedKeywords) {
        chrome.storage.local.set({ "blockedKeywords": [] }, () => {
            console.log("Initialized blockedKeywords storage!");
        });
    }
});

console.log("Content script is running on: ", window.location.href);

function blockWebsite(redirectUrl) {
    console.log("Redirecting!");
    setTimeout(() => {
        window.location.replace(redirectUrl);
    }, 3000);
}

// Function for verifying password from content script
function verifyPasswordFromContent(password) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'verifyPassword',
            password: password
        }, response => {
            if (!response) {
                reject(new Error("No response from background script"));
                return;
            }
            if (response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response.isValid);
            }
        });
    });
}

// Example usage:
// verifyPasswordFromContent("myPassword").then(isValid => {
//     if (isValid) {
//         console.log("Password is correct!");
//     } else {
//         console.log("Password is incorrect!");
//     }
// }).catch(err => console.error("Password verification error:", err));