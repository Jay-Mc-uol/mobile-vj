import { addAudioSource } from './main.js';

document.addEventListener("DOMContentLoaded", () => {
    for (let i = 1; i <= 4; i++) {
        const fileInput = document.getElementById(`audio-input-${i}`);
        const fileUploadBtn = document.querySelector(`img[data-target="audio-input-${i}"]`);
        const playButton = document.getElementById(`audio-play-${i}`);
        const pauseButton = document.getElementById(`audio-stop-${i}`);
        const ejectButton = document.getElementById(`audio-eject-${i}`);

        let audio = new Audio();

        // Click image to open file selector
        fileUploadBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', function () {
            let fileNameDisplay = document.getElementById(`audio-file-name-${this.id.split('-').pop()}`);
            if (this.files.length > 0) {
                fileNameDisplay.textContent = this.files[0].name;
            } else {
                fileNameDisplay.textContent = "No file selected";
            }
        });

        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                const objectURL = URL.createObjectURL(file);
                audio.src = objectURL;
                addAudioSource(audio);
            }
        });

        playButton.addEventListener("click", () => audio.play());
        pauseButton.addEventListener("click", () => audio.pause());

        ejectButton.addEventListener("click", () => {
            audio.pause();
            audio.src = "";
            fileInput.value = "";
            
            // Reset the displayed file name to "No file selected"
            let fileNameDisplay = document.getElementById(`audio-file-name-${i}`);
            fileNameDisplay.textContent = "No file selected";
        });
    }
});
