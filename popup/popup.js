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

};
//constants
const PASSWORD = "LETMEIN96";

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
        const entries = result["blockedWebsites"]; //get all websites which have been blocked 
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
});
function requirePassword() {
    let allowed = false;
    modalSubmit.addEventListener("click", (event) => {
        if(modalInput.value.trim() === PASSWORD) {
            //authentication passed
            allowed = true;
            //hide modal
            modalElements.forEach((element) => {
                element.classList.add("hidden");
            });
        }
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
        } catch {
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

function spawnBlockWindow() {
    return new Promise((resolve, reject) => {
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
            if (modalInput.value.trim() === PASSWORD) {
                cleanup();
                resolve(event); // Correct password
            } else {
                alert('Incorrect password!'); // Optional error feedback
            }
        };

        // Modal close handler
        const onClose = () => {
            cleanup();
            reject(new Error('Modal closed without password')); // Reject on close
        };

        // Attach event listeners
        modalSubmit.addEventListener('click', onSubmit);
        modalClose.addEventListener('click', onClose);
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