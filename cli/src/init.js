import { selectStack } from './prompts.js'
import { copyFiles } from './copy.js'
import kleur from 'kleur'

const STACKS = {
  fastapi: {
    label: 'FastAPI (Python)',
    files: [
      'CLAUDE.md',
      '.cursor/rules/architecture.mdc',
      '.cursor/rules/decomposition.mdc',
      '.cursor/rules/integrations.mdc',
      '.claude/skills/debug-backend/SKILL.md',
      '.claude/skills/new-feature/SKILL.md',
      '.claude/skills/add-provider/SKILL.md',
      '.claude/skills/split-monolith/SKILL.md',
    ],
  },
  nextjs: {
    label: 'Next.js 15 (TypeScript)',
    files: [
      'CLAUDE.md',
      '.cursor/rules/architecture.mdc',
      '.claude/skills/debug-frontend/SKILL.md',
      '.claude/skills/new-feature-nextjs/SKILL.md',
    ],
  },
  go: {
    label: 'Go 1.22+',
    files: [
      'CLAUDE.md',
      '.claude/skills/debug-go/SKILL.md',
      '.claude/skills/new-feature-go/SKILL.md',
    ],
  },
}

export async function run() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('')
    console.log(kleur.white('  vibecodex') + kleur.dim(' — production architecture for AI-assisted coding'))
    console.log('')
    console.log(kleur.dim('  Usage:'))
    console.log('    npx vibecodex init                  ' + kleur.dim('# interactive'))
    console.log('    npx vibecodex init --stack fastapi  ' + kleur.dim('# FastAPI + Python'))
    console.log('    npx vibecodex init --stack nextjs   ' + kleur.dim('# Next.js 15'))
    console.log('    npx vibecodex init --stack go       ' + kleur.dim('# Go 1.22+'))
    console.log('    npx vibecodex init --stack all      ' + kleur.dim('# all stacks'))
    console.log('')
    console.log(kleur.dim('  https://github.com/yerdaulet-damir/vibecodex'))
    console.log('')
    process.exit(0)
  }

  if (cmd !== 'init') {
    console.error(kleur.red(`  Unknown command: ${cmd}`))
    process.exit(1)
  }

  const stackFlagIdx = args.indexOf('--stack')
  const dryRun = args.includes('--dry-run')

  let selectedStack
  if (stackFlagIdx !== -1) {
    selectedStack = args[stackFlagIdx + 1]
  } else {
    selectedStack = await selectStack()
  }

  if (!selectedStack) process.exit(0)

  console.log('')

  if (dryRun) {
    console.log(kleur.dim('  dry-run — no files written'))
    console.log('')
  }

  // Collect files
  let files = []
  if (selectedStack === 'all') {
    const seen = new Set()
    for (const s of Object.values(STACKS)) {
      for (const f of s.files) {
        if (!seen.has(f)) { seen.add(f); files.push(f) }
      }
    }
  } else {
    const stack = STACKS[selectedStack]
    if (!stack) {
      console.error(kleur.red(`  Unknown stack: ${selectedStack}`))
      console.error(kleur.dim('  Use: fastapi, nextjs, go, or all'))
      process.exit(1)
    }
    files = stack.files
  }

  await copyFiles(files, dryRun)

  console.log('')
  console.log(
    kleur.green('  Done.') +
    kleur.dim(' Your AI now follows vibecodex principles.')
  )
  console.log('')
  console.log(kleur.dim('  Next: open CLAUDE.md to see what Claude will follow.'))
  console.log(kleur.dim('  Docs: https://github.com/yerdaulet-damir/vibecodex'))
  console.log('')
}
