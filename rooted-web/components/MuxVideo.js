'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
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

export default function MuxVideo({ playbackId, title, onEnded }) {
  const native = useSyncExternalStore(noop, canPlayHls, () => false);
  // Before the first play we show our own centred play button (the phone's own button sits
  // off-centre because of the page zoom). After that, the phone's normal controls take over.
  const [started, setStarted] = useState(false);
  const videoRef = useRef(null);
  const play = () => {
    setStarted(true);
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  };
  const frame = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block', background: '#000' };

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
      {native ? (
        <>
        <video
          ref={videoRef}
          src={`https://stream.mux.com/${playbackId}.m3u8`}
          poster={`https://image.mux.com/${playbackId}/thumbnail.webp?width=1280`}
          title={title}
          aria-label={title}
          controls={started}
          playsInline
          preload="none"
          onPlay={() => setStarted(true)}
          onEnded={onEnded}
          style={{ ...frame, objectFit: 'contain' }}
        />
        {!started && (
          <button
            type="button"
            onClick={play}
            aria-label={`Play ${title || 'video'}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
          >
            <span style={{ width: 76, height: 76, borderRadius: 999, background: 'rgba(107,66,38,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 22px rgba(0,0,0,0.35)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ marginLeft: 4 }}>
                <path d="M7 4.5v15l13-7.5z" fill="#FFFFFF" />
              </svg>
            </span>
          </button>
        )}
        </>
      ) : (
        <iframe
          src={muxPlayerUrl(playbackId)}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={frame}
        />
      )}
    </div>
  );
}
