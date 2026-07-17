'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { PublicClawBackdropVariant } from '../../lib/public-brand-routes';

const DURATION_IN_FRAMES = 720;
const FRAMES_PER_SECOND = 30;

type SculptureProps = {
  src: string;
  style: CSSProperties;
};

type ClawCompositionProps = {
  variant: PublicClawBackdropVariant;
};

type RemotionClawPlayerProps = ClawCompositionProps & {
  onReady: () => void;
};

function Sculpture({ src, style }: SculptureProps) {
  return (
    <Img
      src={staticFile(src)}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 64px rgba(16, 185, 129, 0.13))',
        ...style,
      }}
    />
  );
}

export function ClawBackdropComposition({ variant }: ClawCompositionProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cycle = (frame / durationInFrames) * Math.PI * 2;
  const variantOpacity = variant === 'ambient' ? 0.7 : 1;
  const scanProgress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [-14, 114],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const scanOpacity = interpolate(
    frame,
    [0, 42, durationInFrames - 42, durationInFrames - 1],
    [0, 0.17, 0.17, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: 'transparent' }}>
      <div
        style={{
          position: 'absolute',
          inset: '5% 12%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0) 69%)',
          opacity: 0.54 + Math.sin(cycle) * 0.1,
          transform: `scale(${1 + Math.sin(cycle) * 0.018})`,
        }}
      />
      <Sculpture
        src="brand/tradeclaw-market-sculpture-v1.webp"
        style={{
          left: -86 + Math.sin(cycle) * 15,
          top: 70 + Math.cos(cycle) * 8,
          width: 790,
          height: 790,
          opacity: (0.84 + Math.sin(cycle) * 0.06) * variantOpacity,
          transform: `rotate(${-1.1 + Math.sin(cycle) * 0.8}deg) scale(${1 + Math.cos(cycle) * 0.012})`,
        }}
      />
      <Sculpture
        src="brand/tradeclaw-claw-orbit-v2.webp"
        style={{
          right: -26 + Math.cos(cycle) * 14,
          top: -82 + Math.sin(cycle) * 11,
          width: 720,
          height: 720,
          opacity: (0.73 + Math.cos(cycle) * 0.06) * variantOpacity,
          transform: `rotate(${1.4 + Math.cos(cycle) * 1.05}deg) translateY(${Math.sin(cycle) * 7}px)`,
        }}
      />
      <Sculpture
        src="brand/tradeclaw-claw-shard-v3.webp"
        style={{
          left: 682 + Math.cos(cycle) * 10,
          top: 470 + Math.sin(cycle) * 9,
          width: 520,
          height: 760,
          opacity: (0.61 + Math.sin(cycle) * 0.05) * variantOpacity,
          transform: `rotate(${-0.5 + Math.sin(cycle) * 0.7}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${scanProgress}%`,
          left: '9%',
          right: '9%',
          height: 1,
          opacity: scanOpacity,
          background:
            'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.82), transparent)',
          boxShadow: '0 0 22px rgba(16, 185, 129, 0.24)',
        }}
      />
    </AbsoluteFill>
  );
}

export function RemotionClawPlayer({ variant, onReady }: RemotionClawPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const inputProps = useMemo(() => ({ variant }), [variant]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    const syncPlayback = () => {
      if (document.hidden) {
        playerRef.current?.pause();
      } else {
        playerRef.current?.play();
      }
    };

    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, []);

  return (
    <div className="global-claw-backdrop__remotion">
      <Player
        ref={playerRef}
        component={ClawBackdropComposition}
        inputProps={inputProps}
        durationInFrames={DURATION_IN_FRAMES}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={FRAMES_PER_SECOND}
        autoPlay
        loop
        controls={false}
        clickToPlay={false}
        allowFullscreen={false}
        numberOfSharedAudioTags={0}
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
