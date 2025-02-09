chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url?.startsWith("http")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: printTabUrl,
      }).catch(error => console.log("Injection failed:", error));
    }
  });
});

const keyToCheck = "blockedWebsites";
let firstTime = false; // Use "let" instead of "const"

chrome.storage.local.get([keyToCheck], function(result) {
  if (result[keyToCheck] !== undefined) {
    console.log("blockedWebsites exist!");
  } else {
    firstTime = true;
    console.log("Blocked websites don't exist");
    chrome.storage.local.set({ blockedWebsites: ["youtube.com"] }, () => {
      console.log("Configured storage!");
    });
  }
});

function printTabUrl() {
  console.log("Current Tab URL: ", window.location.href);
}