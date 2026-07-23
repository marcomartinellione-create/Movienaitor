/* Genera le sorgenti icona/splash (PNG) da SVG, per @capacitor/assets.
   Eseguito in CI dalla cartella app-mobile/. */
const sharp = require('sharp');
const fs = require('fs');

(async () => {
  if (!fs.existsSync('assets')) fs.mkdirSync('assets');

  // primo piano dell'icona adattiva: ciak trasparente nella zona sicura
  const fg = await sharp('assets/icon-fg.svg', { density: 512 })
    .resize(1024, 1024, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .png().toBuffer();
  await sharp(fg).toFile('assets/icon-foreground.png');

  // sfondo dell'icona adattiva: tinta unita velluto
  await sharp({ create: { width:1024, height:1024, channels:4, background:'#140a0c' } })
    .png().toFile('assets/icon-background.png');

  // icona "legacy" piena (con lo sfondo arrotondato)
  const only = await sharp('www/icon.svg', { density: 512 }).resize(1024, 1024).png().toBuffer();
  await sharp(only).toFile('assets/icon-only.png');

  // splash: fondo scuro con il ciak al centro
  const badge = await sharp('assets/icon-fg.svg', { density: 512 })
    .resize(900, 900, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .png().toBuffer();
  const splash = await sharp({ create: { width:2732, height:2732, channels:4, background:'#140a0c' } })
    .composite([{ input: badge, gravity: 'center' }]).png().toBuffer();
  await sharp(splash).toFile('assets/splash.png');
  await sharp(splash).toFile('assets/splash-dark.png');

  console.log('icone e splash generati');
})().catch(e => { console.error(e); process.exit(1); });
