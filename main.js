import * as Tone from 'tone';
import Meyda from 'meyda';
import { initPatchingSystem, createNode, savePatch, loadPatch, downloadPatchAsFile, loadPatchFromFile} from './patching-system.js';

// Get UI elements
const videoInput = document.getElementById('video-input');
const videoPreview = document.getElementById('video-preview');
const cameraStartBtn = document.getElementById('camera-start');
const cameraStopBtn = document.getElementById('camera-stop');
const micStartBtn = document.getElementById('mic-start');
const micStopBtn = document.getElementById('mic-stop');
const addAudioNodeBtn = document.getElementById('add-audio-node');
const addVideoNodeBtn = document.getElementById('add-video-node');
const addAudioProcessorNodeBtn = document.getElementById('add-audio-processor-node');
const addAudioGeneratorNodeBtn = document.getElementById('add-audio-generator-node');
const addMicNodeBtn = document.getElementById('add-mic-node');
const addVisualizerNodeBtn = document.getElementById('add-visualizer-node');

// Visualizer Canvas
const visualizerModeSelect = document.getElementById('visualizer-mode');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');

let currentVisualizerMode = 'amplitude'; // Default mode
// Audio setup
let audioElement = null;
export const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioSource = null;
let cameraStream = null;
let micStream = null;
let micSource = null;
export const analyser = audioContext.createAnalyser();
analyser.fftSize = 256; // Number of frequency bins
let dataArray = new Uint8Array(analyser.frequencyBinCount);

let audioSources = []; // Stores MediaElementAudioSourceNodes for each loaded audio
let analyzers = []; // Meyda analyzers for each audio source

let externalVisualizer = null;

// Ensure AudioContext is running
document.addEventListener("click", () => {
    if (audioContext.state !== "running") {
        audioContext.resume();
    }
});

// Initialize patching system
initPatchingSystem();

// Mic Node Visualizer tie in
window.addEventListener('visualizer-data', (e) => {
    const { amplitudeSpectrum, waveform } = e.detail;
    drawVisualizer(amplitudeSpectrum, waveform);
});

//Projector Canvas Mirroring
document.getElementById("open-visualizer-window").addEventListener("click", () => {
    externalVisualizer = window.open("visualizer.html", "Visualizer", "width=800,height=600");

    // Once loaded, pass current canvas
    setTimeout(() => {
        if (externalVisualizer) {
            externalVisualizer.postMessage({
                type: 'mirror-canvas',
                data: document.getElementById('canvas')
            }, '*');
        }
    }, 1000);
});

//put in separate file

document.getElementById("open-control-panel-window").addEventListener("click", () => {
    window.open("control-panel.html", "ControlPanel", "width=400,height=600");
});

// ---------------------- GET AUDIO FROM audio-input.js ----------------------
export function addAudioSource(audioElement) {
    if (!audioElement) return;

    audioContext.resume().then(() => {
        let audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(audioContext.destination);
        audioSource.connect(analyser); // Connect to global analyzer
        audioSources.push(audioSource);

        // Meyda Analyzer for each audio
        const analyzer = Meyda.createMeydaAnalyzer({
            audioContext,
            source: audioSource,
            featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
            callback: (features) => {
                drawVisualizer(features.amplitudeSpectrum, features.buffer);
            },
        });

        analyzers.push(analyzer);
        analyzer.start();
    });
}

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

// ---------------------- NODE CREATION ----------------------
document.addEventListener('DOMContentLoaded', () => {
    // All node button event listeners here
    document.getElementById('add-audio-node').addEventListener('click', () => createNode('audio'));
    document.getElementById('add-audio-processor-node').addEventListener('click', () => createNode('audio-processor'));
    document.getElementById('add-audio-generator-node').addEventListener('click', () => createNode('audio-generator'));
    document.getElementById('add-mic-node').addEventListener('click', () => createNode('microphone'));
    document.getElementById('add-speaker-node').addEventListener('click', () => createNode('speaker'));
    document.getElementById('add-camera-node').addEventListener('click', () => createNode('camera'));
    document.getElementById('add-video-node').addEventListener('click', () => createNode('video'));
    document.getElementById('add-visual-effect-node').addEventListener('click', () => createNode('visual-effect'));
    document.getElementById('add-video-visualizer-node').addEventListener('click', () => createNode('video-visualizer'));
    document.getElementById('add-visualizer-node').addEventListener('click', () => createNode('visualizer'));
});


// ---------------------- PATCH RETENTION ----------------------
document.getElementById('save-patch-btn').addEventListener('click', () => {
    savePatch();
});

document.getElementById('load-patch-btn').addEventListener('click', () => {
    loadPatch();
});

document.getElementById('clear-patch-btn').addEventListener('click', () => {
    const canvas = document.getElementById('patching-canvas');
    canvas.innerHTML = '';
    jsPlumb.getInstance().deleteEveryEndpoint();
    console.log("Cleared patching canvas.");
});

document.getElementById('download-patch-btn').addEventListener('click', () => {
    downloadPatchAsFile();
});

document.getElementById('upload-patch-btn').addEventListener('click', () => {
    document.getElementById('upload-patch-input').click();
});

document.getElementById('upload-patch-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            loadPatchFromFile(data);
        } catch (err) {
            alert("Invalid patch file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
});


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

function resizeCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth * 0.9;  // Scale based on window size
    canvas.height = window.innerHeight * 0.5;
}


window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call