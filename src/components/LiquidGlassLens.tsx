import { useEffect, useId, useMemo, useRef, useState } from 'react';

const refractionScale = 80;

/** A convex droplet lens across the surface, with a tighter rounded meniscus. */
function displacementMap(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(width, height);
  const radius = Math.min(24, width / 2, height / 2);
  const rim = 18;
  const encode = (displacement: number) =>
    Math.round(127.5 + (displacement / refractionScale) * 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5 - width / 2;
      const py = y + 0.5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - radius);
      const qy = Math.abs(py) - (height / 2 - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const distance = -(outside + Math.min(Math.max(qx, qy), 0) - radius);
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        nx = (qx / outside) * Math.sign(px);
        ny = (qy / outside) * Math.sign(py);
      } else if (qx > qy) nx = Math.sign(px);
      else ny = Math.sign(py);
      const bend = Math.pow(Math.max(0, 1 - Math.max(0, distance) / rim), 2);
      const u = px / (width / 2);
      const v = py / (height / 2);
      // A broad convex surface pulls sampling points toward the optical center.
      // Its changing slope magnifies and bends objects throughout the interior;
      // the displacement is zero only at the exact center, as in a real lens.
      const dome = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
      const bodyBend = 0.34 * dome;
      const dx = -px * bodyBend - nx * bend * 13;
      const dy = -py * bodyBend - ny * bend * 13;
      const offset = (y * width + x) * 4;
      image.data[offset] = encode(dx);
      image.data[offset + 1] = encode(dy);
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/** Tuck the reflected bottom and right strips into the rim. */
function edgeReflectionMap(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(width, height);
  const reflection = refractionScale / 2;
  const shiftToRim = (position: number, extent: number, edge: number) => {
    const start = extent - Math.min(refractionScale, extent / 2);
    const crest = extent - edge;
    if (position > start && position <= crest) {
      const t = (position - start) / (crest - start);
      return -(reflection - edge) * Math.sin((t * Math.PI) / 2) ** 2;
    }
    if (position > crest) {
      const t = (position - crest) / edge;
      return -(reflection - edge) * (1 - t * t * (3 - 2 * t));
    }
    return 0;
  };
  const encode = (shift: number) =>
    Math.round(127.5 + (shift / refractionScale) * 255);
  const horizontal = Array.from({ length: width }, (_, x) =>
    encode(shiftToRim(x, width, 3)),
  );
  for (let y = 0; y < height; y += 1) {
    const vertical = encode(shiftToRim(y, height, 5));
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      image.data[offset] = horizontal[x];
      image.data[offset + 1] = vertical;
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export function LiquidGlassLens() {
  const id = `glass-lens-${useId().replace(/:/g, '')}`;
  const surface = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!surface.current) return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        setSize((previous) =>
          previous.width === width && previous.height === height
            ? previous
            : { width, height },
        );
      });
    });
    observer.observe(surface.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  const map = useMemo(
    () =>
      size.width && size.height ? displacementMap(size.width, size.height) : '',
    [size.width, size.height],
  );
  const reflectionMap = useMemo(
    () =>
      size.width && size.height
        ? edgeReflectionMap(size.width, size.height)
        : '',
    [size.width, size.height],
  );
  return (
    <>
      <svg
        className="glass-lens-definitions"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={id}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={map || undefined}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="lens-map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="lens-map"
              scale={refractionScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="glass-base"
            />
            <feImage
              href={reflectionMap || undefined}
              x="0"
              y="0"
              width={size.width}
              height={size.height}
              preserveAspectRatio="none"
              result="reflection-map"
            />
            <feDisplacementMap
              in="glass-base"
              in2="reflection-map"
              scale={refractionScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span
        ref={surface}
        aria-hidden="true"
        className="liquid-glass-lens"
        style={
          map
            ? ({ '--glass-refraction': `url(#${id})` } as React.CSSProperties)
            : undefined
        }
      />
    </>
  );
}
