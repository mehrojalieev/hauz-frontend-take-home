import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Fails the build if anything server-only reached the browser bundle.
 *
 * The first rule of the task is that browser JavaScript must never be able to
 * read the Appwrite session secret or any API key. Reviewing imports by hand
 * does not hold that line: TanStack Start replaces a server function export
 * with an RPC stub, so importing one is safe, but importing any ordinary value
 * from the same module pulls the whole module in, `node-appwrite` and all. That
 * is an easy mistake to make while moving fast and an invisible one afterwards,
 * so it is checked rather than remembered.
 *
 * Run with: npm run check:client
 */

const CLIENT_DIR = 'dist/client'

const FORBIDDEN = [
  { pattern: 'node-appwrite', why: 'the server SDK is in the browser bundle' },
  { pattern: 'X-Appwrite-Key', why: 'API key header handling reached the browser' },
  { pattern: 'X-Appwrite-Session', why: 'session header handling reached the browser' },
  { pattern: 'standard_', why: 'an Appwrite API key literal is in the bundle' },
]

// Whatever is actually in the environment, verbatim. Catches a key inlined
// under any name at all, including one nobody thought to look for.
for (const name of ['APPWRITE_API_KEY']) {
  const value = process.env[name]
  if (value && value.length > 16) {
    FORBIDDEN.push({ pattern: value, why: `the value of ${name} is in the bundle` })
  }
}

function* files(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    console.error(
      `✗ ${dir} not found. Run \`npm run build\` before this check.`,
    )
    process.exit(1)
  }

  for (const entry of entries) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      yield* files(path)
    } else {
      yield path
    }
  }
}

const found = []
let scanned = 0

for (const path of files(CLIENT_DIR)) {
  scanned += 1
  const contents = readFileSync(path, 'utf8')

  for (const { pattern, why } of FORBIDDEN) {
    if (contents.includes(pattern)) {
      found.push({ path, why })
    }
  }
}

// An empty directory must not read as a pass. A failed or half-cleaned build
// leaves nothing to scan, and "found no problems in no files" is not the same
// answer as "found no problems".
if (scanned === 0) {
  console.error(
    `\u2717 no files found under ${CLIENT_DIR}. The build did not produce a` +
      ` client bundle, so this check proves nothing. Run \`npm run build\` and` +
      ` read its output.`,
  )
  process.exit(1)
}

if (found.length > 0) {
  console.error(`✗ server-only code reached the browser bundle:\n`)
  for (const { path, why } of found) {
    console.error(`  ${path}\n    ${why}`)
  }
  console.error(
    `\nA component is importing an ordinary value from a server module.` +
      `\nMove what the component needs into src/shared/ and import it from there.`,
  )
  process.exit(1)
}

console.log(`✓ ${scanned} client files carry nothing server-only`)
