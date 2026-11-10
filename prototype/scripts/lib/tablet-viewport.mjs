import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const devicePath = path.join(prototypeRoot, 'visual-compare', 'device.json');

/** Landscape logical points for Kinmetrix IPad (iPad 10th generation). Keep in sync with kin-prototype.css. */
export function loadTabletViewport() {
  const device = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
  const width = Number(device.logicalWidth);
  const height = Number(device.logicalHeight);
  if (!width || !height) {
    throw new Error(`device.json must set logicalWidth and logicalHeight (${devicePath})`);
  }
  return { width, height };
}
