/**
 * Utility để chuyển đổi AudioBuffer hoặc PCM samples sang file WAV chuẩn RIFF 16-bit PCM Mono
 * tương thích 100% với backend FINDWORK AI transcription (POST /ai/transcriptions).
 *
 * Yêu cầu Backend:
 * - mimetype: audio/wav
 * - Magic bytes: RIFF .... WAVE
 * - Kích thước: 44 bytes <= bytes <= 2,000,000 bytes (tối đa 60s)
 * - byteRate: 8,000 <= byteRate <= 384,000
 */

export function encodeWav(samples: Float32Array, sampleRate: number = 16000): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length minus RIFF identifier & length field */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write PCM samples (convert Float32 [-1.0, 1.0] to 16-bit signed integer [-32768, 32767])
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Resample an AudioBuffer to target 16,000Hz mono Float32Array
 */
export function resampleTo16kMono(audioBuffer: AudioBuffer): Float32Array {
  const targetSampleRate = 16000;
  // Get raw channel 0 (mono or left)
  const channelData = audioBuffer.getChannelData(0);
  if (audioBuffer.sampleRate === targetSampleRate) {
    return channelData;
  }

  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const newLength = Math.round(channelData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = Math.min(Math.round(i * ratio), channelData.length - 1);
    result[i] = channelData[originalIndex];
  }

  return result;
}
