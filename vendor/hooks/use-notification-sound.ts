"use client"

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to manage continuous notification sound for new orders
 * Plays a continuous tone until the order is accepted or cancelled
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const activeOrderIdsRef = useRef<Set<string>>(new Set());

  // Initialize audio context
  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return;

    try {
      // Create AudioContext (works on both web and native via Capacitor)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }

    // Cleanup on unmount
    return () => {
      stopSound();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  /**
   * Start playing continuous notification sound
   * @param orderId - Optional order ID to track which order triggered the sound
   */
  const startSound = useCallback((orderId?: string) => {
    if (isPlayingRef.current) {
      // If already playing, just add the order ID to active orders
      if (orderId) {
        activeOrderIdsRef.current.add(orderId);
      }
      return;
    }

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        console.warn('AudioContext not available');
        return;
      }

      // Resume audio context if suspended (required for user interaction)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(console.error);
      }

      // Create oscillator for continuous tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Configure oscillator - using a pleasant but attention-grabbing tone
      // Frequency: 800Hz (similar to doorbell/gate approval apps)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

      // Configure gain (volume) - start with a fade in to avoid sudden loud sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1); // Fade in over 0.1s

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start oscillator
      oscillator.start();

      // Store references
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      isPlayingRef.current = true;

      if (orderId) {
        activeOrderIdsRef.current.add(orderId);
      }

      console.log('🔔 [Sound] Continuous notification sound started', orderId ? `for order ${orderId}` : '');
    } catch (error) {
      console.error('Failed to start notification sound:', error);
      isPlayingRef.current = false;
    }
  }, []);

  /**
   * Stop playing the notification sound
   * @param orderId - Optional order ID. If provided, only stops if this was the last active order
   * @param force - If true, stops immediately regardless of other active orders
   */
  const stopSound = useCallback((orderId?: string, force: boolean = false) => {
    if (!isPlayingRef.current) return;

    // If orderId is provided and force is false, only stop if this was the last order
    if (orderId && !force) {
      activeOrderIdsRef.current.delete(orderId);
      // Continue playing if there are other active orders
      if (activeOrderIdsRef.current.size > 0) {
        console.log('🔔 [Sound] Order removed, but other orders still active. Sound continues.');
        return;
      }
    } else if (force) {
      // Force stop - clear all active orders
      activeOrderIdsRef.current.clear();
    }

    try {
      const oscillator = oscillatorRef.current;
      const gainNode = gainNodeRef.current;
      const audioContext = audioContextRef.current;

      if (oscillator && gainNode && audioContext) {
        // Fade out smoothly before stopping
        const currentTime = audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.2); // Fade out over 0.2s

        // Stop oscillator after fade out
        setTimeout(() => {
          try {
            oscillator.stop();
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (error) {
            // Ignore errors if already stopped
            console.warn('Error stopping oscillator:', error);
          }
        }, 200);

        oscillatorRef.current = null;
        gainNodeRef.current = null;
        isPlayingRef.current = false;

        console.log('🔔 [Sound] Notification sound stopped', orderId ? `for order ${orderId}` : '');
      }
    } catch (error) {
      console.error('Failed to stop notification sound:', error);
      isPlayingRef.current = false;
      oscillatorRef.current = null;
      gainNodeRef.current = null;
    }
  }, []);

  /**
   * Stop sound for all orders (force stop)
   */
  const stopAllSounds = useCallback(() => {
    stopSound(undefined, true);
  }, [stopSound]);

  /**
   * Check if sound is currently playing
   */
  const isPlaying = useCallback(() => {
    return isPlayingRef.current;
  }, []);

  return {
    startSound,
    stopSound,
    stopAllSounds,
    isPlaying,
  };
}

