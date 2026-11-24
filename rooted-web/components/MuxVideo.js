import { muxPlayerUrl } from '@/lib/lessons';

// A Mux lesson video in a fixed 16:9 black frame that fills the width on every screen.
// The frame keeps its shape with padding (works on older iPhone Safari too) and the player
// is stretched to fill it. On phones the site is drawn at 86% (globals.css), which also shrinks
// the player inside the frame; the mux-frame class undoes that so the video fills the frame.
export default function MuxVideo({ playbackId, title }) {
  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
      <iframe
        src={muxPlayerUrl(playbackId)}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="mux-frame"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block', background: '#000' }}
      />
    </div>
  );
}
