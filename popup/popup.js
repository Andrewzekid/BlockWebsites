// const bcrypt = require("bcrypt");
const saltRounds = 10;
import { comparePassword } from '../utils/crypto-utils.js';

function getURL(url) {
    //Given a url such as https://www.youtube.com, return youtube.com
    if (url.includes("https://") || url.includes("http://")) {
        [www, hostname, extension] = url.split(".");
        return [hostname, extension].join("");
    } else if (url.includes("www.")) {
        return url.replace("www.", "");
    } else {
        return url;
    }
}

// Update getPassword function to only use hashedPassword
function getPassword(callback) {
    // This function now only checks if a password exists
    // It doesn't return the actual password since we only store hashes
    chrome.storage.local.get(['hashedPassword'], (data) => {
        // Return a boolean indicating if password protection is enabled
        const hasPassword = !!data.hashedPassword;
        callback(hasPassword);
    });
}

//elements
const blocklistContainer = document.querySelector(".container");
const modalElements = document.querySelectorAll(".modal");
const modalOverlay = document.querySelector(".modal-overlay");
const modalInput = document.querySelector(".modal-input");
const modalSubmit = document.querySelector(".modal-submit");
const modalClose = document.querySelector(".close-btn");
// Add new site
document.addEventListener('DOMContentLoaded', () => {
    const siteInput = document.getElementById('siteInput');
    const addButton = document.getElementById('addSite');
    const blockedList = document.getElementById('blockedList');
    //add all websites upon loading
    chrome.storage.local.get(["blockedWebsites"], function(result) {
        const entries = result["blockedWebsites"] || []; //get all websites which have been blocked 
        if (entries.length > 0) {
            //blockedWebsites exist
            entries.forEach((blockedURL) => {
                console.log(`Adding ${blockedURL} to UI!`);
                addSite(blockedURL);
            });
        };
    });

    addButton.addEventListener("click", (element) => {
        const siteURL = siteInput.value;
        addSite(siteURL);
        siteInput.value = "";
    });

    // Add a section for keywords in the popup HTML
    const keywordSection = document.createElement('div');
    keywordSection.innerHTML = `
        <h2>Blocked Keywords</h2>
        <input type="text" id="keywordInput" placeholder="Enter keyword (e.g., gambling)">
        <button id="addKeyword">Block Keyword</button>
        <div id="keywordList"></div>
    `;
    blocklistContainer.appendChild(keywordSection);

    const keywordInput = document.getElementById('keywordInput');
    const addKeywordButton = document.getElementById('addKeyword');
    const keywordList = document.getElementById('keywordList');

    // Load and display keywords
    chrome.storage.local.get(["blockedKeywords"], function(result) {
        const keywords = result["blockedKeywords"] || [];
        if (keywords.length > 0) {
            keywords.forEach((keyword) => {
                addKeywordToUI(keyword);
            });
        }
    });

    // Add keyword button handler
    addKeywordButton.addEventListener("click", () => {
        const keyword = keywordInput.value.trim().toLowerCase();
        if (keyword) {
            addKeywordToUI(keyword);
            keywordInput.value = "";

            // Save to storage
            chrome.storage.local.get(["blockedKeywords"], function(result) {
                const keywords = result["blockedKeywords"] || [];
                if (!keywords.includes(keyword)) {
                    keywords.push(keyword);
                    chrome.storage.local.set({ "blockedKeywords": keywords }, () => {
                        console.log(`Keyword "${keyword}" added to block list!`);
                    });
                }
            });
        }
    });

    function addKeywordToUI(keyword) {
        if (!document.querySelector(`div[data-keyword="${keyword}"]`)) {
            keywordList.innerHTML += `<div data-keyword='${keyword}' class='site-item'>${keyword}<button class='remove-keyword-btn'>Remove</button></div>`;

            // Add event listeners to new remove buttons
            const removeButtons = document.querySelectorAll('.remove-keyword-btn');
            removeButtons.forEach((btn) => {
                if (!btn.hasListener) {
                    btn.addEventListener("click", removeKeyword);
                    btn.hasListener = true;
                }
            });
        }
    }

    function removeKeyword(event) {
        const keywordElement = event.currentTarget.parentElement;
        const keyword = keywordElement.getAttribute("data-keyword");

        spawnBlockWindow().then(() => {
            keywordElement.remove();

            chrome.storage.local.get(["blockedKeywords"], function(result) {
                const keywords = result["blockedKeywords"] || [];
                const filteredKeywords = keywords.filter(k => k !== keyword);
                chrome.storage.local.set({ "blockedKeywords": filteredKeywords }, () => {
                    console.log(`Keyword "${keyword}" removed from block list!`);
                });
            });
        }).catch((error) => {
            console.log('Keyword removal cancelled:', error.message);
        });
    }

    // Add event listener for the options button
    const optionsButton = document.getElementById('openOptions');
    if (optionsButton) {
        optionsButton.addEventListener('click', () => {
            // Open the options page
            if (chrome.runtime.openOptionsPage) {
                // New way to open options pages, if supported (Chrome 42+)
                chrome.runtime.openOptionsPage();
            } else {
                // Fallback for older Chrome versions
                window.open(chrome.runtime.getURL('options/options.html'));
            }
        });
    }
});

// Update the requirePassword function
function requirePassword() {
    let allowed = false;
    console.log("Initializing password verification!");

    modalSubmit.addEventListener("click", (event) => {
        verifyPassword(modalInput.value.trim())
            .then(isCorrect => {
                if (isCorrect) {
                    //authentication passed
                    allowed = true;
                    //hide modal
                    modalElements.forEach((element) => {
                        element.classList.add("hidden");
                    });
                    document.body.classList.remove("blur");
                    throw new Error("Checkpoint 2: Password correct, modal hidden");
                } else {
                    console.error("PASSWORD INCORRECT");
                }
            })
            .catch(error => {
                console.error("Password verification error:", error);
            });
    });

    return allowed;
}

function addSite(siteURL) {
    if (siteURL && !(document.querySelector(`div[data-site="${siteURL}"]`))) {
        //website inputted
        try {
            const url = getURL(siteURL);
            console.log("Blocking ", url, "!");
            blockedList.innerHTML += `<div data-site='${url}' class='site-item'>${url}<button class='remove-btn'>Remove</button></div>`;
        } catch (error) {
            console.error(error);
            window.alert("Please enter a valid url!");
        }

        //If the button adding was successful
        chrome.storage.local.get(["blockedWebsites"], function(result) {
            const websites = result["blockedWebsites"] || ["example.com"];
            //not duplicate website
            console.log(`Addsite function: ${siteURL}, websites: ${websites}`);
            if (!(websites.includes(siteURL))) {
                //website is not duplicated
                websites.push(siteURL); //add blocked websites to array
                chrome.storage.local.set({ "blockedWebsites": websites }, () => {
                    // window.alert(`${siteURL} added to blockList!`);

                });
            };
            const removeBtns = document.querySelectorAll(".remove-btn"); //
            removeBtns.forEach((removeBtn) => {
                removeBtn.addEventListener("click", removeSite);
            }); //add remove buttons for each website
        });
    };
};

// Update spawnBlockWindow function
function spawnBlockWindow() {
    return new Promise((resolve, reject) => {
        //check if password protection is enabled
        getPassword((hasPassword) => {
            //if no password protection, then don't block
            if (!hasPassword) {
                resolve(); //don't block
            } else {
                // Show the modal
                modalOverlay.classList.remove("hidden");
                blocklistContainer.classList.add("blur");
                console.log("Password enter window blocked!");

                // Cleanup function to remove listeners and reset UI
                const cleanup = () => {
                    modalSubmit.removeEventListener('click', onSubmit);
                    modalClose.removeEventListener('click', onClose);
                    modalOverlay.classList.add("hidden");
                    blocklistContainer.classList.remove("blur");
                    modalInput.value = ""; // Clear input field
                };

                // Password submission handler
                const onSubmit = () => {
                    verifyPassword(modalInput.value.trim())
                        .then(isCorrect => {
                            if (isCorrect) {
                                cleanup();
                                resolve(event); // Correct password
                            } else {
                                alert('Incorrect password!'); // Optional error feedback
                            }
                        })
                        .catch(error => {
                            console.error("Password verification error:", error);
                            alert('An error occurred during password verification');
                        });
                };

                // Add event listeners
                modalSubmit.addEventListener('click', onSubmit);
                modalClose.addEventListener('click', onClose);

                // Close button handler
                function onClose() {
                    cleanup();
                    reject(new Error('Password entry cancelled'));
                }
            }
        });
    });
}

// Update removeSite to use the promise
function removeSite(event) {
    const blockedSite = event.currentTarget.parentElement.getAttribute("data-site");
    const parent = event.currentTarget.parentElement;
    console.log(`Outer loop event target parent element: ${parent} site: ${blockedSite}`);
    spawnBlockWindow().then(() => {
        if (parent) {
            parent.remove();
            console.log(`Attempting to remove ${blockedSite}`);
            chrome.storage.local.get(["blockedWebsites"], function(result) {
                const websites = result["blockedWebsites"] || [];
                let filteredWebsites = websites.filter((element) => {
                    return !element.includes(blockedSite);
                });
                chrome.storage.local.set({ "blockedWebsites": filteredWebsites }, () => {
                    console.log(`${blockedSite} removed from blockList!`);
                });
            });
        }
    }).catch((error) => {
        console.log('Removal cancelled:', error.message);
    });
}

// Remove the original modalClose event listener to prevent conflicts
// modalClose.removeEventListener("click", originalCloseHandler); // If reference exists
// Or comment out the original modalClose listener in the code

// Update verifyPassword function
function verifyPassword(inputPassword) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['hashedPassword'], async(data) => {
            try {
                // Check if we have a hashed password
                if (data.hashedPassword) {
                    // Use Web Crypto API to compare
                    const isMatch = await comparePassword(inputPassword, data.hashedPassword);
                    resolve(isMatch);
                } else {
                    // No password set
                    resolve(inputPassword === "");
                }
            } catch (err) {
                console.error("Error comparing passwords:", err);
                reject(err);
            }
        });
    });
}

function checkStrictModeStatus(callback) {
    chrome.storage.local.get(['strictMode'], (data) => {
        callback(!!data.strictMode);
    });
}

// Modify the openOptions event listener to check for strict mode
document.getElementById('openOptions').addEventListener('click', () => {
    checkStrictModeStatus((isStrictModeEnabled) => {
        if (isStrictModeEnabled) {
            // If strict mode is enabled, require password verification
            spawnBlockWindow().then(() => {
                // Password verified, open options page
                if (chrome.runtime.openOptionsPage) {
                    chrome.runtime.openOptionsPage();
                } else {
                    window.open(chrome.runtime.getURL('options/options.html'));
                }
            }).catch((error) => {
                console.log('Options page access cancelled:', error.message);
            });
        } else {
            // No strict mode, open options directly
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options/options.html'));
            }
        }
    });
});