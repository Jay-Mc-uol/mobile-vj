class FeatureExtractorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    process(inputs, outputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            let sum = 0;
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
            }
            const rms = Math.sqrt(sum / channelData.length);
            this.port.postMessage({ rms });
        }
        return true;
    }
}

registerProcessor("feature-extractor-processor", FeatureExtractorProcessor);
