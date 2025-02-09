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
// Add new site
document.addEventListener('DOMContentLoaded', () => {
    const siteInput = document.getElementById('siteInput');
    const addButton = document.getElementById('addSite');
    const blockedList = document.getElementById('blockedList');
    //add all websites upon loading
    chrome.storage.local.get(["blockedWebsites"], function(result) {
        if (result.length > 0) {
            //blockedWebsites exist
            result.forEach((blockedURL) => {
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


function removeSite(event) {
    //Callback function passed into remove-btn event listner to remove a website
    const parent = event.currentTarget.parentElement;
    if (parent) {
        let blockedSite = parent.getAttribute("data-site");
        parent.remove();
        console.log(`Attempting to remove ${blockedSite}`)
        chrome.storage.local.get(["blockedWebsites"], function(result) {
            const websites = result["blockedWebsites"] || [];
            let filteredWebsites = websites.filter((element) => { element.includes(blockedSite) ? false : true }); //filter list so all site names containing blockedSite are 
            chrome.storage.local.set({ "blockedWebsites": filteredWebsites }, () => {
                console.log(`${blockedSite} removed from blockList!`);
            })
        });
    } else {
        throw new Error("Parent element is undefined!");
    }
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
            if (!(websites.includes(siteURL))) {
                //website is not duplicated
                websites.push(siteURL); //add blocked websites to array
                chrome.storage.local.set({ "blockedWebsites": websites }, () => {
                    window.alert(`${siteURL} added to blockList!`);
                    const removeBtns = document.querySelectorAll(".remove-btn");
                    window.localStorage.setItem(siteURL, "true");
                    removeBtns.forEach((removeBtn) => {
                        removeBtn.addEventListener("click", removeSite);
                    });
                });
            };
        });
    };
};