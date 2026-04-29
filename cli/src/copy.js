import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import kleur from 'kleur'

const BASE_URL = 'https://raw.githubusercontent.com/yerdaulet-damir/vibecodex/main'

export async function copyFiles(files, dryRun = false) {
  const cwd = process.cwd()

  for (const file of files) {
    const url = `${BASE_URL}/${file}`
    const dest = join(cwd, file)

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const content = await res.text()

      if (!dryRun) {
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, content, 'utf8')
      }

      console.log(kleur.green('  ✓ ') + kleur.dim(file))
    } catch (err) {
      console.log(kleur.red('  ✗ ') + kleur.dim(file) + kleur.red(` (${err.message})`))
    }
  }
}
