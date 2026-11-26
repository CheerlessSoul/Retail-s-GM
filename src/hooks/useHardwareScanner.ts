import { useEffect, useRef } from 'react';

interface HardwareScanStats {
  speedMs: number;
  charCount: number;
}

interface UseHardwareScannerOptions {
  onScan: (barcode: string, stats: HardwareScanStats) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

export function useHardwareScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 50,
  enabled = true,
}: UseHardwareScannerOptions) {
  const bufferRef = useRef<Array<{ char: string; time: number }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(e.key)) return;

      const now = performance.now();
      const buffer = bufferRef.current;

      // Handle termination keys: Enter or Tab
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= minChars) {
          // Calculate average typing speed between characters
          const timeSpan = buffer[buffer.length - 1].time - buffer[0].time;
          const avgInterval = buffer.length > 1 ? timeSpan / (buffer.length - 1) : 0;

          if (avgInterval <= maxIntervalMs) {
            // Verified hardware laser/CCD scanner burst!
            const barcode = buffer.map((item) => item.char).join('').trim();
            if (barcode.length >= minChars) {
              e.preventDefault();
              e.stopPropagation();
              onScan(barcode, {
                speedMs: Math.round(avgInterval),
                charCount: barcode.length,
              });
            }
          }
        }
        bufferRef.current = [];
        return;
      }

      // Only accept single printable characters
      if (e.key.length !== 1) return;

      // Reset buffer if delay between keystrokes exceeds timeout (human typing)
      if (buffer.length > 0) {
        const lastTime = buffer[buffer.length - 1].time;
        if (now - lastTime > maxIntervalMs * 1.5) {
          bufferRef.current = [];
        }
      }

      bufferRef.current.push({ char: e.key, time: now });

      // Clear any pending cleanup timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Cleanup buffer after 250ms of inactivity
      timerRef.current = setTimeout(() => {
        bufferRef.current = [];
      }, 250);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onScan, minChars, maxIntervalMs, enabled]);
}
