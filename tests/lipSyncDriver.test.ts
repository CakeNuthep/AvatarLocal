import { describe, expect, test, vi, beforeEach } from 'vitest';
import { LipSyncDriver } from '../src/ai-provider/lip-sync-driver';

describe('LipSyncDriver', () => {
  let mockAnalyserNode: any;
  let mockAudioContext: any;
  let mockSourceNode: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAnalyserNode = {
      fftSize: 1024,
      frequencyBinCount: 512,
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      destination: {},
      createAnalyser: vi.fn().mockReturnValue(mockAnalyserNode),
    };

    mockSourceNode = {
      context: mockAudioContext,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  test('constructor establishes correct connections and parameters', () => {
    const onUpdate = vi.fn();
    const driver = new LipSyncDriver(mockSourceNode, {
      smoothing: 0.8,
      sensitivity: 12.0,
      fftSize: 2048,
      onUpdate,
    });

    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    expect(mockAnalyserNode.fftSize).toBe(2048);
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockAnalyserNode);
    expect(mockAnalyserNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  test('calculateMouthOpenFromData returns 0 for empty array', () => {
    const driver = new LipSyncDriver(mockSourceNode);
    const result = driver.calculateMouthOpenFromData(new Float32Array([]));
    expect(result).toBe(0);
  });

  test('calculateMouthOpenFromData returns 0 for perfect silence', () => {
    const driver = new LipSyncDriver(mockSourceNode, { smoothing: 0 }); // 0 smoothing for instant result
    const silence = new Float32Array(100).fill(0);
    const result = driver.calculateMouthOpenFromData(silence);
    expect(result).toBe(0);
  });

  test('calculateMouthOpenFromData computes RMS and applies sensitivity correctly', () => {
    // 0 smoothing makes output match Math.min(1.0, rms * sensitivity)
    const driver = new LipSyncDriver(mockSourceNode, { smoothing: 0, sensitivity: 10.0 });
    
    // Constant amplitude signals:
    // RMS of signal with values all equal to 0.1 is 0.1
    const signal = new Float32Array(100).fill(0.1);
    const result = driver.calculateMouthOpenFromData(signal);
    
    // RMS = sqrt(100 * (0.1^2) / 100) = sqrt(0.01) = 0.1
    // target = 0.1 * 10 = 1.0
    expect(result).toBeCloseTo(1.0, 5);
  });

  test('calculateMouthOpenFromData clamps output to maximum 1.0', () => {
    const driver = new LipSyncDriver(mockSourceNode, { smoothing: 0, sensitivity: 10.0 });
    const loudSignal = new Float32Array(100).fill(0.5); // RMS = 0.5, target = 5.0 -> clamped to 1.0
    const result = driver.calculateMouthOpenFromData(loudSignal);
    expect(result).toBe(1.0);
  });

  test('calculateMouthOpenFromData applies exponential smoothing over multiple steps', () => {
    const driver = new LipSyncDriver(mockSourceNode, { smoothing: 0.5, sensitivity: 10.0 });

    // Step 1: Silent signal (prev = 0, target = 0.1 * 10 = 1.0)
    // current = 0 * 0.5 + 1.0 * (1 - 0.5) = 0.5
    const signal = new Float32Array(100).fill(0.1);
    let result = driver.calculateMouthOpenFromData(signal);
    expect(result).toBeCloseTo(0.5, 5);

    // Step 2: Same loud signal (prev = 0.5, target = 1.0)
    // current = 0.5 * 0.5 + 1.0 * 0.5 = 0.75
    result = driver.calculateMouthOpenFromData(signal);
    expect(result).toBeCloseTo(0.75, 5);

    // Step 3: Same loud signal (prev = 0.75, target = 1.0)
    // current = 0.75 * 0.5 + 1.0 * 0.5 = 0.875
    result = driver.calculateMouthOpenFromData(signal);
    expect(result).toBeCloseTo(0.875, 5);
  });

  test('update reads from AnalyserNode and invokes callback', () => {
    const onUpdate = vi.fn();
    const driver = new LipSyncDriver(mockSourceNode, {
      smoothing: 0,
      sensitivity: 5.0,
      onUpdate,
    });

    // Mock getFloatTimeDomainData to fill array with 0.2
    mockAnalyserNode.getFloatTimeDomainData.mockImplementation((array: Float32Array) => {
      array.fill(0.2);
    });

    const result = driver.update();

    // RMS = 0.2, target = 0.2 * 5.0 = 1.0
    expect(mockAnalyserNode.getFloatTimeDomainData).toHaveBeenCalled();
    expect(result).toBeCloseTo(1.0, 5);
    expect(onUpdate).toHaveBeenCalledWith(result);
  });

  test('destroy safely disconnects nodes', () => {
    const driver = new LipSyncDriver(mockSourceNode);
    driver.destroy();

    expect(mockSourceNode.disconnect).toHaveBeenCalledWith(mockAnalyserNode);
    expect(mockAnalyserNode.disconnect).toHaveBeenCalled();
  });
});
