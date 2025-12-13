import { WebPlugin } from '@capacitor/core';
import type { OrderAlertPlugin } from './order-alert';

/**
 * Web implementation of OrderAlertPlugin
 * Uses the existing HTML5 Audio based implementation
 */
export class OrderAlertWeb extends WebPlugin implements OrderAlertPlugin {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    super();
    this.initAudio();
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audio = new Audio('/notification-sound.wav');
      this.audio.loop = true;
      this.audio.volume = 0.8;
      this.audio.preload = 'auto';
      this.audio.load();
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  async startAlert(options: { title?: string; message?: string; orderId?: string }): Promise<{ success: boolean; message: string }> {
    console.log('🔔 [OrderAlertWeb] startAlert:', options);
    
    if (this.isPlaying) {
      return { success: true, message: 'Already playing' };
    }

    try {
      if (this.audio) {
        this.audio.currentTime = 0;
        await this.audio.play();
        this.isPlaying = true;
        return { success: true, message: 'Alert started' };
      }
      return { success: false, message: 'Audio not initialized' };
    } catch (error) {
      console.error('Failed to start alert:', error);
      return { success: false, message: 'Failed to start alert' };
    }
  }

  async stopAlert(): Promise<{ success: boolean; message: string }> {
    console.log('🔔 [OrderAlertWeb] stopAlert');
    
    try {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      this.isPlaying = false;
      return { success: true, message: 'Alert stopped' };
    } catch (error) {
      console.error('Failed to stop alert:', error);
      return { success: false, message: 'Failed to stop alert' };
    }
  }

  async isAlertPlaying(): Promise<{ isPlaying: boolean }> {
    return { isPlaying: this.isPlaying };
  }
}















