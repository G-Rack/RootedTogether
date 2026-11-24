'use client';

import { useSyncExternalStore } from 'react';
import { muxPlayerUrl } from '@/lib/lessons';

// A Mux lesson video in a fixed 16:9 black frame that fills the width on every screen.
//
// On phones the site is drawn at 86% (CSS zoom in globals.css). An embedded player page (iframe)
// gets shrunk by that zoom and sits in a corner of its frame. So wherever the browser can play
// Mux's stream itself (iPhone, iPad, Android, Mac Safari), we use the browser's own video player,
// which fills the frame. Other browsers (desktop Chrome, Firefox) keep the Mux player page; the
// zoom does not apply on those screen sizes.
const noop = () => () => {};
function canPlayHls() {
  try {
    return document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  } catch {
    return false;
  }
}

export default function MuxVideo({ playbackId, title }) {
  const native = useSyncExternalStore(noop, canPlayHls, () => false);
  const frame = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block', background: '#000' };

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
      {native ? (
        <video
          src={`https://stream.mux.com/${playbackId}.m3u8`}
          poster={`https://image.mux.com/${playbackId}/thumbnail.webp?width=1280`}
          title={title}
          aria-label={title}
          controls
          playsInline
          preload="none"
          style={{ ...frame, objectFit: 'contain' }}
        />
      ) : (
        <iframe
          src={muxPlayerUrl(playbackId)}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={frame}
        />
      )}
    </div>
  );
}
