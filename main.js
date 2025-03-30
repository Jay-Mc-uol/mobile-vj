import * as Tone from 'tone';
import Meyda from 'meyda';
import { initPatchingSystem, createNode } from './patching-system.js';

// Get UI elements
const audioInput = document.getElementById('audio-input');
const videoInput = document.getElementById('video-input');
const videoPreview = document.getElementById('video-preview');
const audioPlayButton = document.getElementById('audio-play');
const audioPauseButton = document.getElementById('audio-stop');
const audioEjectButton = document.getElementById('audio-eject');
const cameraStartBtn = document.getElementById('camera-start');
const cameraStopBtn = document.getElementById('camera-stop');
const micStartBtn = document.getElementById('mic-start');
const micStopBtn = document.getElementById('mic-stop');
const addAudioNodeBtn = document.getElementById('add-audio-node');
const addVideoNodeBtn = document.getElementById('add-video-node');

// Visualizer Canvas
const visualizerModeSelect = document.getElementById('visualizer-mode');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');

let currentVisualizerMode = 'amplitude'; // Default mode
// Audio setup
let audioElement = null;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioSource = null;
let cameraStream = null;
let micStream = null;
let micSource = null;
let analyser = audioContext.createAnalyser();
analyser.fftSize = 256; // Number of frequency bins
let dataArray = new Uint8Array(analyser.frequencyBinCount);

// Initialize patching system
initPatchingSystem();

//put in separate file
// Open visualizer in a new window (separate window for projector)
document.getElementById('open-visualizer-window').addEventListener('click', () => {
    const visualizerWindow = window.open('', 'Visualizer', 'width=800,height=600');
    visualizerWindow.document.write(`
        <html>
        <head>
            <title>Visualizer</title>
            <link rel="stylesheet" href="/styles.css">
            <script src="https://d3js.org/d3.v6.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsPlumb/2.15.6/js/jsplumb.min.js"></script>
        </head>
        <body>
            <h2>Visualizer</h2>
            <video id="video-preview" autoplay muted></video>
            <div>
                <h3>Visualizer Mode</h3>
                <label for="visualizer-mode">Select Visualization:</label>
                <select id="visualizer-mode">
                    <option value="amplitude">Amplitude Bar Graph</option>
                    <option value="psychedelic">Flower</option>
                    <option value="waveform">Waveform</option>
                    <option value="random">Random</option>
                </select>
            </div>
            <canvas id="canvas"></canvas>
            <script type="module" src="/visualizer.js"></script>
        </body>
        </html>
    `);
});

// Open control panel in a new window (separate for users operating the app)
document.getElementById('open-control-panel-window').addEventListener('click', () => {
    const controlPanelWindow = window.open('', 'Control Panel', 'width=400,height=600');
    controlPanelWindow.document.write(`
        <html>
        <head>
            <title>Control Panel</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <h2>Control Panel</h2>
            <div>
                <h3>Load Media</h3>
                <label for="audio-input">Audio File:</label>
                <input type="file" id="audio-input" accept="audio/*">
                <button id="audio-play">Play</button>
                <button id="audio-stop">Pause</button>
                <button id="audio-eject">Eject</button>
                <br>
                <label for="video-input">Video File:</label>
                <input type="file" id="video-input" accept="video/*">
            </div>
            <div>
                <h3>Live Input</h3>
                <button id="camera-start">Start Camera</button>
                <button id="camera-stop">Stop Camera</button>
                <br>
                <button id="mic-start">Start Mic</button>
                <button id="mic-stop">Stop Mic</button>
            </div>
            <script type="module" src="/main.js"></script>
        </body>
        </html>
    `);
});

// ---------------------- AUDIO FILE LOADING ----------------------
audioInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (audioElement) {
            audioElement.pause();
        }

        audioElement = new Audio(URL.createObjectURL(file));
        audioElement.crossOrigin = 'anonymous';

        // Ensure AudioContext is running
        audioContext.resume().then(() => {
            if (audioSource) {
                audioSource.disconnect();
            }
            audioSource = audioContext.createMediaElementSource(audioElement);
            // Connect the source to the destination (speakers)
            audioSource.connect(audioContext.destination);    
            audioSource.connect(analyser);
            analyser.connect(audioContext.destination);
            const analyzer = Meyda.createMeydaAnalyzer({
                audioContext,
                source: audioSource,
                featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
                callback: (features) => {
                    drawVisualizer(features.amplitudeSpectrum, features.buffer);
                },
            })
            analyzer.start();
        });
        
        console.log("Audio file loaded:", file.name);
    }
});

audioPlayButton.addEventListener('click', () => {
    if (audioElement) {
        audioContext.resume().then(() => {
            audioElement.play();
            requestAnimationFrame(drawVisualizer); // Start visualizer when audio plays
            console.log("Audio playing");
        });
    }
});

audioPauseButton.addEventListener('click', () => {
    if (audioElement) {
        audioElement.pause();
        console.log("Audio paused");
    }
});

audioEjectButton.addEventListener('click', () => {
    if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
        audioElement.load();
        audioElement = null;
        console.log("Audio ejected");
    }
});

// ---------------------- VIDEO ----------------------
videoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        videoPreview.src = URL.createObjectURL(file);
        console.log("Video file loaded:", file.name);
    }
});

// ---------------------- MICROPHONE ----------------------
micStartBtn.addEventListener('click', async () => {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext.resume().then(() => {
            micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(analyser);
            analyser.connect(audioContext.destination);
            requestAnimationFrame(drawVisualizer); // Start visualizer when mic is active
        // Create Meyda analyzer for microphone input
        const analyzer = Meyda.createMeydaAnalyzer({
            audioContext,
            source: micSource,
            featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
            callback: (features) => {
                drawVisualizer(features.amplitudeSpectrum, features.buffer);
            },
        });
        analyzer.start();

            console.log("Microphone started");
        });

    } catch (err) {
        console.error('Error accessing microphone:', err);
    }
});

micStopBtn.addEventListener('click', () => {
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
        console.log("Microphone stopped");
    }
});

// ---------------------- CAMERA ----------------------
cameraStartBtn.addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoPreview.srcObject = cameraStream;
        videoPreview.play();
        console.log("Camera started");
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
});

cameraStopBtn.addEventListener('click', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        videoPreview.srcObject = null;
        cameraStream = null;
        console.log("Camera stopped");
    }
});

// ---------------------- NODE CREATION ----------------------
addAudioNodeBtn.addEventListener('click', () => createNode('audio'));
addVideoNodeBtn.addEventListener('click', () => createNode('video'));

// ---------------------- VISUALIZER ----------------------
// Event listener for dropdown menu
visualizerModeSelect.addEventListener('change', (event) => {
    currentVisualizerMode = event.target.value; // Update mode
});

function drawVisualizer(amplitudeSpectrum, waveform) {
    switch (currentVisualizerMode) {
        case 'amplitude':
            drawAmplitudeBarGraph(amplitudeSpectrum);
            break;
        case 'psychedelic':
            drawPsychedelicPatterns(amplitudeSpectrum, waveform.rms || 0);
            break;
        case 'waveform':
            drawWaveform(waveform);
            break;
        case 'random':
            drawRandomSquiggles(amplitudeSpectrum);
            break;
        default:
            console.warn('Unknown visualizer mode:', currentVisualizerMode);
            break;
    }
}


function drawAmplitudeBarGraph(amplitudeSpectrum) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(dataArray);
    let barWidth = canvas.width / dataArray.length;
    
    dataArray.forEach((value, i) => {
        let barHeight = value / 2;
        let x = i * barWidth;
        let hue = (i * 10) % 360;
        
        canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    });

    if (audioElement && !audioElement.paused || micStream) {
        requestAnimationFrame(drawVisualizer);
    }
}

function drawPsychedelicPatterns(amplitudeSpectrum, rms) {
    // Debugging: Log RMS and amplitude spectrum
    console.log('RMS:', rms, 'Amplitude Spectrum:', amplitudeSpectrum);


    // Fade the canvas for smooth transitions
    canvasCtx.fillStyle = `rgba(0, 0, 0, 0.1)`; // Semi-transparent black
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    // Scale patterns by RMS
    const scale = Math.max(rms * 300, 50); // Avoid zero scaling
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;


    // Scale patterns by RMS
    //const scale = rms * 300; // Adjust scaling factor for responsiveness
    //const centerX = canvas.width / 2;
    //const centerY = canvas.height / 2;


    // Draw concentric circles based on the amplitude spectrum
    amplitudeSpectrum.forEach((amp, i) => {
        if (amp > 0.001) { // Avoid very small values
            const radius = scale * Math.max(amp * 2, 0.1); // Ensure a minimum size
            const hue = (i * 10 + Date.now() / 50) % 360; // Dynamic colors


            canvasCtx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            canvasCtx.lineWidth = Math.max(amp * 5, 1); // Ensure a minimum line width
            canvasCtx.beginPath();
            canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            canvasCtx.stroke();
        }
    });


    // amplitudeSpectrum.forEach((amp, i) => {
        // const radius = scale * (amp * 2); // Scale radius by amplitude
        // const hue = (i * 10 + Date.now() / 50) % 360; // Dynamic colors


        // canvasCtx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        // canvasCtx.lineWidth = amp * 5; // Line thickness changes with amplitude
        // canvasCtx.beginPath();
        // canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        // canvasCtx.stroke();
    // });


    // Fade out completely if there is no sound
    if (rms < 0.01) {
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Stronger fade for silence
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


function computeRMS(waveform) {
    return Math.sqrt(waveform.reduce((sum, val) => sum + val ** 2, 0) / waveform.length);
}


// Function to draw waveform visualization
function drawWaveform(waveform) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);


    canvasCtx.beginPath();
    canvasCtx.strokeStyle = 'cyan';
    canvasCtx.lineWidth = 2;


    const sliceWidth = canvas.width / waveform.length;
    let x = 0;


    waveform.forEach((point, i) => {
        const y = canvas.height / 2 + point * canvas.height / 2;
        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    });


    canvasCtx.stroke();
}

function drawRandomSquiggles(amplitudeSpectrum) {
    // Fade the canvas for smooth transitions
    canvasCtx.fillStyle = `rgba(0, 0, 0, 0.1)`; // Semi-transparent black
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);


    // Use amplitude spectrum to generate shapes
    amplitudeSpectrum.forEach((amp, i) => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = amp * 50; // Shape size depends on amplitude
        const hue = (i * 20 + Date.now() / 100) % 360;


        canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        canvasCtx.beginPath();


        // Randomly choose shape type
        if (Math.random() > 0.5) {
            // Draw circles
            canvasCtx.arc(x, y, size, 0, Math.PI * 2);
        } else {
            // Draw rectangles
            canvasCtx.rect(x - size / 2, y - size / 2, size, size);
        }
        canvasCtx.fill();
    });


    // Fade out completely if there is no sound
    const rms = Math.sqrt(amplitudeSpectrum.reduce((sum, amp) => sum + amp ** 2, 0) / amplitudeSpectrum.length);
    if (rms < 0.01) {
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Stronger fade for silence
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
