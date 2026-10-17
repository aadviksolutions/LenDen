'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface LendenFrameIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

const TOTAL_FRAMES = 180;
const DURATION_MS = 6000; // 6.0 seconds for 180 frames = 30 FPS
const TARGET_FPS = 30;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const PRELOAD_AHEAD_WINDOW = 40; // Sliding prefetch buffer ahead of current playhead
const INITIAL_BUFFER_FRAMES = 6; // Initial frames buffered

// Exact verified sequence: ezgif-frame-001.jpg through ezgif-frame-180.jpg
const FRAME_PATHS: string[] = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const frameNum = String(i + 1).padStart(3, '0');
  return `/lenden-intro/ezgif-frame-${frameNum}.jpg`;
});

export function LendenFrameIntro({ onComplete, forcePlay = false }: LendenFrameIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Decouple onComplete prop from effect lifecycles
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // References for playback and memory management
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingSetRef = useRef<Set<number>>(new Set());
  const animIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastDrawnFrameRef = useRef<number>(-1);
  const isFinishedRef = useRef<boolean>(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dismiss and finish transition
  const finishIntro = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    // Clean up animation loops
    if (animIntervalRef.current !== null) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Set session storage flag to prevent repeat in current tab session
    try {
      sessionStorage.setItem('lenden_intro_played', 'true');
      sessionStorage.setItem('lenden_intro_seen', 'true');
    } catch {
      // Storage might be restricted in private browsing
    }

    // Smooth fade out
    setIsFadingOut(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDismissed(true);
      // Restore scrolling on document body
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      onCompleteRef.current?.();
    }, 700); // 700ms smooth dissolve fade
  }, []);

  // Preload and asynchronously decode a single image frame
  const preloadFrame = useCallback((index: number): Promise<HTMLImageElement | null> => {
    if (index < 0 || index >= TOTAL_FRAMES) return Promise.resolve(null);
    if (imageCacheRef.current.has(index)) {
      return Promise.resolve(imageCacheRef.current.get(index)!);
    }
    if (loadingSetRef.current.has(index)) {
      return Promise.resolve(null);
    }

    loadingSetRef.current.add(index);
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;

      const onDone = () => {
        if (settled) return;
        settled = true;
        imageCacheRef.current.set(index, img);
        loadingSetRef.current.delete(index);
        // If this is the current target frame or first frame, draw immediately
        if (canvasRef.current && (lastDrawnFrameRef.current < 0 || index === 0)) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            lastDrawnFrameRef.current = index;
          }
        }
        resolve(img);
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        loadingSetRef.current.delete(index);
        resolve(null);
      };

      img.onload = () => {
        onDone();
        // Asynchronous decode raster bytes off-main-thread (non-blocking)
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {});
        }
      };
      img.onerror = onError;

      // Assign URL after event listeners are registered
      img.src = FRAME_PATHS[index];

      // If browser already completed loading (from memory/cache), resolve immediately
      if (img.complete && img.naturalWidth > 0) {
        onDone();
      }
    });
  }, []);

  // Controlled preloading window ahead of current frame
  const maintainPrefetchBuffer = useCallback(
    (currentFrame: number) => {
      const start = currentFrame + 1;
      const end = Math.min(TOTAL_FRAMES - 1, currentFrame + PRELOAD_AHEAD_WINDOW);
      for (let i = start; i <= end; i++) {
        if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
          preloadFrame(i);
        }
      }
    },
    [preloadFrame]
  );

  // Draw a frame to canvas with graceful fallback to closest decoded frame
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let img = imageCacheRef.current.get(frameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Find the closest previous decoded frame to prevent any blank frame flash
      for (let i = frameIndex - 1; i >= 0; i--) {
        const fallback = imageCacheRef.current.get(i);
        if (fallback && fallback.complete && fallback.naturalWidth > 0) {
          img = fallback;
          break;
        }
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      lastDrawnFrameRef.current = frameIndex;
    }
  }, []);

  useEffect(() => {
    // 1. Accessibility: Skip intro immediately if user prefers reduced motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion && !forcePlay) {
        finishIntro();
        return;
      }
    }

    // 2. Session guard: Skip intro if already played in this tab session
    if (!forcePlay && typeof window !== 'undefined') {
      try {
        const seen =
          sessionStorage.getItem('lenden_intro_played') === 'true' ||
          sessionStorage.getItem('lenden_intro_seen') === 'true';
        if (seen) {
          setIsDismissed(true);
          onCompleteRef.current?.();
          return;
        }
      } catch {
        // Continue if storage is restricted
      }
    }

    // 3. Lock background scrolling while intro is visible
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // 4. Absolute safety fallback timer (7.5 seconds) to ensure the website is NEVER inaccessible
    safetyTimeoutRef.current = setTimeout(() => {
      finishIntro();
    }, DURATION_MS + 1500);

    let isCancelled = false;

    // 5. Preload initial frame buffer
    const initialPromises = [];
    for (let i = 0; i < Math.min(TOTAL_FRAMES, INITIAL_BUFFER_FRAMES); i++) {
      initialPromises.push(preloadFrame(i));
    }

    // Buffer timeout so we start playing without stalling
    const bufferTimeout = new Promise((resolve) => setTimeout(resolve, 250));

    Promise.race([Promise.all(initialPromises), bufferTimeout]).then(() => {
      if (isCancelled || isFinishedRef.current) return;

      // Draw initial frame 0 immediately
      drawFrame(0);

      // Start prefetching next chunk
      maintainPrefetchBuffer(0);

      const tick = (now: number) => {
        if (isCancelled || isFinishedRef.current) return;

        if (startTimeRef.current === null) {
          startTimeRef.current = now;
        }

        const elapsed = now - startTimeRef.current;
        const rawProgress = Math.min(1, elapsed / DURATION_MS);
        setProgress(Math.round(rawProgress * 100));

        // Exact frame based on real elapsed time (guarantees 6.0s duration at 30 FPS)
        const currentFrameIndex = Math.min(
          TOTAL_FRAMES - 1,
          Math.floor(rawProgress * (TOTAL_FRAMES - 1))
        );

        drawFrame(currentFrameIndex);
        maintainPrefetchBuffer(currentFrameIndex);

        if (elapsed >= DURATION_MS) {
          if (animIntervalRef.current) {
            clearInterval(animIntervalRef.current);
            animIntervalRef.current = null;
          }
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          drawFrame(TOTAL_FRAMES - 1);
          setProgress(100);
          setTimeout(() => {
            finishIntro();
          }, 350);
        }
      };

      // Realtime 30 FPS clock using high-precision performance.now()
      // Guarantees reliable playback in all environments (including headless tests & mobile)
      animIntervalRef.current = setInterval(() => {
        tick(performance.now());
      }, Math.round(1000 / TARGET_FPS)); // ~33ms per frame = 30 FPS
    });

    return () => {
      isCancelled = true;
      if (animIntervalRef.current !== null) {
        clearInterval(animIntervalRef.current);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [forcePlay, finishIntro, preloadFrame, maintainPrefetchBuffer, drawFrame]);

  if (isDismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lenden Introduction Animation"
      className={`fixed inset-0 flex flex-col items-center justify-between select-none overflow-hidden transition-opacity duration-700 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: '#000000',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Top Header Controls */}
      <header className="w-full shrink-0 z-30 px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between pointer-events-auto">
        {/* Brand Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00B887] animate-ping absolute opacity-75" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#00B887]" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">
            Lenden™ Intro
          </span>
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={finishIntro}
          aria-label="Skip introduction animation and enter website"
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs sm:text-sm font-medium backdrop-blur-md transition-all border border-white/15 shadow-lg cursor-pointer group"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-emerald-400" />
        </button>
      </header>

      {/* Main Viewport: Canvas centered on pure black background with preserved 16:9 aspect ratio */}
      <main className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          style={{
            aspectRatio: '16 / 9',
            maxWidth: '1280px',
            maxHeight: '720px',
            width: '100%',
            height: 'auto',
          }}
        />
      </main>

      {/* Bottom Progress Bar & Hint */}
      <footer className="w-full shrink-0 pb-4 sm:pb-6 px-6 flex flex-col items-center pointer-events-none z-30">
        <div className="w-full max-w-xs sm:max-w-md flex flex-col items-center gap-2">
          {/* Progress track */}
          <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden backdrop-blur-xs">
            <div
              className="h-full bg-gradient-to-r from-[#008F91] via-[#00B887] to-[#00E5A3] transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] text-slate-400 font-medium px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00B887]" />
              Smart Business Suite
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
