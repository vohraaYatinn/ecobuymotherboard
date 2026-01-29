import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PushNotificationProvider } from '@/components/push-notification-provider'
import { NavigationProvider } from '@/contexts/navigation-context'
import { NotificationSoundProvider } from '@/contexts/notification-sound-context'
import { Toaster } from '@/components/ui/toaster'
import { NavigationHandler } from '@/components/navigation-handler'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Elecobuy Seller',
  description: 'Elecobuy Seller - Your Business Command Center',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" style={{ height: '100%', margin: 0, padding: 0 }}>
      <body className={`font-sans antialiased`} style={{ height: '100%', margin: 0, padding: 0 }}>
        <NavigationProvider>
          <NotificationSoundProvider>
            <PushNotificationProvider>
              <NavigationHandler />
              {children}
            </PushNotificationProvider>
          </NotificationSoundProvider>
        </NavigationProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
