import { hashPassword, comparePassword } from '../utils/crypto-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const redirectInput = document.getElementById('redirectUrl');
    const passwordInput = document.getElementById('passwordInput');
    const keywordInput = document.getElementById('keywordInput');
    const addKeywordButton = document.getElementById('addKeyword');
    const keywordList = document.getElementById('keywordList');
    const saveButton = document.getElementById('saveSettings');
    const statusMessage = document.getElementById('statusMessage');
    const strictModeToggle = document.getElementById('strictMode');

    let currentKeywords = [];

    // Load current settings
    chrome.storage.local.get(['redirectUrl', 'blockedKeywords'], (data) => {
        redirectInput.value = data.redirectUrl || 'https://outlook.com';
        // Don't pre-fill the password field for security reasons

        // Load and display keywords
        currentKeywords = data.blockedKeywords || [];
        displayKeywords();
    });

    function checkStrictMode() {
        //checks if strictMode is 
        let strictMode = false;
        chrome.storage.local.get(["strictMode"], (data) => {
            if (data.strictMode) {
                strictMode = !!data.strictMode;
            };
        });
        return strictMode;
    }

    // Function to display keywords in the UI
    function displayKeywords() {
        keywordList.innerHTML = '';
        currentKeywords.forEach(keyword => {
            const keywordElement = document.createElement('div');
            keywordElement.className = 'site-item';
            keywordElement.innerHTML = `${keyword}<button class="remove-btn" data-keyword="${keyword}">Remove</button>`;
            keywordList.appendChild(keywordElement);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const keywordToRemove = e.target.getAttribute('data-keyword');
                currentKeywords = currentKeywords.filter(k => k !== keywordToRemove);
                displayKeywords();
            });
        });
    }

    // Add keyword button handler
    addKeywordButton.addEventListener('click', () => {
        const keyword = keywordInput.value.trim().toLowerCase();
        if (keyword && !currentKeywords.includes(keyword)) {
            currentKeywords.push(keyword);
            keywordInput.value = '';
            displayKeywords();
        }
    });

    // Save all settings
    saveButton.addEventListener('click', () => {
        const newSettings = {
            redirectUrl: redirectInput.value,
            blockedKeywords: currentKeywords
        };

        // Only update password if a new one was entered
        if (passwordInput.value.trim() !== '') {
            //check if strict mode is active
            let strictMode = checkStrictMode();
            if (strictMode === true) {
                //send an error message
                statusMessage.textContent = "Cannot reset password in strict mode!";
                statusMessage.style.color = "red";
            } else {
                // Use Web Crypto API to hash the password
                hashPassword(passwordInput.value.trim())
                    .then(hash => {
                        // Store the hashed password
                        newSettings.hashedPassword = hash;

                        // Save settings with the hashed password
                        saveSettingsToStorage(newSettings);
                    })
                    .catch(err => {
                        console.error("Error hashing password:", err);
                        statusMessage.textContent = 'Error saving password!';
                        statusMessage.style.color = 'red';
                    });
            }

        } else {
            // No password change, just save other settings
            saveSettingsToStorage(newSettings);
        }
    });

    // Helper function to save settings to storage
    function saveSettingsToStorage(settings) {
        chrome.storage.local.set(settings, () => {
            statusMessage.textContent = 'Settings saved!';
            statusMessage.style.color = 'green';

            // Clear the password field after saving
            passwordInput.value = '';

            // Clear the status message after 3 seconds
            setTimeout(() => {
                statusMessage.textContent = '';
            }, 3000);
        });
    }

    // Load current strict mode setting
    chrome.storage.local.get(['strictMode'], (data) => {
        strictModeToggle.checked = !!data.strictMode;
    });

    // Update the strict mode toggle event listener to require password
    strictModeToggle.addEventListener('change', () => {
        if (strictModeToggle.checked) {
            // First show warning
            const confirmed = confirm(
                "Warning: Enabling Strict Mode will prevent disabling or removing this extension.\n\n" +
                "You will need to disable Strict Mode first if you want to remove the extension later.\n\n" +
                "Are you sure you want to enable Strict Mode?"
            );

            if (!confirmed) {
                strictModeToggle.checked = false;
                return;
            }

            // Check if password is set
            chrome.storage.local.get(['hashedPassword'], (data) => {
                if (!data.hashedPassword) {
                    // No password set, require one
                    alert("You must set a password before enabling Strict Mode. Please enter a password below and save settings.");
                    strictModeToggle.checked = false;
                    passwordInput.focus();
                    return;
                }

                // Password is set, save the strict mode setting
                chrome.storage.local.set({ strictMode: true }, () => {
                    statusMessage.textContent = 'Strict Mode enabled!';
                    statusMessage.style.color = 'green';
                    setTimeout(() => {
                        statusMessage.textContent = '';
                    }, 3000);
                });
            });
        } else {
            // Require password to disable strict mode
            const passwordPrompt = document.createElement('div');
            passwordPrompt.className = 'password-prompt';
            passwordPrompt.innerHTML = `
                <div class="password-modal">
                    <h3>Enter Password to Disable Strict Mode</h3>
                    <input type="password" id="strictModePassword" placeholder="Enter your password">
                    <div class="button-row">
                        <button id="cancelStrictModeDisable">Cancel</button>
                        <button id="confirmStrictModeDisable">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(passwordPrompt);

            // Handle cancel button
            document.getElementById('cancelStrictModeDisable').addEventListener('click', () => {
                strictModeToggle.checked = true; // Keep strict mode enabled
                passwordPrompt.remove();
            });

            // Handle confirm button
            document.getElementById('confirmStrictModeDisable').addEventListener('click', async() => {
                const password = document.getElementById('strictModePassword').value;

                // Verify password using Web Crypto API
                chrome.storage.local.get(['hashedPassword'], async(data) => {
                    if (data.hashedPassword) {
                        try {
                            const isMatch = await comparePassword(password, data.hashedPassword);

                            if (isMatch) {
                                // Password correct, disable strict mode
                                chrome.storage.local.set({ strictMode: false }, () => {
                                    statusMessage.textContent = 'Strict Mode disabled!';
                                    statusMessage.style.color = 'green';
                                    setTimeout(() => {
                                        statusMessage.textContent = '';
                                    }, 3000);
                                    passwordPrompt.remove();
                                });
                            } else {
                                // Password incorrect
                                alert("Incorrect password. Strict Mode remains enabled.");
                                strictModeToggle.checked = true;
                                passwordPrompt.remove();
                            }
                        } catch (err) {
                            console.error("Error comparing passwords:", err);
                            alert("An error occurred. Please try again.");
                            strictModeToggle.checked = true;
                            passwordPrompt.remove();
                        }
                    }
                });
            });
        }
    });
});