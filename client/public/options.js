// Saves options to chrome.storage
const saveOptions = () => {
    const region = document.getElementById('region').value;
    const quickAccessButtonOn = document.getElementById('quickAccessButtonOn').value;
    const overridingPhoneNumberFormat = document.getElementById('overridingPhoneNumberFormat').value;

    chrome.storage.local.set(
        { selectedRegion: region, quickAccessButtonOn, overridingPhoneNumberFormat },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.local.get(
        { selectedRegion: 'US', quickAccessButtonOn: 'ON', overridingPhoneNumberFormat: '' },
        (items) => {
            document.getElementById('region').value = items.selectedRegion;
            document.getElementById('quickAccessButtonOn').value = items.quickAccessButtonOn;
            document.getElementById('overridingPhoneNumberFormat').value = items.overridingPhoneNumberFormat;
        }
    );
};
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);