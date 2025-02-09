
function getURL(url) {
  //Given a url such as https://www.youtube.com, return youtube.com
  if(url.includes("https://") || url.includes("http://")) {
    [www, hostname,extension] = url.split(".");
    return [hostname,extension].join("");
  }
  else if(url.includes("www.")) {
    return url.replace("www.","");
  } else {
    return url;
  }
  
};
// Add new site
document.addEventListener('DOMContentLoaded', () => {
  const siteInput = document.getElementById('siteInput');
  const addButton = document.getElementById('addSite');
  const blockedList = document.getElementById('blockedList');

  addButton.addEventListener("click", (element) => {
    const siteURL = siteInput.value
    if(siteURL && !(document.querySelector(`div[data-site=${siteURL}]`))) {
      //website inputted
      try {
        const url = getURL(siteURL);
        console.log("Blocking ", url,"!");
        blockedList.innerHTML += `<div data-site='${url}' class='site-item'>${url}<button class='remove-btn'>Remove</button></div>`;
      }
      catch {
        window.alert("Please enter a valid url!");
      }
      //If the button adding was successful
      chrome.storage.local.get(["blockedWebsites"], function (result) {
        const websites = result["blockedWebsites"] || [];
        if(websites.length > 0) {
          websites.push(siteURL); //add blocked websites to array
          chrome.storage.local.set({"blockedWebsites":websites},() => {
            window.alert(`${siteURL} added to blockList!`);
            const removeBtns = document.querySelectorAll(".remove-btn");
            window.localStorage.setItem(siteURL,"true");
            removeBtns.forEach((removeBtn) => {
              removeBtn.addEventListener("click",removeSite);
            });
          });
        };
      });
    };
  });
});


function removeSite(element){
  //Callback function passed into remove-btn event listner to remove a website
  const parent = element.parentElement;
  console.log(parent);
  parent.remove(); //remove parent element
}

