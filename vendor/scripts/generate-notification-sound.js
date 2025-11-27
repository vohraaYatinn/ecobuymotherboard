#!/usr/bin/env node

/**
 * Script to generate a notification sound file for the vendor app
 * Creates a pleasant repeating doorbell-like tone
 * 
 * Run: node scripts/generate-notification-sound.js
 */

const fs = require('fs');
const path = require('path');

// WAV file parameters
const sampleRate = 44100;
const duration = 2; // 2 seconds (will loop)
const numChannels = 1;
const bitsPerSample = 16;

// Generate a doorbell-like tone pattern
function generateDoorbellTone(sampleRate, duration) {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);
  
  // Frequencies for a pleasant doorbell sound
  const freq1 = 880;  // A5 - high note
  const freq2 = 660;  // E5 - low note
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Pattern: ding-dong, pause, ding-dong
    // Each pattern takes 0.5 seconds
    const patternTime = t % 1.0; // Repeat every second
    
    if (patternTime < 0.15) {
      // First "ding" (high note) - 0 to 0.15s
      const localT = patternTime;
      const envelope = Math.sin(Math.PI * localT / 0.15); // Smooth envelope
      sample = Math.sin(2 * Math.PI * freq1 * localT) * envelope * 0.5;
    } else if (patternTime >= 0.15 && patternTime < 0.35) {
      // "dong" (low note) - 0.15 to 0.35s
      const localT = patternTime - 0.15;
      const envelope = Math.exp(-localT * 5) * Math.sin(Math.PI * Math.min(localT / 0.05, 1));
      sample = Math.sin(2 * Math.PI * freq2 * localT) * envelope * 0.5;
    } else if (patternTime >= 0.5 && patternTime < 0.65) {
      // Second "ding" (high note) - 0.5 to 0.65s
      const localT = patternTime - 0.5;
      const envelope = Math.sin(Math.PI * localT / 0.15);
      sample = Math.sin(2 * Math.PI * freq1 * localT) * envelope * 0.5;
    } else if (patternTime >= 0.65 && patternTime < 0.85) {
      // Second "dong" (low note) - 0.65 to 0.85s
      const localT = patternTime - 0.65;
      const envelope = Math.exp(-localT * 5) * Math.sin(Math.PI * Math.min(localT / 0.05, 1));
      sample = Math.sin(2 * Math.PI * freq2 * localT) * envelope * 0.5;
    }
    // Silence for the rest (pause between patterns)
    
    // Convert to 16-bit integer
    samples[i] = Math.floor(sample * 32767);
  }
  
  return samples;
}

// Create WAV file buffer
function createWavFile(samples, sampleRate, numChannels, bitsPerSample) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  
  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  
  // fmt subchunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2;  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // data subchunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // Write samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }
  
  return buffer;
}

// Main
const samples = generateDoorbellTone(sampleRate, duration);
const wavBuffer = createWavFile(samples, sampleRate, numChannels, bitsPerSample);

// Output path
const outputPath = path.join(__dirname, '..', 'public', 'notification-sound.wav');

fs.writeFileSync(outputPath, wavBuffer);
console.log(`✅ Generated notification sound: ${outputPath}`);
console.log(`   Duration: ${duration} seconds`);
console.log(`   Sample rate: ${sampleRate} Hz`);
console.log(`   File size: ${wavBuffer.length} bytes`);



