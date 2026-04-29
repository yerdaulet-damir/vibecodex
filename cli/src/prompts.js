import prompts from 'prompts'
import kleur from 'kleur'

export async function selectStack() {
  console.log('')
  console.log(
    kleur.white('  vibecodex') +
    kleur.dim(' — production architecture for AI-assisted coding')
  )
  console.log('')

  const response = await prompts(
    {
      type: 'select',
      name: 'stack',
      message: 'Select your stack:',
      choices: [
        { title: 'FastAPI (Python)', value: 'fastapi' },
        { title: 'Next.js 15 (TypeScript)', value: 'nextjs' },
        { title: 'Go 1.22+', value: 'go' },
        { title: 'All stacks', value: 'all' },
      ],
      initial: 0,
    },
    { onCancel: () => process.exit(0) }
  )

  return response.stack
}
