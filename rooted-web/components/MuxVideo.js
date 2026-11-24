import { muxPlayerUrl } from '@/lib/lessons';

// A Mux lesson video in a fixed 16:9 black frame that fills the width on every screen.
// The frame keeps its shape with padding (works on older iPhone Safari too) and the player
// is stretched to fill it, so the picture never sits in a corner with white space around it.
export default function MuxVideo({ playbackId, title }) {
  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
      <iframe
        src={muxPlayerUrl(playbackId)}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '1px', minWidth: '100%', height: '100%', border: 0, display: 'block', background: '#000' }}
      />
    </div>
  );
}
