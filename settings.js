document.addEventListener("DOMContentLoaded", () => {
    const settingsButton = document.getElementById('settings-button');
    const settingsDropdown = document.getElementById('settings-dropdown');

    // Toggle dropdown visibility on settings button click
    settingsButton.addEventListener('click', () => {
        settingsDropdown.classList.toggle('show');
    });

    // Theme Preset Selection
    const themes = {
        default: "default-theme",
        light: "light-theme",
        inverse: "inverse-theme",
        red: "red-theme",
        blue: "blue-theme",
        green: "green-theme"
    };


    // Add event listeners for theme selection
    document.getElementById("default-theme").addEventListener("click", () => {
        switchTheme("default-theme", ["light-theme", "inverse-theme", "red-theme", "blue-theme", "green-theme"]);
    });
    
    document.getElementById("light-theme").addEventListener("click", () => {
        switchTheme("light-theme", ["default-theme", "inverse-theme", "red-theme", "blue-theme", "green-theme"]);
    });
    
    document.getElementById("inverse-theme").addEventListener("click", () => {
        switchTheme("inverse-theme", ["default-theme", "light-theme", "red-theme", "blue-theme", "green-theme"]);
    });
    
    document.getElementById("red-theme").addEventListener("click", () => {
        switchTheme("red-theme", ["default-theme", "light-theme", "inverse-theme", "blue-theme", "green-theme"]);
    });
    
    document.getElementById("blue-theme").addEventListener("click", () => {
        switchTheme("blue-theme", ["default-theme", "light-theme", "inverse-theme", "red-theme", "green-theme"]);
    });
    
    document.getElementById("green-theme").addEventListener("click", () => {
        switchTheme("green-theme", ["default-theme", "light-theme", "inverse-theme", "red-theme", "blue-theme"]);
    });
    
    // Function to switch themes
    function switchTheme(themeToAdd, themesToRemove) {
    // Remove the specified themes
        themesToRemove.forEach(theme => {
            document.body.classList.remove(theme);
        });
        
        // Reset custom styles (for background color, text color, button color)
        resetCustomStyles();

        // Add the new theme
        document.body.classList.add(themeToAdd);
    }    

    // Custom Theme Option (Color Wheel for User Customization)
    document.getElementById("custom-theme").addEventListener("click", () => {
        // Show color picker modal or options
        showColorPickerModal();
    });


    // Function to reset custom styles when switching themes
    function resetCustomStyles() {
        // Reset custom background color, text color, and button styles if they were applied
        document.body.style.backgroundColor = "";
        document.body.style.color = "";
        const buttons = document.querySelectorAll("button");
        buttons.forEach(button => {
            button.style.backgroundColor = "";
        });
    }

    // Close the dropdown if clicked outside of it
    document.addEventListener('click', (event) => {
        if (!settingsButton.contains(event.target) && !settingsDropdown.contains(event.target)) {
            settingsDropdown.classList.remove('show');
        }
    });
});


// Show a modal with color pickers for custom theme selection
function showColorPickerModal() {
    const modal = document.createElement('div');
    modal.id = "color-picker-modal";
    modal.innerHTML = `
        <div class="color-picker-modal-content">
            <h3>Customize Your Theme</h3>
            <label for="theme-name">Theme Name:</label>
            <input type="text" id="theme-name" name="theme-name" placeholder="Enter theme name" required>
            
            <label for="background-color">Background Color:</label>
            <input type="color" id="background-color" name="background-color" value="#333333">
            
            <label for="text-color">Text Color:</label>
            <input type="color" id="text-color" name="text-color" value="#ffffff">
            
            <label for="button-color">Button Color:</label>
            <input type="color" id="button-color" name="button-color" value="#444444">

            <button id="save-custom-theme">Save Custom Theme</button>
            <button id="cancel-custom-theme">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Close the modal if "Cancel" is clicked
    document.getElementById("cancel-custom-theme").addEventListener("click", () => {
        modal.remove();
    });

    // Save custom theme settings with a name
    document.getElementById("save-custom-theme").addEventListener("click", () => {
        const themeName = document.getElementById("theme-name").value.trim();
        const bgColor = document.getElementById("background-color").value;
        const textColor = document.getElementById("text-color").value;
        const buttonColor = document.getElementById("button-color").value;

        if (!themeName) {
            alert("Please enter a name for your custom theme.");
            return;
        }

        // Apply custom colors to the body and buttons
        document.body.style.backgroundColor = bgColor;
        document.body.style.color = textColor;

        const buttons = document.querySelectorAll("button");
        buttons.forEach(button => {
            button.style.backgroundColor = buttonColor;
        });

        // Save the custom theme in localStorage or elsewhere
        const customTheme = { themeName, bgColor, textColor, buttonColor };
        localStorage.setItem(themeName, JSON.stringify(customTheme));

        // Add the custom theme to the list of available themes
        addCustomThemeToPresetList(customTheme);

        modal.remove();
    });
}

// Add the custom theme to the preset list
function addCustomThemeToPresetList(customTheme) {
    const customThemeOption = document.createElement("li");
    customThemeOption.innerHTML = `<a href="#">${customTheme.themeName}</a>`;
    document.querySelector(".theme-presets-dropdown").appendChild(customThemeOption);

    customThemeOption.addEventListener("click", () => {
        document.body.style.backgroundColor = customTheme.bgColor;
        document.body.style.color = customTheme.textColor;

        const buttons = document.querySelectorAll("button");
        buttons.forEach(button => {
            button.style.backgroundColor = customTheme.buttonColor;
        });
    });
}