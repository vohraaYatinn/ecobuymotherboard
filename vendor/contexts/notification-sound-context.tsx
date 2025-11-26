"use client"

import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationSound } from '@/hooks/use-notification-sound';

interface NotificationSoundContextType {
  startSound: (orderId?: string, title?: string, message?: string) => Promise<void>;
  stopSound: (orderId?: string, force?: boolean) => Promise<void>;
  stopAllSounds: () => Promise<void>;
  isPlaying: () => Promise<boolean>;
}

const NotificationSoundContext = createContext<NotificationSoundContextType | undefined>(undefined);

export function NotificationSoundProvider({ children }: { children: ReactNode }) {
  const soundControls = useNotificationSound();

  return (
    <NotificationSoundContext.Provider value={soundControls}>
      {children}
    </NotificationSoundContext.Provider>
  );
}

export function useNotificationSoundContext() {
  const context = useContext(NotificationSoundContext);
  if (context === undefined) {
    // Return a no-op implementation if used outside provider
    console.warn('useNotificationSoundContext used outside NotificationSoundProvider');
    return {
      startSound: async () => {},
      stopSound: async () => {},
      stopAllSounds: async () => {},
      isPlaying: async () => false,
    };
  }
  return context;
}
