document.addEventListener("DOMContentLoaded", () => {
    const settingsButton = document.getElementById('settings-button');
    const settingsDropdown = document.getElementById('settings-dropdown');

    // Toggle dropdown visibility on settings button click
    settingsButton.addEventListener('click', () => {
        settingsDropdown.classList.toggle('show');
    });

    // Close the dropdown if clicked outside of it
    document.addEventListener('click', (event) => {
        if (!settingsButton.contains(event.target) && !settingsDropdown.contains(event.target)) {
            settingsDropdown.classList.remove('show');
        }
    });
});
