import sharp from 'sharp';

/** Simulator PNGs are portrait; Kinmetrix iPad UI is landscape. */
export const RN_ROTATE_DEGREES = Number(process.env.RN_ROTATE_DEGREES ?? 90);

export async function rotateRnLandscape(file) {
  if (!RN_ROTATE_DEGREES) return;
  const buf = await sharp(file).rotate(RN_ROTATE_DEGREES).png().toBuffer();
  await sharp(buf).toFile(file);
}
