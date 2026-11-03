import type { VoiceEffect } from '@/types';

interface EffectSettings {
  pitch: number;
  lowpass?: number;
  highpass?: number;
  treble?: number;
  compressor?: boolean;
  delay?: { time: number; feedback: number; wet: number };
  gain?: number;
}

export const VOICE_EFFECTS: Array<{
  id: VoiceEffect;
  label: string;
  description: string;
  glyph: string;
}> = [
  { id: 'natural', label: 'سروشتی', description: 'دەنگی ڕەسەنی خۆت — بێ گۆڕانکاری', glyph: '🎙️' },
  { id: 'warm', label: 'گەرم', description: 'نەرم و قووڵ، وەک چیرۆکگێڕانێکی شەوانە', glyph: '🌙' },
  { id: 'radio', label: 'ڕادیۆ', description: 'دەنگی ڕادیۆیی — ڕوون و بەرز', glyph: '📻' },
  { id: 'echo', label: 'ژێدەنگ', description: 'ژێدەنگێکی کەمی شەپۆلی', glyph: '🌊' },
  { id: 'deep', label: 'قووڵ', description: 'دەنگێکی قووڵ و شایستە', glyph: '🦁' },
  { id: 'bright', label: 'درەوشاوە', description: 'دەنگێکی خێرا و گەش', glyph: '✨' },
];

const SETTINGS: Record<VoiceEffect, EffectSettings> = {
  natural: { pitch: 1, gain: 1 },
  warm: { pitch: 0.965, lowpass: 3900, treble: -1, gain: 1.04 },
  radio: { pitch: 1.045, highpass: 360, lowpass: 3100, compressor: true, gain: 1.1 },
  echo: { pitch: 0.99, lowpass: 7000, delay: { time: 0.16, feedback: 0.26, wet: 0.22 }, gain: 0.98 },
  deep: { pitch: 0.86, lowpass: 4300, gain: 1.08 },
  bright: { pitch: 1.115, highpass: 160, treble: 3.5, gain: 0.96 },
};

const TARGET_RATE = 32000;

function mixToMono(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) out[i] = (out[i] || 0) + data[i]! / buffer.numberOfChannels;
  }
  return out;
}

function interpolate(
  source: Float32Array,
  targetLength: number,
  step: number,
): Float32Array {
  const out = new Float32Array(targetLength);
  const max = source.length - 1;
  for (let i = 0; i < targetLength; i++) {
    const position = Math.min(max, i * step);
    const left = Math.floor(position);
    const right = Math.min(max, left + 1);
    const fraction = position - left;
    out[i] = source[left]! * (1 - fraction) + source[right]! * fraction;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function renderFilters(
  mono: Float32Array,
  sampleRate: number,
  settings: EffectSettings,
): Promise<Float32Array> {
  if (!settings.lowpass && !settings.highpass && !settings.treble && !settings.compressor && !settings.delay) {
    return mono;
  }
  const context = new OfflineAudioContext(1, mono.length, sampleRate);
  const buffer = context.createBuffer(1, mono.length, sampleRate);
  buffer.copyToChannel(mono as Float32Array<ArrayBuffer>, 0);
  const source = context.createBufferSource();
  source.buffer = buffer;

  let node: AudioNode = source;
  if (settings.highpass) {
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = settings.highpass;
    filter.Q.value = 0.7;
    node.connect(filter);
    node = filter;
  }
  if (settings.lowpass) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = settings.lowpass;
    filter.Q.value = 0.7;
    node.connect(filter);
    node = filter;
  }
  if (settings.treble) {
    const shelf = context.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 2800;
    shelf.gain.value = settings.treble;
    node.connect(shelf);
    node = shelf;
  }
  if (settings.compressor) {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -28;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    node.connect(compressor);
    node = compressor;
  }

  const master = context.createGain();
  master.gain.value = settings.gain ?? 1;
  node.connect(master);

  if (settings.delay) {
    const dry = context.createGain();
    dry.gain.value = 1 - settings.delay.wet * 0.5;
    master.connect(dry).connect(context.destination);

    const delay = context.createDelay(0.5);
    delay.delayTime.value = settings.delay.time;
    const feedback = context.createGain();
    feedback.gain.value = settings.delay.feedback;
    const wet = context.createGain();
    wet.gain.value = settings.delay.wet;
    master.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(context.destination);
  } else {
    master.connect(context.destination);
  }

  source.start(0);
  const rendered = await context.startRendering();
  return rendered.getChannelData(0).slice();
}

/** Applies the user's personal voice signature and returns a compact WAV file. */
export async function processVoiceNote(blob: Blob, effect: VoiceEffect): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void context.close();
  }

  const settings = SETTINGS[effect] || SETTINGS.natural;
  const mono = mixToMono(decoded);
  const filtered = await renderFilters(mono, decoded.sampleRate, settings);

  const outputLength = Math.max(
    1,
    Math.round((filtered.length / settings.pitch) * (TARGET_RATE / decoded.sampleRate)),
  );
  const step = (settings.pitch * decoded.sampleRate) / TARGET_RATE;
  const pitched = interpolate(filtered, outputLength, step);
  return encodeWav(pitched, TARGET_RATE);
}

export function wavDuration(blob: Blob): number {
  // 16-bit mono PCM WAV at 32 kHz: 64,000 bytes per second + 44 byte header.
  return Math.max(0, (blob.size - 44) / 64000);
}
