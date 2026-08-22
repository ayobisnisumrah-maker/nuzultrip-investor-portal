#!/usr/bin/env node
/**
 * Regenerates `src/types/database.ts` from the database schema.
 *
 * The database is the canonical schema (docs/DATABASE.md §13). This script is
 * also run in CI: if the regenerated output differs from what is committed, the
 * build fails, so schema drift surfaces as a build error rather than a runtime
 * surprise.
 *
 *   pnpm db:types              # generate from the local Supabase instance
 *   pnpm db:types --check      # verify the committed file is up to date
 *   SUPABASE_PROJECT_REF=xxx pnpm db:types --remote
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'src/types/database.ts')

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const remote = args.has('--remote')

const HEADER = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  pnpm db:types
 * Source of truth:  supabase/migrations/**
 *
 * See docs/DATABASE.md §13.
 */

`

function run() {
  const cliArgs = ['gen', 'types', 'typescript', '--schema', 'public', '--schema', 'app']
  if (remote) {
    const ref = process.env.SUPABASE_PROJECT_REF
    if (!ref) {
      console.error('SUPABASE_PROJECT_REF must be set when using --remote.')
      process.exit(1)
    }
    // The command is run through a shell (the Windows CLI ships as a .cmd shim
    // and cannot be spawned directly), so the one externally-supplied value is
    // validated rather than trusted.
    if (!/^[a-z0-9]{16,32}$/.test(ref)) {
      console.error(`SUPABASE_PROJECT_REF is not a valid project ref: ${ref}`)
      process.exit(1)
    }
    cliArgs.push('--project-id', ref)
  } else {
    cliArgs.push('--local')
  }

  try {
    console.log(
      `Generating database types from ${remote ? 'Supabase remote' : 'local migration'} schema...`,
    )
    return execSync(`supabase ${cliArgs.join(' ')}`, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    console.error('\nFailed to generate database types.\n')
    console.error('Check that the Supabase CLI is installed and, for local')
    console.error('generation, that `pnpm db:start` is running.\n')
    if (error && typeof error === 'object' && 'stderr' in error && error.stderr) {
      console.error(String(error.stderr))
    }
    process.exit(1)
  }
}

const generated = HEADER + run().trimStart()

if (checkOnly) {
  if (!existsSync(outputPath)) {
    console.error(`${outputPath} does not exist. Run: pnpm db:types`)
    process.exit(1)
  }
  const current = readFileSync(outputPath, 'utf8')
  if (current.trim() !== generated.trim()) {
    console.error('\nsrc/types/database.ts is out of date with the migrations.')
    console.error('Run `pnpm db:types` and commit the result.\n')
    process.exit(1)
  }
  console.log('src/types/database.ts is up to date.')
  process.exit(0)
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, generated, 'utf8')
console.log(`Wrote ${outputPath}`)
