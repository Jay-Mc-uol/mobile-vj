class MicMeterProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input && input[0]) {
            let sum = 0;
            const channel = input[0];
            for (let i = 0; i < channel.length; i++) {
                sum += channel[i] * channel[i];
            }
            const rms = Math.sqrt(sum / channel.length);
            this.port.postMessage(rms);
        }
        return true;
    }
}

registerProcessor('mic-meter-processor', MicMeterProcessor);
