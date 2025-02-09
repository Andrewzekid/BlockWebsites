document.addEventListener('DOMContentLoaded', () => {
  const redirectInput = document.getElementById('redirectUrl');
  const saveButton = document.getElementById('saveSettings');

  // Load current settings
  chrome.storage.local.get('redirectUrl', (data) => {
    redirectInput.value = data.redirectUrl || 'https://outlook.com';
  });

  // Save new settings
  saveButton.addEventListener('click', () => {
    chrome.storage.local.set({ redirectUrl: redirectInput.value }, () => {
      alert('Settings saved!');
    });
  });
});