"use client"

import React, { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  threshold?: number
  enabled?: boolean
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  enabled = true,
  className = '',
  disabled = false,
}: PullToRefreshProps) {
  const isNative = Capacitor.isNativePlatform()
  const shouldEnable = enabled && !disabled && isNative

  const { elementRef, isRefreshing, pullDistance, pullProgress, isPulling } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled: shouldEnable,
  })

  // Calculate rotation for spinner (0 to 180 degrees)
  const spinnerRotation = pullProgress * 180

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`relative ${className}`}
      style={{
        touchAction: shouldEnable ? 'pan-y' : 'auto',
      }}
    >
      {/* Pull-to-refresh indicator */}
      {shouldEnable && (isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-200"
          style={{
            height: `${Math.max(pullDistance, 60)}px`,
            opacity: isPulling || isRefreshing ? 1 : 0,
            transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
          }}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            {isRefreshing ? (
              <>
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Refreshing...</span>
              </>
            ) : (
              <>
                <div
                  className="relative"
                  style={{
                    transform: `rotate(${spinnerRotation}deg)`,
                    transition: isPulling ? 'none' : 'transform 0.2s ease-out',
                  }}
                >
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
                {pullProgress >= 1 && (
                  <span className="text-xs text-muted-foreground">Release to refresh</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: isPulling && !isRefreshing ? `translateY(${Math.max(0, pullDistance - 60)}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
