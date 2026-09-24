// Generates the iOS app icon (ios/CouchMode/Resources/Assets.xcassets/AppIcon.appiconset)
// from the same lightning-bolt artwork as the PWA icons (scripts/generate-icons.js).
// iOS applies its own rounded mask, so the artwork is full-bleed with no corner radius.
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0a2e"/>
      <stop offset="100%" style="stop-color:#0f0f17"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(116, 108) scale(5.83)">
    <path fill="url(#bolt)" filter="url(#glow)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`

await sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .flatten({ background: '#0f0f17' }) // App Store icons must not have an alpha channel
  .png()
  .toFile('ios/CouchMode/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png')
console.log('✓ ios AppIcon.png (1024x1024)')
