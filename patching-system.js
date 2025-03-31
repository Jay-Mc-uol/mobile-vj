import { jsPlumb } from 'jsPlumb';
import { addAudioSource, audioContext, analyser } from './main.js'; 

let instance;

export function initPatchingSystem() {
    console.log("Initializing jsPlumb instance...");
    instance = jsPlumb.getInstance({
        Container: "patching-canvas",
        DragOptions: { cursor: 'pointer', zIndex: 2000 },
        Connector: ["Bezier", { curviness: 50 }],
        PaintStyle: { stroke: "rgba(0,0,255,0.8)", lineWidth: 2 },
        EndpointStyle: { fill: "rgba(0,0,255,0.8)" },
    });

    instance.bind("connection", (info) => {
        const source = document.getElementById(info.sourceId);
        const target = document.getElementById(info.targetId);
        if (source?.audioNode && target?.audioNode && typeof source.audioNode.connect === 'function') {
            source.audioNode.connect(target.audioNode);
            console.log(`Patched ${info.sourceId} to ${info.targetId}`);
        }

        if (source.videoElement && target.inputVideo !== undefined) {
            target.inputVideo = source.videoElement;
            console.log("Patched camera to effect node");
        }
        
        if (source.processedCanvas && target.inputCanvas !== undefined) {
            target.inputCanvas = source.processedCanvas;
            console.log("Patched effect node to video visualizer");
        }
        
    });

    instance.bind("drag", (event) => {
        const nodeId = event.source.id;
        const connections = instance.getConnections({ source: nodeId });
        connections.forEach(connection => instance.repaint(connection));
    });

    instance.bind("dragend", (event) => {
        const nodeId = event.source.id;
        const connections = instance.getConnections({ source: nodeId });
        connections.forEach(connection => instance.repaint(connection));
    });
}

export function createNode(type) {
    const nodeId = `node-${Date.now()}`;
    const node = document.createElement('div');
    node.classList.add('node');
    node.id = nodeId;
    //node.innerHTML = `<h3>${type.toUpperCase()} Node</h3>`;

    const label = document.createElement('div');
    label.classList.add('node-label');
    label.innerText = type.toUpperCase();
    
    switch (type) {
        case 'audio':
            label.innerText += ' 🎵';
            break;
        case 'audio-processor':
            label.innerText += ' 🎚️';
            break;
        case 'audio-generator':
            label.innerText += ' 🔊';
            break;
        case 'microphone':
            label.innerText += ' 🎙️';
            break;
        case 'camera':
            label.innerText += ' 📷';
            break;
    }
    
    node.appendChild(label);


    document.getElementById('patching-canvas').appendChild(node);
    node.setAttribute('draggable', true);
    node.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', node.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '❌';
    deleteBtn.classList.add('delete-node-btn');
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.left = '100%';
    deleteBtn.style.top = '-16px';
    deleteBtn.style.transform = 'translateX(-20px)';
    deleteBtn.style.background = 'white';
    deleteBtn.style.border = '1px solid #ccc';
    deleteBtn.style.borderRadius = '50%';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.width = '20px';
    deleteBtn.style.height = '20px';
    deleteBtn.style.fontSize = '12px';
    deleteBtn.style.padding = '0';
    deleteBtn.title = 'Delete this node';
    
    deleteBtn.addEventListener('click', () => {
        const nodeId = node.id;
        instance.deleteConnectionsForElement(nodeId);
        instance.removeAllEndpoints(nodeId);
        node.remove();
        console.log(`Node ${nodeId} removed.`);
    });
    
    node.style.position = 'absolute'; // ensure relative positioning
    node.appendChild(deleteBtn);
    
    

    const title = node.querySelector('h3');
    switch (type) {
        case 'audio':
            node.style.setProperty('--node-color', '#b3d9ff');
            node.setAttribute('data-color', 'audio');
            node.style.backgroundColor = 'var(--node-color)';
            break;
        case 'audio-processor':
            node.style.setProperty('--node-color', '#fff5ba');
            node.setAttribute('data-color', 'processor');
            node.style.backgroundColor = 'var(--node-color)';
            break;
        case 'audio-generator':
            node.style.setProperty('--node-color', '#dab6fc');
            node.setAttribute('data-color', 'generator');
            node.style.backgroundColor = 'var(--node-color)';
            break;
    }

    jsPlumb.draggable(node, {
        containment: "parent",
        drag: () => instance.repaintEverything(),
        zIndex:9998
    });

    instance.addEndpoint(node, { anchors: ["RightMiddle"], isSource: true, isTarget: true });
    instance.addEndpoint(node, { anchors: ["LeftMiddle"], isSource: true, isTarget: true });

    switch (type) {
        case 'audio':
            handleAudioNode(nodeId);
            break;
        case 'video':
            handleVideoNode(nodeId);
            break;
        case 'microphone':
            handleMicrophoneNode(nodeId);
            break;
        case 'audio-processor':
            handleAudioProcessorNode(nodeId);
            break;
        case 'audio-generator':
            handleAudioGeneratorNode(nodeId);
            break;
        case 'visualizer':
            handleVisualizerNode(nodeId);
            break;
        case 'speaker':
            handleSpeakerNode(nodeId);
            break; 
        case 'camera':
            handleCameraNode(nodeId);
            break;
        case 'visual-effect':
            handleVisualEffectNode(nodeId);
            break;
        case 'video-visualizer':
            handleVideoVisualizerNode(nodeId);
            break;
                     
    }

    return nodeId;
}

function updateBorderByVolume(node, value) {
    const intensity = Math.min(Math.floor(value * 255), 255);
    node.style.border = `2px solid hsl(${120 * value}, 100%, 50%)`;
    node.style.boxShadow = `0 0 ${intensity / 10}px hsl(${120 * value}, 100%, 50%)`;
}

function handleAudioNode(nodeId) {
    const node = document.getElementById(nodeId);

    const audioElement = document.createElement('audio');
    audioElement.style.display = 'none'; // Hide default controls

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';

    const playBtn = document.createElement('button');
    playBtn.innerText = '▶️ Play';

    const pauseBtn = document.createElement('button');
    pauseBtn.innerText = '⏸ Pause';

    const clearBtn = document.createElement('button');
    clearBtn.innerText = '⏹ Clear';

    const meter = document.createElement('div');
    meter.style.height = '10px';
    meter.style.background = '#0f0';
    meter.style.marginTop = '5px';
    meter.style.transition = 'width 0.1s linear';

    node.appendChild(fileInput);
    node.appendChild(playBtn);
    node.appendChild(pauseBtn);
    node.appendChild(clearBtn);
    node.appendChild(meter);
    node.appendChild(audioElement);

    // Create MediaElementSourceNode ONCE
    const sourceNode = audioContext.createMediaElementSource(audioElement);
    node.audioNode = sourceNode; // Expose for patching
    addAudioSource(audioElement); // Connect to analyzer for visuals

    // Volume meter using ScriptProcessor
    const processor = audioContext.createScriptProcessor(256, 1, 1);
    processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const rms = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0) / input.length);
        updateMeter(rms);
    };

    const updateMeter = (value) => {
        meter.style.width = (value * 100) + '%';
        meter.style.background = `hsl(${120 * value}, 100%, 50%)`;
        updateBorderByVolume(node, value);
    };

    // Connect processor to output for RMS display
    sourceNode.connect(processor);
    processor.connect(audioContext.destination);

    // Load file
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            audioElement.src = URL.createObjectURL(file);
            audioElement.load();
            console.log(`Loaded audio: ${file.name}`);
        }
    });

    // Play/Pause/Clear controls
    playBtn.addEventListener('click', () => {
        audioElement.play();
    });

    pauseBtn.addEventListener('click', () => {
        audioElement.pause();
    });

    clearBtn.addEventListener('click', () => {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load();
        fileInput.value = '';
        meter.style.width = '0%';
        updateBorderByVolume(node, 0);
        console.log("Audio cleared.");
    });
}

        

async function handleMicrophoneNode(nodeId) {
    const node = document.getElementById(nodeId);

    const startBtn = document.createElement('button');
    startBtn.innerText = "Start Mic";

    const stopBtn = document.createElement('button');
    stopBtn.innerText = "Stop Mic";

    const meter = document.createElement('div');
    meter.style.height = '10px';
    meter.style.background = '#0f0';
    meter.style.marginTop = '5px';
    meter.style.transition = 'width 0.1s linear';

    node.appendChild(startBtn);
    node.appendChild(stopBtn);
    node.appendChild(meter);

    const updateMeter = (value) => {
        meter.style.width = (value * 100) + '%';
        meter.style.background = `hsl(${120 * value}, 100%, 50%)`;
        updateBorderByVolume(node, value);
    };

    let micStream, micSource, workletNode;

    startBtn.addEventListener('click', async () => {
        try {
            await audioContext.audioWorklet.addModule('mic-meter-processor.js');
    
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micSource = audioContext.createMediaStreamSource(micStream);
    
            workletNode = new AudioWorkletNode(audioContext, 'mic-meter-processor');
            micSource.connect(workletNode).connect(audioContext.destination);
            // Manually connect to analyser and visualizer
            micSource.connect(analyser);

            // Start Meyda visualizer like the mic button does
            const micAnalyzer = Meyda.createMeydaAnalyzer({
                audioContext,
                source: micSource,
                featureExtractors: ['amplitudeSpectrum', 'rms', 'buffer'],
                callback: (features) => {
                    const event = new CustomEvent('visualizer-data', {
                        detail: {
                            amplitudeSpectrum: features.amplitudeSpectrum,
                            waveform: features.buffer,
                            rms: features.rms
                        }
                    });
                    window.dispatchEvent(event);
                }                
            });
            micAnalyzer.start();

            node._meydaAnalyzer = micAnalyzer;
    
            workletNode.port.onmessage = (event) => {
                updateMeter(event.data);
            };
    
            node.audioNode = micSource;
            node._micStream = micStream;
            node._worklet = workletNode;
    
            console.log("Mic started on node:", nodeId);
        } catch (err) {
            console.error("Mic error:", err);
        }
    });
    

    stopBtn.addEventListener('click', () => {
        if (node._micStream) {
            node._micStream.getTracks().forEach(track => track.stop());
            node._worklet?.disconnect();
            node._micStream = null;
            node._worklet = null;
            meter.style.width = '0%';
            node.style.border = '1px solid #000';
            node.style.boxShadow = 'none';
            console.log("Mic stopped on node:", nodeId);
        }
        if (node._meydaAnalyzer) {
            node._meydaAnalyzer.stop();
            node._meydaAnalyzer = null;
        }
    });
}



function handleAudioProcessorNode(nodeId) {
    const node = document.getElementById(nodeId);
    const label = document.createElement('label');
    label.innerText = "Effect:";

    const select = document.createElement('select');
    const effects = ['gain', 'lowpass', 'highpass', 'delay'];
    effects.forEach(effect => {
        const option = document.createElement('option');
        option.value = effect;
        option.innerText = effect.charAt(0).toUpperCase() + effect.slice(1);
        select.appendChild(option);
    });

    const paramControl = document.createElement('input');
    paramControl.type = 'range';
    paramControl.min = 0;
    paramControl.max = 2;
    paramControl.step = 0.01;
    paramControl.value = 1;

    const paramLabel = document.createElement('span');
    paramLabel.innerText = '1.0';

    node.appendChild(label);
    node.appendChild(select);
    node.appendChild(paramControl);
    node.appendChild(paramLabel);

    let audioNode = audioContext.createGain();
    audioNode.gain.value = 1;
    node.audioNode = audioNode;

    const updateParam = () => {
        const value = parseFloat(paramControl.value);
        paramLabel.innerText = value.toFixed(2);
        switch (select.value) {
            case 'gain':
                audioNode.gain.value = value;
                break;
            case 'lowpass':
            case 'highpass':
                audioNode.frequency.value = value * 1000;
                break;
            case 'delay':
                audioNode.delayTime.value = value;
                break;
        }
    };

    const createEffectNode = (type) => {
        switch (type) {
            case 'gain':
                audioNode = audioContext.createGain();
                break;
            case 'lowpass':
                audioNode = audioContext.createBiquadFilter();
                audioNode.type = 'lowpass';
                break;
            case 'highpass':
                audioNode = audioContext.createBiquadFilter();
                audioNode.type = 'highpass';
                break;
            case 'delay':
                audioNode = audioContext.createDelay();
                break;
        }
        node.audioNode = audioNode;
        updateParam();
    };

    paramControl.addEventListener('input', updateParam);
    select.addEventListener('change', () => {
        createEffectNode(select.value);
    });

    updateParam();
}

function handleAudioGeneratorNode(nodeId) {
    const node = document.getElementById(nodeId);

    const typeSelect = document.createElement('select');
    ['sine', 'square', 'triangle', 'sawtooth'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });

    const freqSlider = document.createElement('input');
    freqSlider.type = 'range';
    freqSlider.min = 50;
    freqSlider.max = 2000;
    freqSlider.value = 440;
    freqSlider.step = 1;

    const freqLabel = document.createElement('span');
    freqLabel.innerText = '440 Hz';

    const startBtn = document.createElement('button');
    startBtn.innerText = '▶️ Start';

    const stopBtn = document.createElement('button');
    stopBtn.innerText = '⏹ Stop';

    node.appendChild(typeSelect);
    node.appendChild(freqLabel);
    node.appendChild(freqSlider);
    node.appendChild(startBtn);
    node.appendChild(stopBtn);

    let osc = null;

    function createOscillator() {
        osc = audioContext.createOscillator();
        osc.type = typeSelect.value;
        osc.frequency.value = parseFloat(freqSlider.value);
        node.audioNode = osc;
    }

    typeSelect.addEventListener('change', () => {
        if (osc) {
            osc.type = typeSelect.value;
        }
    });

    freqSlider.addEventListener('input', () => {
        const freq = parseFloat(freqSlider.value);
        freqLabel.innerText = `${freq} Hz`;
        if (osc) {
            osc.frequency.value = freq;
        }
    });

    startBtn.addEventListener('click', () => {
        if (!osc) {
            createOscillator();
            osc.connect(audioContext.destination); // or another patch node
            osc.start();
        }
    });

    stopBtn.addEventListener('click', () => {
        if (osc) {
            osc.stop();
            osc.disconnect();
            osc = null;
            node.audioNode = null;
        }
    });
}


function handleSpeakerNode(nodeId) {
    const node = document.getElementById(nodeId);

    const label = document.createElement('p');
    label.innerText = '🔊 Speaker Output';

    node.appendChild(label);

    const gain = audioContext.createGain();
    gain.gain.value = 1;

    // Expose for patching
    node.audioNode = gain;

    // Final destination
    gain.connect(audioContext.destination);
}


// Visual Nodes
function handleVisualizerNode(nodeId) {
    const node = document.getElementById(nodeId);

    const info = document.createElement('p');
    info.innerText = '👁 Visualizer Input';

    const meter = document.createElement('div');
    meter.style.height = '10px';
    meter.style.background = '#0f0';
    meter.style.marginTop = '5px';

    node.appendChild(info);
    node.appendChild(meter);

    const passthrough = audioContext.createGain();
    node.audioNode = passthrough;

    // Connect to global analyser and destination
    passthrough.connect(analyser);

    const processor = audioContext.createScriptProcessor(256, 1, 1);
    passthrough.connect(processor);
    processor.connect(audioContext.destination);
    processor.onaudioprocess = () => {
        const amplitudeSpectrum = new Uint8Array(analyser.frequencyBinCount);
        const waveform = new Uint8Array(analyser.fftSize);
    
        analyser.getByteFrequencyData(amplitudeSpectrum);
        analyser.getByteTimeDomainData(waveform);
    
        const customEvent = new CustomEvent('visualizer-data', {
            detail: {
                amplitudeSpectrum,
                waveform
            },
        });
    
        window.dispatchEvent(customEvent);
    };
    
}

function handleCameraNode(nodeId) {
    const node = document.getElementById(nodeId);

    const startBtn = document.createElement('button');
    startBtn.innerText = "📷 Start Camera";

    const stopBtn = document.createElement('button');
    stopBtn.innerText = "⏹ Stop Camera";
    stopBtn.disabled = true;

    const videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.display = 'none';

    node.appendChild(startBtn);
    node.appendChild(stopBtn);
    node.appendChild(videoEl);

    let stream;

    startBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoEl.srcObject = stream;
            videoEl.play();
            node.videoElement = videoEl;

            const raw = document.getElementById('video-raw');
            if (raw) {
                raw.srcObject = stream;
                raw.play();
            }

            startBtn.disabled = true;
            stopBtn.disabled = false;
            console.log("Camera started on node:", nodeId);
        } catch (err) {
            console.error("Camera error:", err);
        }
    });

    stopBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoEl.srcObject = null;
            if (node.videoElement) {
                node.videoElement = null;
            }
            const raw = document.getElementById('video-raw');
            if (raw && raw.srcObject === stream) {
                raw.srcObject = null;
            }
            console.log("Camera stopped on node:", nodeId);
        }
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });
}
    
    
    

function handleVisualEffectNode(nodeId) {
    const node = document.getElementById(nodeId);

    const select = document.createElement('select');
    ['normal', 'invert', 'blackwhite', 'funhouse'].forEach(effect => {
        const opt = document.createElement('option');
        opt.value = effect;
        opt.textContent = effect;
        select.appendChild(opt);
    });

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvas.style.width = '100%';

    node.appendChild(select);
    node.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    node.processedCanvas = canvas;

    // Video source will be patched in
    node.inputVideo = null;

    // Draw loop
    function render() {
        if (node.inputVideo && node.inputVideo.readyState >= 2) {
            ctx.drawImage(node.inputVideo, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            switch (select.value) {
                case 'invert':
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = 255 - data[i];       // R
                        data[i + 1] = 255 - data[i + 1]; // G
                        data[i + 2] = 255 - data[i + 2]; // B
                    }
                    break;
                case 'blackwhite':
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                        data[i] = data[i+1] = data[i+2] = avg;
                    }
                    break;
                case 'funhouse':
                    ctx.setTransform(1, 0.2 * Math.sin(Date.now() / 500), 0.2 * Math.cos(Date.now() / 500), 1, 0, 0);
                    ctx.drawImage(node.inputVideo, 0, 0, canvas.width, canvas.height);
                    break;
                default:
                    // normal
                    break;
            }

            if (select.value !== 'funhouse') {
                ctx.putImageData(imageData, 0, 0);
            }
        }

        requestAnimationFrame(render);
    }

    render();
}

function handleVideoVisualizerNode(nodeId) {
    const node = document.getElementById(nodeId);
    const label = document.createElement('p');
    label.innerText = '🎞 Output to Screen';
    node.appendChild(label);

    node.inputCanvas = null;

    const canvas = document.getElementById('video-preview'); // <- must be a <canvas>
    const ctx = canvas.getContext('2d');

    function render() {
        if (node.inputCanvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(node.inputCanvas, 0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(render);
    }

    render();
}

function handleVideoNode(nodeId) {
    const node = document.getElementById(nodeId);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';

    const playBtn = document.createElement('button');
    playBtn.innerText = '▶️ Play';

    const pauseBtn = document.createElement('button');
    pauseBtn.innerText = '⏸ Pause';

    const videoEl = document.createElement('video');
    videoEl.controls = false;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;
    videoEl.style.display = 'none'; // Keep it hidden

    // Create canvas for thumbnail preview
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 160;
    previewCanvas.height = 90;
    previewCanvas.style.width = '100%';
    previewCanvas.style.border = '1px solid #ccc';
    previewCanvas.style.borderRadius = '4px';
    previewCanvas.style.marginTop = '5px';

    const ctx = previewCanvas.getContext('2d');

    const loopToggle = document.createElement('button');
    loopToggle.innerText = '🔁 Loop: ON';
    loopToggle.dataset.loop = 'on';
    
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = 0.25;
    speedSlider.max = 2;
    speedSlider.step = 0.05;
    speedSlider.value = 1;
    
    const speedLabel = document.createElement('span');
    speedLabel.innerText = 'Speed: 1.00x';
    

    node.appendChild(fileInput);
    node.appendChild(playBtn);
    node.appendChild(pauseBtn);
    node.appendChild(previewCanvas);
    node.appendChild(videoEl); // hidden video element
    node.appendChild(loopToggle);
    node.appendChild(speedLabel);
    node.appendChild(speedSlider);


    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            videoEl.src = url;
            videoEl.load();

            videoEl.onloadeddata = () => {
                videoEl.play();
                node.videoElement = videoEl;
                console.log("Video loaded and playing on node:", nodeId);
            };
        }
    });

    playBtn.addEventListener('click', () => {
        videoEl.play();
    });

    pauseBtn.addEventListener('click', () => {
        videoEl.pause();
    });

    loopToggle.addEventListener('click', () => {
        if (videoEl.loop) {
            videoEl.loop = false;
            loopToggle.innerText = '🔁 Loop: OFF';
        } else {
            videoEl.loop = true;
            loopToggle.innerText = '🔁 Loop: ON';
        }
    });
    
    speedSlider.addEventListener('input', () => {
        const speed = parseFloat(speedSlider.value);
        videoEl.playbackRate = speed;
        speedLabel.innerText = `Speed: ${speed.toFixed(2)}x`;
    });
    

    // Start drawing preview thumbnail
    function renderPreview() {
        if (videoEl.readyState >= 2 && !videoEl.paused && !videoEl.ended) {
            ctx.drawImage(videoEl, 0, 0, previewCanvas.width, previewCanvas.height);
        }
        requestAnimationFrame(renderPreview);
    }

    renderPreview();
}



// Patches

export function savePatch() {
    const nodes = Array.from(document.querySelectorAll('.node')).map(node => ({
        id: node.id,
        type: node.querySelector('h3')?.innerText.split(' ')[0].toLowerCase(),
        x: node.offsetLeft,
        y: node.offsetTop
    }));

    const connections = instance.getAllConnections().map(conn => ({
        sourceId: conn.sourceId,
        targetId: conn.targetId
    }));

    const data = { nodes, connections };
    localStorage.setItem('vj-patch', JSON.stringify(data));
    alert('Patch saved!');
}

export function loadPatch() {
    const data = JSON.parse(localStorage.getItem('vj-patch'));
    if (!data) return;

    data.nodes.forEach(({ id, type, x, y }) => {
        const nodeId = createNode(type);
        const nodeEl = document.getElementById(nodeId);
        nodeEl.style.left = x + 'px';
        nodeEl.style.top = y + 'px';
    });

    setTimeout(() => {
        data.connections.forEach(({ sourceId, targetId }) => {
            instance.connect({ source: sourceId, target: targetId });
        });
    }, 500);
}


export function downloadPatchAsFile() {
    const nodes = Array.from(document.querySelectorAll('.node')).map(node => ({
        id: node.id,
        type: node.querySelector('h3')?.innerText.split(' ')[0].toLowerCase(),
        x: node.offsetLeft,
        y: node.offsetTop
    }));

    const connections = jsPlumb.getInstance().getAllConnections().map(conn => ({
        sourceId: conn.sourceId,
        targetId: conn.targetId
    }));

    const data = { nodes, connections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'vj-patch.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    console.log("Patch downloaded as file.");
}

export function loadPatchFromFile(data) {
    if (!data) return;

    const canvas = document.getElementById('patching-canvas');
    canvas.innerHTML = '';
    jsPlumb.getInstance().deleteEveryEndpoint();

    data.nodes.forEach(({ id, type, x, y }) => {
        const nodeId = createNode(type);
        const nodeEl = document.getElementById(nodeId);
        nodeEl.style.left = x + 'px';
        nodeEl.style.top = y + 'px';
    });

    setTimeout(() => {
        data.connections.forEach(({ sourceId, targetId }) => {
            jsPlumb.getInstance().connect({ source: sourceId, target: targetId });
        });
    }, 500);
}
