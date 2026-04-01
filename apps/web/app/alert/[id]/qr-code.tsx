'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface QRCodeProps {
  url: string;
  size?: number;
}

export function QRCode({ url, size = 180 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('qrcode').then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: '#10b981',
          light: '#050505',
        },
      }).then(() => {
        if (!cancelled) setReady(true);
      }).catch(console.error);
    });

    return () => { cancelled = true; };
  }, [url, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'tradeclaw-signal-qr.png';
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-xl overflow-hidden border border-white/10 bg-[#050505]"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className={`transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      {ready && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400
            transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-emerald-500/20"
        >
          <Download className="h-3 w-3" />
          Download QR
        </button>
      )}
    </div>
  );
}
