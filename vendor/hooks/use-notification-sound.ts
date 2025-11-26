"use client"

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { startNativeAlert, stopNativeAlert, isNativeAlertPlaying } from '@/lib/order-alert';

/**
 * Hook to manage continuous notification sound for new orders
 * - On Android: Uses native Foreground Service (works even when app is closed)
 * - On Web: Uses HTML5 Audio API
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isUnlockedRef = useRef(false);
  const activeOrderIdsRef = useRef<Set<string>>(new Set());
  const pendingPlayRef = useRef(false);
  const isNativeRef = useRef(Capacitor.isNativePlatform());

  // Initialize audio element for web
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Skip web audio setup on native platforms
    if (isNativeRef.current) {
      console.log('🔔 [Sound] Native platform detected, using native alert service');
      return;
    }

    try {
      const audio = new Audio('/notification-sound.wav');
      audio.loop = true;
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      audio.addEventListener('canplaythrough', () => {
        console.log('🔔 [Sound] Audio loaded and ready to play');
      });
      
      audio.addEventListener('error', (e) => {
        console.error('🔔 [Sound] Audio error:', e);
      });
      
      audio.addEventListener('play', () => {
        console.log('🔔 [Sound] Audio started playing');
        isPlayingRef.current = true;
      });
      
      audioRef.current = audio;
      audio.load();
      
      console.log('🔔 [Sound] Web audio initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      isPlayingRef.current = false;
      activeOrderIdsRef.current.clear();
    };
  }, []);

  // Unlock audio on user interaction (for web)
  useEffect(() => {
    if (typeof window === 'undefined' || isNativeRef.current) return;
    
    const unlockAudio = async () => {
      if (isUnlockedRef.current) return;
      
      const audio = audioRef.current;
      if (!audio) return;
      
      try {
        audio.volume = 0;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.8;
          isUnlockedRef.current = true;
          console.log('🔔 [Sound] Audio unlocked successfully');
          
          if (pendingPlayRef.current && activeOrderIdsRef.current.size > 0) {
            pendingPlayRef.current = false;
            startSoundInternal();
          }
        }
      } catch (error) {
        console.log('🔔 [Sound] Audio unlock failed:', error);
      }
    };
    
    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: false, passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  // Internal function for web audio playback
  const startSoundInternal = useCallback(() => {
    if (isNativeRef.current) return;
    
    const audio = audioRef.current;
    if (!audio || isPlayingRef.current) return;

    try {
      audio.currentTime = 0;
      audio.volume = 0.8;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isPlayingRef.current = true;
            console.log('🔔 [Sound] Web audio started');
          })
          .catch((error) => {
            console.error('🔔 [Sound] Failed to play:', error);
            isPlayingRef.current = false;
            pendingPlayRef.current = true;
          });
      }
    } catch (error) {
      console.error('🔔 [Sound] Error:', error);
      isPlayingRef.current = false;
      pendingPlayRef.current = true;
    }
  }, []);

  /**
   * Start playing continuous notification sound
   */
  const startSound = useCallback(async (orderId?: string, title?: string, message?: string) => {
    console.log('🔔 [Sound] startSound called', orderId ? `for order ${orderId}` : '');
    
    if (orderId) {
      activeOrderIdsRef.current.add(orderId);
    }
    
    if (isPlayingRef.current) {
      console.log('🔔 [Sound] Already playing');
      return;
    }

    // Use native alert on Android
    if (isNativeRef.current) {
      try {
        const success = await startNativeAlert(
          title || 'New Order!',
          message || 'You have a new order to accept',
          orderId
        );
        if (success) {
          isPlayingRef.current = true;
        }
      } catch (error) {
        console.error('🔔 [Sound] Native alert error:', error);
      }
      return;
    }

    // Web audio
    if (!isUnlockedRef.current) {
      console.log('🔔 [Sound] Audio not unlocked, pending');
      pendingPlayRef.current = true;
      return;
    }

    startSoundInternal();
  }, [startSoundInternal]);

  /**
   * Stop playing the notification sound
   */
  const stopSound = useCallback(async (orderId?: string, force: boolean = false) => {
    console.log('🔔 [Sound] stopSound called', orderId ? `for order ${orderId}` : '', force ? '(force)' : '');
    
    pendingPlayRef.current = false;
    
    if (orderId && !force) {
      activeOrderIdsRef.current.delete(orderId);
      if (activeOrderIdsRef.current.size > 0) {
        console.log('🔔 [Sound] Other orders active, continuing');
        return;
      }
    } else if (force) {
      activeOrderIdsRef.current.clear();
    }

    // Stop native alert on Android
    if (isNativeRef.current) {
      try {
        await stopNativeAlert();
        isPlayingRef.current = false;
      } catch (error) {
        console.error('🔔 [Sound] Native stop error:', error);
      }
      return;
    }

    // Stop web audio
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        isPlayingRef.current = false;
        console.log('🔔 [Sound] Web audio stopped');
      } catch (error) {
        console.error('🔔 [Sound] Error stopping:', error);
        isPlayingRef.current = false;
      }
    }
  }, []);

  /**
   * Stop all sounds (force stop)
   */
  const stopAllSounds = useCallback(async () => {
    console.log('🔔 [Sound] stopAllSounds called');
    await stopSound(undefined, true);
  }, [stopSound]);

  /**
   * Check if sound is currently playing
   */
  const isPlaying = useCallback(async () => {
    if (isNativeRef.current) {
      try {
        return await isNativeAlertPlaying();
      } catch {
        return false;
      }
    }
    return isPlayingRef.current || pendingPlayRef.current;
  }, []);

  return {
    startSound,
    stopSound,
    stopAllSounds,
    isPlaying,
  };
}
