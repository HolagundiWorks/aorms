// One-off generator for PWA icons (2026-09-19) — run manually, not part of
// the build. Composites the existing AORMS mark (public/aorms-mark.png,
// 172x207, black-on-transparent) onto a Carbon Blue 60 (#0f62fe) square
// background at the two sizes a Web App Manifest needs. Two icon
// purposes per Chrome's own requirements:
//   - "any": the mark fills most of the canvas — used for the app icon
//     wherever the OS doesn't apply its own mask shape.
//   - "maskable": the mark is shrunk to fit inside the ~80% "safe zone"
//     circle, since Android may crop a maskable icon to a circle, squircle,
//     or rounded square — content outside that zone can be clipped.
import sharp from "sharp";

const MARK = "public/aorms-mark.png";
const BG = { r: 0x0f, g: 0x62, b: 0xfe, alpha: 1 };

async function makeIcon(size, markScale, outPath) {
  const markWidth = Math.round(size * markScale);
  const mark = await sharp(MARK).resize({ width: markWidth }).toBuffer();
  const markMeta = await sharp(mark).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(mark).resize({ width: markWidth }).negate({ alpha: false }).toBuffer().then((b) =>
          // Mark is black-on-transparent; recolor it white so it reads on the blue background.
          sharp(b)
            .tint({ r: 255, g: 255, b: 255 })
            .toBuffer(),
        ),
        left: Math.round((size - markWidth) / 2),
        top: Math.round((size - (markMeta.height ?? markWidth)) / 2),
      },
    ])
    .png()
    .toFile(outPath);
  console.log("wrote", outPath);
}

await makeIcon(512, 0.62, "public/icons/icon-512.png");
await makeIcon(192, 0.62, "public/icons/icon-192.png");
await makeIcon(512, 0.42, "public/icons/icon-maskable-512.png");
await makeIcon(192, 0.42, "public/icons/icon-maskable-192.png");
