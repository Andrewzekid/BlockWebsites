// Load in all sites to be blocked
// Check if blockedWebsites key is stored in chrome.storage.local
chrome.storage.local.get(null, function(items) {
    // 'items' is an object with all key-value pairs in storage
    const blocked = items["blockedWebsites"];
    console.log(blocked);
    // window.alert(`Entries: ${JSON.stringify(blocked)}!`);
    console.log(blocked);
    console.log("Loading in storage...");
    if (blocked) {
        //blocked websites exist
        blocked.forEach((website) => {
            console.log(website, " is blocked!");
            if (window.location.hostname.includes(website) && website !== "") {
                // Implement blocking logic
                console.log(`${website} is blocked, redirecting...`);
                blockWebsite(website);
            }
        });
    } else {
        chrome.storage.local.set({ "blockedWebsites": [] }, () => {
            console.log("Initialized storage!");
        });
    }

});

console.log("Content script is running on: ", window.location.href);

function blockWebsite(url) {
    if (window.location.href.includes(url)) {
        console.log("Redirecting!");
        setTimeout(() => {
            window.location.replace("https://www.outlook.com");
        }, 3000);
    }
}