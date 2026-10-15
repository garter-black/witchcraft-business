/* Mic -> PCM16 16 kHz, ~100 ms frames, for the ElevenLabs Conversational AI websocket. */
class WSMic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; this.pos = 0; this.acc = 0; this.n = 0;
    this.out = new Int16Array(1600); this.o = 0; this.muted = false;
    this.port.onmessage = (e) => { if (e.data && 'mute' in e.data) this.muted = !!e.data.mute; };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      // box-filter decimation: average every `ratio` input samples into one 16 kHz sample
      this.acc += ch[i]; this.n++; this.pos += 1;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;
        let v = this.muted ? 0 : this.acc / this.n; this.acc = 0; this.n = 0;
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        this.out[this.o++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        if (this.o === this.out.length) { this.port.postMessage(this.out.buffer, [this.out.buffer]); this.out = new Int16Array(1600); this.o = 0; }
      }
    }
    return true;
  }
}
registerProcessor('ws-mic', WSMic);
