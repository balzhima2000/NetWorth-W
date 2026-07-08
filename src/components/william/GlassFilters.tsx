import { useEffect } from 'react';

/**
 * GlassFilters — Tier-2 "liquid glass" refraction for the nav (`.nav-glass`).
 *
 * Figma's NavPill uses a native GLASS effect (refraction/depth/dispersion) that
 * plain `backdrop-filter: blur()` can't reproduce. This adds an SVG displacement
 * map fed into `backdrop-filter: url(#nav-glass-lens)`, so the page content
 * behind the pill actually bends like thick glass.
 *
 * It's a progressive enhancement: SVG filters in `backdrop-filter` render only
 * in Chromium, so we gate it to a `data-glass="refraction"` flag on <html> and
 * fall back to the Tier-1 frost (in william.css) everywhere else.
 *
 * The displacement map is a bulge normal map — a horizontal red ramp (x shift)
 * screened with a vertical green ramp (y shift); centre = rgb(128,128) = no
 * shift, edges push outward → a convex-lens refraction. `preserveAspectRatio
 * ="none"` stretches the 100×100 map onto any element, so it fits both the pill
 * and the round account island without per-size maps.
 */
const MAP_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>" +
  "<defs>" +
  "<linearGradient id='r' x1='0' y1='0' x2='1' y2='0'>" +
  "<stop offset='0' stop-color='rgb(0,0,0)'/><stop offset='1' stop-color='rgb(255,0,0)'/>" +
  "</linearGradient>" +
  "<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
  "<stop offset='0' stop-color='rgb(0,0,0)'/><stop offset='1' stop-color='rgb(0,255,0)'/>" +
  "</linearGradient>" +
  "</defs>" +
  "<rect width='100' height='100' fill='url(#r)'/>" +
  "<rect width='100' height='100' fill='url(#g)' style='mix-blend-mode:screen'/>" +
  "</svg>";

const MAP = `data:image/svg+xml,${encodeURIComponent(MAP_SVG)}`;

export function GlassFilters() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(ua);
    const isFirefox = /firefox/i.test(ua);
    const ok =
      !isSafari &&
      !isFirefox &&
      (CSS.supports('backdrop-filter', 'url(#a)') ||
        CSS.supports('-webkit-backdrop-filter', 'url(#a)'));
    if (ok) document.documentElement.setAttribute('data-glass', 'refraction');
  }, []);

  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="nav-glass-lens" colorInterpolationFilters="sRGB">
          <feImage href={MAP} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
