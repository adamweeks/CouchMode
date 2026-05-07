// Generates PWA icons from the app's lightning bolt logo
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// Square icon SVG: dark background + lightning bolt centered
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0a2e"/>
      <stop offset="100%" style="stop-color:#0f0f17"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- Lightning bolt, centered and scaled from 48x46 viewBox to ~280px wide -->
  <g transform="translate(116, 108) scale(5.83)">
    <path fill="url(#bolt)" filter="url(#glow)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`

// Maskable icon: bolt on solid purple background (safe zone = center 80%)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed"/>
      <stop offset="100%" style="stop-color:#5b21b6"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ede9fe"/>
      <stop offset="100%" style="stop-color:#c4b5fd"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Bolt scaled to fit within 80% safe zone (410px), centered -->
  <g transform="translate(116, 108) scale(5.83)">
    <path fill="url(#bolt)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`

async function generate() {
  const svgBuf = Buffer.from(iconSvg)
  const maskableBuf = Buffer.from(maskableSvg)

  await sharp(svgBuf).resize(192, 192).png().toFile('public/icons/icon-192.png')
  console.log('✓ icon-192.png')

  await sharp(svgBuf).resize(512, 512).png().toFile('public/icons/icon-512.png')
  console.log('✓ icon-512.png')

  await sharp(svgBuf).resize(180, 180).png().toFile('public/apple-touch-icon.png')
  console.log('✓ apple-touch-icon.png (180x180)')

  await sharp(maskableBuf).resize(512, 512).png().toFile('public/icons/icon-512-maskable.png')
  console.log('✓ icon-512-maskable.png')

  await sharp(maskableBuf).resize(192, 192).png().toFile('public/icons/icon-192-maskable.png')
  console.log('✓ icon-192-maskable.png')

  console.log('\nAll icons generated!')
}

generate().catch(console.error)
