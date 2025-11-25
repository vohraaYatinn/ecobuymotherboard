"use client"

import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationSound } from '@/hooks/use-notification-sound';

interface NotificationSoundContextType {
  startSound: (orderId?: string) => void;
  stopSound: (orderId?: string, force?: boolean) => void;
  stopAllSounds: () => void;
  isPlaying: () => boolean;
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
    // Return a no-op implementation if used outside provider (for safety)
    console.warn('useNotificationSoundContext used outside NotificationSoundProvider, returning no-op');
    return {
      startSound: () => {},
      stopSound: () => {},
      stopAllSounds: () => {},
      isPlaying: () => false,
    };
  }
  return context;
}

