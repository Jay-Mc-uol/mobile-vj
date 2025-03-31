const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const sourceCanvas = window.opener?.document.getElementById('canvas'); // your visualizer canvas
const sourceVideo = window.opener?.document.getElementById('video-preview'); // your camera/video

let displayMode = 'visualizer';

window.addEventListener('message', (event) => {
    const { type, data } = event.data;

    if (type === 'switch-mode') {
        displayMode = data;
        canvas.style.display = displayMode === 'visualizer' ? 'block' : 'none';
    }
});

// Draw loop using shared DOM
function drawLoop() {
    if (displayMode === 'visualizer' && sourceCanvas) {
        ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    }

    if (displayMode === 'video' && sourceVideo && sourceVideo.readyState >= 2) {
        ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(drawLoop);
}
drawLoop();
