import fs from 'node:fs'
import path from 'node:path'

const effectAllowlist = new Set([
  'src/shared/layout/DeviceFrame.tsx',
  'src/features/session-report/ui/ReportSheetDialog.tsx',
])

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

const fixtureBindings =
  /\b(RECORDED_SESSION|DIRECTION_NAMES|CLINICAL_NAMES|COMPARE_OPTIONS|PARTICIPANT|BASELINE_FORCES)\b/
const modelBrowserIo = /\b(document|localStorage|sessionStorage)\b/

const failures = []

for (const file of walk('src')) {
  const relativePath = file.split(path.sep).join('/')
  const baseName = path.basename(file)
  if (
    relativePath.startsWith('src/features/') &&
    (baseName === 'index.ts' || baseName === 'index.tsx')
  ) {
    failures.push(`feature barrel: ${relativePath}`)
  }
  if (!baseName.endsWith('.ts') && !baseName.endsWith('.tsx')) {
    continue
  }
  const source = fs.readFileSync(file, 'utf8')
  if (/\buseEffect\s*\(/.test(source) && !effectAllowlist.has(relativePath)) {
    failures.push(`useEffect outside allowlist: ${relativePath}`)
  }
  if (relativePath.includes('/model/') && modelBrowserIo.test(source)) {
    failures.push(`model browser I/O: ${relativePath}`)
  }
  if (relativePath.includes('/ui/') && fixtureBindings.test(source)) {
    failures.push(`ui fixture constant: ${relativePath}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
