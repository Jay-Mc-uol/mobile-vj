// feature-extractor-processor.js
class FeatureExtractorProcessor extends AudioWorkletProcessor {
    // Static getter for AudioWorkletProcessor
    static get parameterDescriptors() {
        return [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0]; // Access the first input channel

        if (input && input.length > 0) {
            const samples = input[0]; // Access the audio samples
            // You can perform feature extraction here, e.g., calculate RMS
            const rms = Math.sqrt(samples.reduce((sum, val) => sum + val * val, 0) / samples.length);
            this.port.postMessage({ rms }); // Send the calculated RMS back to the main thread
        }

        return true; // Keep the processor alive
    }
}

registerProcessor('feature-extractor-processor', FeatureExtractorProcessor);
