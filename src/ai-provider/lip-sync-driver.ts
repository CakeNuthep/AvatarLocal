export interface LipSyncDriverOptions {
  smoothing?: number;      // Exponential smoothing factor: [0, 1). Default is 0.75.
  sensitivity?: number;    // Multiplier to scale raw RMS amplitude. Default is 10.0.
  fftSize?: number;        // FFT window size for analyser. Default is 1024.
  onUpdate?: (mouthOpen: number) => void; // Optional callback triggered on update.
}

export const activeLipSyncDriverRef = { current: null as LipSyncDriver | null };

/**
 * Driver that analyzes audio output in real-time using Web Audio API's AnalyserNode.
 * Computes RMS amplitude and maps it to a smoothed [0, 1] mouth-open weight.
 */
export class LipSyncDriver {
  private analyser: AnalyserNode;
  private sourceNode: AudioNode;
  private timeData: Float32Array;
  private prevMouthOpen = 0;
  private smoothing: number;
  private sensitivity: number;
  private onUpdate?: (mouthOpen: number) => void;

  constructor(sourceNode: AudioNode, options: LipSyncDriverOptions = {}) {
    this.sourceNode = sourceNode;
    const context = sourceNode.context;

    this.smoothing = options.smoothing !== undefined ? options.smoothing : 0.75;
    this.sensitivity = options.sensitivity !== undefined ? options.sensitivity : 10.0;
    const fftSize = options.fftSize !== undefined ? options.fftSize : 1024;
    this.onUpdate = options.onUpdate;

    // Create the analyser node
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = fftSize;

    // Allocate buffer for time-domain calculations
    this.timeData = new Float32Array(this.analyser.frequencyBinCount);

    // Connect nodes: sourceNode -> analyser -> destination
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(context.destination);

    // Register as active driver
    activeLipSyncDriverRef.current = this;
  }

  /**
   * Pure mathematical function that takes a Float32Array of raw audio samples,
   * calculates the Root Mean Square (RMS) volume, applies scaling/clamping,
   * and runs it through an exponential smoothing filter.
   * 
   * @param timeData Array of float samples [-1.0, 1.0]
   * @returns Smoothed mouth-open weight in range [0, 1]
   */
  calculateMouthOpenFromData(timeData: Float32Array): number {
    if (timeData.length === 0) return 0;

    let sumOfSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumOfSquares += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumOfSquares / timeData.length);

    // Map RMS to standard mouth open range [0, 1]
    const targetMouthOpen = Math.min(1.0, Math.max(0.0, rms * this.sensitivity));

    // Exponential moving average: current = prev * smoothing + target * (1 - smoothing)
    const current = this.prevMouthOpen * this.smoothing + targetMouthOpen * (1 - this.smoothing);
    this.prevMouthOpen = current;

    return current;
  }

  /**
   * Updates the analysis for the current frame by reading the time domain data
   * and computing the new mouth-open weight.
   * 
   * @returns Current mouth-open weight
   */
  update(): number {
    this.analyser.getFloatTimeDomainData(this.timeData);
    const mouthOpen = this.calculateMouthOpenFromData(this.timeData);
    if (this.onUpdate) {
      this.onUpdate(mouthOpen);
    }
    return mouthOpen;
  }

  /**
   * Disconnects the analyser and source nodes to prevent memory leaks.
   */
  destroy() {
    if (activeLipSyncDriverRef.current === this) {
      activeLipSyncDriverRef.current = null;
    }
    try {
      this.sourceNode.disconnect(this.analyser);
    } catch (e) {
      // Ignore if already disconnected
    }
    try {
      this.analyser.disconnect();
    } catch (e) {
      // Ignore if already disconnected
    }
  }
}
