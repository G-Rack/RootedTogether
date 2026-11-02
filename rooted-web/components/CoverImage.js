// An offering's cover picture, shown WHOLE (never cropped). Any shape works:
// the picture sits on top of a soft blurred copy of itself, so a tall or very
// wide image still fills the frame neatly. 16:9 pictures fill it exactly.
// With no image it shows the brown gradient.
export default function CoverImage({ src, ratio = '16 / 9', maxHeight, radius = 0, alt = '' }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        maxHeight,
        overflow: 'hidden',
        borderRadius: radius,
        background: 'linear-gradient(135deg, var(--brown-pale), var(--brown-light))',
      }}
    >
      {src && (
        <>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </>
      )}
    </div>
  );
}
