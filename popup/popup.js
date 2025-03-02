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
const PASSWORD = "LETMEIN96";
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
    //fetch required modal elements
    const modalElements = document.querySelectorAll(".modal");
    const modalOverlay = document.querySelector(".modal-overlay");
    const modalInput = document.querySelector(".modal-input");
    const modalSubmit = document.querySelector(".modal-submit");

    document.body.classList.add("blur"); // add blur effect to body 

    //make modal elements visible
    modalElements.forEach((element) => {
        console.log(element);
        element.classList.remove("hidden");
    });

    let allowed = false;
    console.log("Initializing password verificaiton!");
    modalSubmit.addEventListener("click", (event) => {
        if (modalInput.value.trim() === PASSWORD) {
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
    });
    return allowed;
}

function removeSite(event) {
    //Callback function passed into remove-btn event listner to remove a website
    const allowed = requirePassword();
    const parent = event.currentTarget.parentElement;
    if (allowed) {

        let blockedSite = parent.getAttribute("data-site");
        parent.remove();
        console.log(`Attempting to remove ${blockedSite}`)
        chrome.storage.local.get(["blockedWebsites"], function(result) {
            const websites = result["blockedWebsites"] || [];
            let filteredWebsites = websites.filter((element) => {
                return !(element.includes(blockedSite));
            }); //filter list so all site names containing blockedSite are 
            chrome.storage.local.set({ "blockedWebsites": filteredWebsites }, () => {
                console.log(`${blockedSite} removed from blockList!`);
            })
        });
    } else {
        window.alert("Password is incorrect!");
    }
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