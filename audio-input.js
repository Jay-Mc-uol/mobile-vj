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
        });
    }
});
