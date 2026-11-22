'use client';

import { useState } from 'react';

// An offering's cover picture in a fixed 16:9 frame.
// A 16:9 picture (like 1600 x 900) fills the frame edge to edge.
// Any other shape (square, portrait, very wide) is shown whole, on top of a
// soft blurred copy of itself, so nothing is cut off and there are no bare bars.
// With no image it shows the brown gradient.
const WIDE = 16 / 9;
const TOLERANCE = 0.05; // within 5% of 16:9 counts as 16:9

function isWide(w, h) {
  if (!w || !h) return true;
  return Math.abs(w / h - WIDE) / WIDE <= TOLERANCE;
}

export default function CoverImage({ src, ratio = '16 / 9', radius = 0, alt = '' }) {
  // null until the picture has loaded and we know its real shape.
  const [fits, setFits] = useState(null);

  const measure = (el) => {
    if (el && el.complete && el.naturalWidth) setFits(isWide(el.naturalWidth, el.naturalHeight));
  };

  const blurred = fits === false;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        overflow: 'hidden',
        borderRadius: radius,
        background: 'linear-gradient(135deg, var(--brown-pale), var(--brown-light))',
      }}
    >
      {src && (
        <>
          {blurred && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: -24,
                background: `center / cover no-repeat url("${src}")`,
                filter: 'blur(22px)',
                transform: 'scale(1.1)',
                opacity: 0.9,
              }}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={measure}
            src={src}
            alt={alt}
            onLoad={(e) => measure(e.currentTarget)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: blurred ? 'contain' : 'cover',
            }}
          />
        </>
      )}
    </div>
  );
}
