import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { parseEnv } from 'node:util'

const args = process.argv.slice(2)
const skipBuildIndex = args.indexOf('--skip-build')
const skipBuild = skipBuildIndex !== -1
if (skipBuild) args.splice(skipBuildIndex, 1)

const envFile = existsSync('.env.test.local')
  ? '.env.test.local'
  : existsSync('.env.local')
    ? '.env.local'
    : null

const env = {
  ...process.env,
  ...(envFile ? parseEnv(readFileSync(envFile, 'utf8')) : {}),
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for local E2E tests.')

const hostname = new URL(supabaseUrl).hostname
if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
  throw new Error(`Refusing local E2E run against non-local Supabase host "${hostname}".`)
}

function run(commandArgs) {
  const result = spawnSync('pnpm', commandArgs, {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// NEXT_PUBLIC_* values are embedded by `next build`, so the build and browser
// test must receive the same selected environment.
if (!skipBuild) run(['build'])
run(['exec', 'playwright', 'test', ...args])
