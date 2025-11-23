"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { register } = usePushNotifications();

  useEffect(() => {
    // Register for push notifications when component mounts
    register(router);
  }, [register, router]);

  return <>{children}</>;
}


