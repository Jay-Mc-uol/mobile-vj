// Import libraries
import * as Tone from 'tone';
import Meyda from 'meyda';
import { Node, AudioNode, VideoNode, Patch } from './patching-system.js';

// DOM elements
const patchingCanvas = document.getElementById('patching-canvas');
const audioInput = document.getElementById('audio-input');
//const audioSelector = document.getElementById('audio-selector');
const audioPlayButton = document.getElementById('audio-play');
const audioPauseButton = document.getElementById('audio-stop');
const audioEjectButton = document.getElementById('audio-eject');
const videoInput = document.getElementById('video-input');
const videoPreview = document.getElementById('video-preview');
const canvas = document.getElementById('canvas');

const cameraStartBtn = document.getElementById('camera-start');
const cameraStopBtn = document.getElementById('camera-stop');
const micStartBtn = document.getElementById('mic-start');
const micStopBtn = document.getElementById('mic-stop');

const visualizerModeSelect = document.getElementById('visualizer-mode');

let cameraStream = null;
let micStream = null;
// Initialize the patching system
let patch = new Patch();


// Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioElement = null; // Store loaded audio element
//let audioFiles = [];
let mediaStreamSource = null;
let currentVisualizerMode = 'amplitude'; // Default mode

// Canvas context
const canvasCtx = canvas.getContext('2d');

// ----------------- File Loading -----------------

// Load audio file

// audioInput.addEventListener('change', (event) => {
    // const files = event.target.files;
    // if (files.length > 5) {
        // alert('You can only load up to 5 audio files.');
        // return;
    // }

    // // Clear previous audio files
    // audioFiles = [];
    
    // // Process each file
    // Array.from(files).forEach(file => {
        // const audio = new Audio(URL.createObjectURL(file));
        // audio.controls = true;
        // audioFiles.push(audio); // Add to audioFiles array
        // document.body.appendChild(audio); // Append to the body (for playback controls)
        // console.log('Loaded audio file:', file.name);

        // // Create a new Meyda analyzer for this audio file
        // const source = audioContext.createMediaElementSource(audio);

        // source.connect(audioContext.destination); 

        // const analyzer = Meyda.createMeydaAnalyzer({
            // audioContext,
            // source,
            // featureExtractors: ['amplitudeSpectrum', 'rms'],
            // callback: (features) => {
                // // Draw the visualizer (you can adapt to handle multiple audio files)
                // drawVisualizer(features.amplitudeSpectrum);
            // },
        // });
        // analyzer.start();
    // });

    // // Optionally, you can automatically start playing the first file or provide control buttons
    // if (audioFiles.length > 0) {
        // audioFiles[0].play();
    // }
// });

// // Switch audio when the selection changes
// audioSelector.addEventListener('change', (event) => {
    // const selectedIndex = parseInt(event.target.value, 10);
    // if (audioFiles[selectedIndex]) {
        // audioFiles[selectedIndex].play();  // Play the selected audio
    // }
// });

audioInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // Create and display audio element
        audioElement = new Audio(URL.createObjectURL(file));
        audioElement.controls = true;
        audioElement.crossOrigin = 'anonymous';
        document.body.appendChild(audioElement); // Debug: Display audio element for playback controls

        // Connect audio element to AudioContext
        const source = audioContext.createMediaElementSource(audioElement);

        // Connect the source to the destination (speakers)
        source.connect(audioContext.destination);        

        // Create Meyda analyzer for visualizing features
        const analyzer = Meyda.createMeydaAnalyzer({
            audioContext,
            source,
            featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
            callback: (features) => {
                drawVisualizer(features.amplitudeSpectrum, features.buffer);
                //drawVisualizer(features.amplitudeSpectrum);
            },
        });
        analyzer.start();
    }
});

// // Play loaded audio file
audioPlayButton.addEventListener('click', () => {
    if (audioElement) {
        // Resume the AudioContext (fixes the autoplay issue)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audioElement.play();
    } else {
        console.error('No audio file loaded.');
    }
});

audioPauseButton.addEventListener('click', () => {
    if (audioElement) {
        audioElement.pause();
    }
});

audioEjectButton.addEventListener('click', () => {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;

        document.body.removeChild(audioElement);
        
        audioElement = null;
        //audioControlButton.innerText = 'Load Audio';
    }
});

// Load video file
videoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.controls = true;
    }
});

// Event listener for dropdown menu
visualizerModeSelect.addEventListener('change', (event) => {
    currentVisualizerMode = event.target.value; // Update mode
});

// ----------------- Camera Input -----------------

cameraStartBtn.addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoPreview.srcObject = cameraStream;
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
});

cameraStopBtn.addEventListener('click', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        cameraStream = null;
        videoPreview.srcObject = null;
    }
});

// ----------------- Microphone Input -----------------

micStartBtn.addEventListener('click', async () => {
    try {
        // Resume the AudioContext (fixes the autoplay issue)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamSource = audioContext.createMediaStreamSource(micStream);

        // Create Meyda analyzer for microphone input
        const analyzer = Meyda.createMeydaAnalyzer({
            audioContext,
            source: mediaStreamSource,
            featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
            callback: (features) => {
                drawVisualizer(features.amplitudeSpectrum, features.buffer);
            },
        });
        analyzer.start();
    } catch (err) {
        console.error('Error accessing microphone:', err);
    }
});

micStopBtn.addEventListener('click', () => {
    if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
    }
});

// ----------------- Visualizer -----------------

// Main drawVisualizer function with support for multiple modes
// Main drawVisualizer function with new modes
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

// Function for amplitude bar graph (already implemented)
function drawAmplitudeBarGraph(amplitudeSpectrum) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    canvasCtx.fillStyle = 'lime';
    const barWidth = canvas.width / amplitudeSpectrum.length;
    amplitudeSpectrum.forEach((amp, i) => {
        const barHeight = amp * canvas.height;
        canvasCtx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
    });
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


// // Function for psychedelic patterns (already implemented)
// function drawPsychedelicPatterns(amplitudeSpectrum, rms) {
    // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // const intensity = rms || 0;

    // // Set background color based on intensity
    // const hue = (performance.now() / 10) % 360;
    // canvasCtx.fillStyle = `hsl(${hue}, 80%, ${30 + intensity * 50}%)`;
    // canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // // Draw pulsating circles
    // const centerX = canvas.width / 2;
    // const centerY = canvas.height / 2;
    // const maxRadius = Math.min(canvas.width, canvas.height) / 3;

    // for (let i = 0; i < 10; i++) {
        // const radius = maxRadius * (i / 10) * (1 + intensity);
        // canvasCtx.beginPath();
        // canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        // canvasCtx.strokeStyle = `hsl(${(hue + i * 36) % 360}, 90%, 60%)`;
        // canvasCtx.lineWidth = 4;
        // canvasCtx.stroke();
    // }

    // // Add rotating shapes for psychedelic effect
    // const numShapes = 8;
    // const angleStep = (Math.PI * 2) / numShapes;
    // const rotation = (performance.now() / 1000) % (Math.PI * 2);

    // for (let i = 0; i < numShapes; i++) {
        // const angle = i * angleStep + rotation;
        // const x = centerX + Math.cos(angle) * maxRadius * 0.6 * (1 + intensity * 0.5);
        // const y = centerY + Math.sin(angle) * maxRadius * 0.6 * (1 + intensity * 0.5);

        // canvasCtx.beginPath();
        // canvasCtx.arc(x, y, 15 + intensity * 20, 0, Math.PI * 2);
        // canvasCtx.fillStyle = `hsl(${(hue + i * 45) % 360}, 80%, 50%)`;
        // canvasCtx.fill();
    // }
// }

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

// Create draggable nodes
function createNode(type, id) {
    let node;
    if (type === 'audio') {
        node = new AudioNode(id, audioContext);
    } else if (type === 'video') {
        node = new VideoNode(id);
    }
    patch.addNode(node);

    const nodeElement = document.createElement('div');
    nodeElement.classList.add('node');
    nodeElement.draggable = true;
    nodeElement.innerHTML = `<h3>${type} Node ${id}</h3>`;
    patchingCanvas.appendChild(nodeElement);

    nodeElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('nodeId', id);
    });

    // Handle node drop for connections
    nodeElement.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
    });

    nodeElement.addEventListener('drop', (e) => {
        const draggedNodeId = e.dataTransfer.getData('nodeId');
        const draggedNode = patch.nodes.find(n => n.id === draggedNodeId);
        if (draggedNode && draggedNode !== node) {
            draggedNode.connect(node); // Connect nodes
            console.log(`Node ${draggedNode.id} connected to Node ${node.id}`);
        }
    });

    return nodeElement;
}

// Create some initial nodes for testing
createNode('audio', 1);
createNode('video', 2);


audioInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // Create and display audio element
        audioElement = new Audio(URL.createObjectURL(file));
        audioElement.controls = true;
        audioElement.crossOrigin = 'anonymous';
        document.body.appendChild(audioElement); // Debug: Display audio element for playback controls

        // Connect audio element to AudioContext
        const source = audioContext.createMediaElementSource(audioElement);

        // Connect the source to the destination (speakers)
        source.connect(audioContext.destination);        

        // Create Meyda analyzer for visualizing features
        const analyzer = Meyda.createMeydaAnalyzer({
            audioContext,
            source,
            featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
            callback: (features) => {
                drawVisualizer(features.amplitudeSpectrum, features.buffer);
            },
        });
        analyzer.start();
    }
});

/*
// Audio input handling
audioInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const audioElement = new Audio(URL.createObjectURL(file));
        audioElement.controls = true;
        document.body.appendChild(audioElement);
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(audioContext.destination);
        const audioNode = new AudioNode(1, audioContext);
        source.connect(audioNode.gainNode);
        patch.addNode(audioNode);
    }
}); */

/*
// Video input handling
videoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const videoPreview = document.getElementById('video-preview');
        videoPreview.src = URL.createObjectURL(file);
    }
}); */


// // Function to draw random squiggles and shapes
// function drawRandomSquiggles(amplitudeSpectrum) {
    // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // amplitudeSpectrum.forEach((amp, i) => {
        // const hue = (performance.now() / 10 + i * 10) % 360;
        // const size = amp * 50 + Math.random() * 10;
        // const x = Math.random() * canvas.width;
        // const y = Math.random() * canvas.height;

        // canvasCtx.beginPath();
        // canvasCtx.arc(x, y, size, 0, Math.PI * 2);
        // canvasCtx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        // canvasCtx.fill();

        // // Random squiggly lines
        // const squiggleLength = Math.random() * 100 + 50;
        // canvasCtx.beginPath();
        // canvasCtx.moveTo(x, y);
        // for (let j = 0; j < squiggleLength; j++) {
            // const offsetX = Math.random() * 20 - 10;
            // const offsetY = Math.random() * 20 - 10;
            // canvasCtx.lineTo(x + offsetX, y + offsetY);
        // }
        // canvasCtx.strokeStyle = `hsl(${(hue + 180) % 360}, 80%, 60%)`;
        // canvasCtx.stroke();
    // });
// }


// function drawVisualizer(amplitudeSpectrum, rms) {
    // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // // Get RMS value (represents overall loudness)
    // const intensity = rms || 0; // Fallback to 0 if RMS is unavailable

    // // Set background color based on intensity
    // const hue = (performance.now() / 10) % 360; // Continuously change hue over time
    // canvasCtx.fillStyle = `hsl(${hue}, 80%, ${30 + intensity * 50}%)`; // Intensity brightens background
    // canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // // Draw pulsating circles
    // const centerX = canvas.width / 2;
    // const centerY = canvas.height / 2;
    // const maxRadius = Math.min(canvas.width, canvas.height) / 3;

    // for (let i = 0; i < 10; i++) {
        // const radius = maxRadius * (i / 10) * (1 + intensity);
        // canvasCtx.beginPath();
        // canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        // canvasCtx.strokeStyle = `hsl(${(hue + i * 36) % 360}, 90%, 60%)`; // Gradual color shift
        // canvasCtx.lineWidth = 4;
        // canvasCtx.stroke();
    // }

    // // Add rotating shapes for psychedelic effect
    // const numShapes = 8;
    // const angleStep = (Math.PI * 2) / numShapes;
    // const rotation = (performance.now() / 1000) % (Math.PI * 2); // Smooth rotation over time

    // for (let i = 0; i < numShapes; i++) {
        // const angle = i * angleStep + rotation;
        // const x = centerX + Math.cos(angle) * maxRadius * 0.6 * (1 + intensity * 0.5);
        // const y = centerY + Math.sin(angle) * maxRadius * 0.6 * (1 + intensity * 0.5);

        // canvasCtx.beginPath();
        // canvasCtx.arc(x, y, 15 + intensity * 20, 0, Math.PI * 2);
        // canvasCtx.fillStyle = `hsl(${(hue + i * 45) % 360}, 80%, 50%)`; // Vibrant color
        // canvasCtx.fill();
    // }
// }



// function drawVisualizer(amplitudeSpectrum) {
    // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // if (!amplitudeSpectrum) return;

    // // Draw amplitude spectrum as a bar graph
    // canvasCtx.fillStyle = 'lime';
    // const barWidth = canvas.width / amplitudeSpectrum.length;
    // amplitudeSpectrum.forEach((amp, i) => {
        // const barHeight = amp * canvas.height;
        // canvasCtx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
    // });
// }
