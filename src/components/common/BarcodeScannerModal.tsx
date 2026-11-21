import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Barcode } from 'lucide-react';
import { sound } from '../../services/soundService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Product Barcode',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  
  // Unique container ID per instance
  const reactId = useId().replace(/:/g, '');
  const containerId = `qr-reader-${reactId}`;

  const stopScanner = async () => {
    // If scanner is in middle of starting, wait a short tick for start to resolve
    if (isStartingRef.current) {
      await new Promise((r) => setTimeout(r, 200));
    }

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        // Cleanup ignore
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!isOpen) {
      stopScanner();
      return;
    }

    setCameraError(null);

    const initScanner = async () => {
      // Yield to let DOM node render
      await new Promise((r) => setTimeout(r, 250));
      if (!isMountedRef.current) return;

      const container = document.getElementById(containerId);
      if (!container) return;

      try {
        isStartingRef.current = true;
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            sound.playScannerBeep();
            stopScanner();
            onScanSuccess(decodedText);
          },
          () => {
            // Frame-level scan miss, ignored
          }
        );

        isStartingRef.current = false;
        if (isMountedRef.current) {
          setIsScanning(true);
        } else {
          // Unmounted while starting
          stopScanner();
        }
      } catch (err) {
        isStartingRef.current = false;
        if (isMountedRef.current) {
          setCameraError(
            err instanceof Error ? err.message : 'Unable to access camera. Please allow camera permissions or enter barcode manually.'
          );
          setIsScanning(false);
        }
      }
    };

    initScanner();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen, containerId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    sound.playScannerBeep();
    stopScanner();
    onScanSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Area */}
        <div className="p-4">
          <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
            <div id={containerId} className="w-full h-full" />

            {!isScanning && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-400 mb-2" />
                <p className="text-xs text-slate-300">Initializing camera...</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white bg-slate-900/90">
                <Barcode className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-sm font-medium text-amber-200">Camera Unavailable</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">{cameraError}</p>
                <p className="text-xs text-brand-400 mt-3">You can enter the barcode manually below.</p>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
            Hold product barcode steady in the scanner box
          </p>

          {/* Manual Entry Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-400 uppercase tracking-wider">
                Or Type Barcode
              </span>
            </div>
          </div>

          {/* Manual Barcode Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8901030383701"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Use Code
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
