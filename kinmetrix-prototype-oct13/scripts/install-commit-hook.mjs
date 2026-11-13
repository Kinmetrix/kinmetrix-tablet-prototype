import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
const hooksDir = path.join(repoRoot, '.git', 'hooks')
if (!fs.existsSync(hooksDir)) {
  process.exit(0)
}

const source = path.resolve('.githooks/commit-msg')
const destination = path.join(hooksDir, 'commit-msg')
fs.copyFileSync(source, destination)
fs.chmodSync(destination, 0o755)
