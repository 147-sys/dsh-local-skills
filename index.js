/**
 * dsh-local-skills — surface user-level DSH skills to the session catalog.
 *
 * Why this exists: in this deployment `~/.dsh/skills` skills never reach a session
 * catalog. The skills-manager plugin refuses per-skill policy on the native `dsh`
 * root (`error.root.readonly`) and its candidate builder skips native-root skills
 * when no policy overlay exists, so nothing renders them. Registering the directory
 * through a bundle provider is the mechanism that provably works here (the same way
 * dsh-tylina ships its Typst skills), so this plugin mirrors it with zero runtime
 * dependencies.
 *
 * @module dsh-local-skills
 */

import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Cordis plugin name. */
export const name = 'dsh-local-skills'

/** Service required to register the provider. */
export const inject = ['skills']

const PROVIDER_NAME = 'dsh-local-skills'
/** Same rank the native user-dsh root uses; never outranks a project copy. */
const USER_DSH_RANK = 400

function resolveDshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** Directories scanned, in order. First match wins for a duplicate skill name. */
export function skillRoots() {
  const roots = []
  if (typeof process.env.DSH_LOCAL_SKILL_DIRS === 'string') {
    for (const part of process.env.DSH_LOCAL_SKILL_DIRS.split(/[;,]/)) {
      const trimmed = part.trim()
      if (trimmed) roots.push(trimmed)
    }
  }
  if (roots.length === 0) roots.push(join(resolveDshHome(), 'skills'))
  return roots
}

/**
 * Parse the frontmatter this catalog needs. Intentionally narrow: a single-line
 * `name` and `description`, which is what every SKILL.md in the wild declares.
 */
function parseSkill(entryName, raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return null
  const frontmatter = match[1]
  const declared = /^name:\s*(.+?)\s*$/m.exec(frontmatter)?.[1]
  const quoted = /^description:\s*"([^"]*)"\s*$/m.exec(frontmatter)?.[1]
  const plain = /^description:\s*(?!["'])(.+?)\s*$/m.exec(frontmatter)?.[1]
  const description = (quoted ?? plain)?.trim()
  const skillName = (declared ?? entryName).trim()
  if (!skillName || !description) return null
  return { skillName, description, bodyStart: match[0].length }
}

/** Discover directory-bundle skills (a directory containing SKILL.md). */
export function discoverSkills() {
  const discovered = new Map()
  for (const [index, root] of skillRoots().entries()) {
    let entries
    try {
      entries = readdirSync(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue
      const directory = join(root, entry.name)
      const body = join(directory, 'SKILL.md')
      let raw
      try {
        raw = readFileSync(body, 'utf8')
      } catch {
        continue
      }
      const parsed = parseSkill(entry.name, raw)
      if (!parsed || discovered.has(parsed.skillName)) continue
      discovered.set(parsed.skillName, {
        name: parsed.skillName,
        description: parsed.description,
        invocation: { modelInvocable: true, userInvocable: true },
        provider: PROVIDER_NAME,
        source: index === 0 ? 'bundled' : 'custom',
        rank: USER_DSH_RANK,
        resourceBase: { kind: 'directory', path: directory },
        path: body,
        locator: { body, bodyStart: parsed.bodyStart },
      })
    }
  }
  return [...discovered.values()]
}

function createProvider() {
  const read = () => discoverSkills()
  return {
    name: PROVIDER_NAME,
    list: () => Promise.resolve(read()),
    async get(candidate, options = {}) {
      const selected = read().find((item) => item.name === candidate?.name)
      if (!selected) return undefined
      const raw = readFileSync(selected.locator.body, { encoding: 'utf8', signal: options.signal })
      const { rank: _rank, locator, ...summary } = selected
      return { ...summary, content: raw.slice(locator.bodyStart).trim() }
    },
  }
}

/** Register the provider on the host skill registry. */
export function apply(ctx) {
  ctx.logger?.info?.(`[dsh-local-skills] scanning ${skillRoots().join(', ')}`)
  ctx.skills.registerProvider(createProvider)
}
