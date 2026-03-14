class VocalProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output || !input[0] || !output[0]) {
      return true;
    }

    const source = input[0];
    const destination = output[0];

    for (let i = 0; i < source.length; i += 1) {
      destination[i] = source[i];
    }

    return true;
  }
}

registerProcessor("vocal-processor", VocalProcessor);
