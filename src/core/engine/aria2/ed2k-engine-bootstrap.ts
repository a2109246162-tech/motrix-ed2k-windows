/**
 * ED2K engine bootstrap (Windows port).
 *
 * macOS uses a shell wrapper (`ed2k-engine/aria2c-wrapper.sh`) to inject the
 * eD2k server / Kad bootstrap flags on every engine start. Windows cannot
 * spawn a `.cmd`/`.sh` wrapper directly from Node's `spawn()`, so this module
 * performs the same injection at the application layer: when the probed
 * engine identifies itself as aria2-next, the flags are appended to the aria2
 * argv. Appending at the tail is intentional — aria2 honours the *last*
 * occurrence of an option, so these values win over defaults in aria2.conf
 * and over Motrix's own `--min-split-size=4194304`.
 *
 * This module performs no network access. It only decides which arguments to
 * pass to the already-bundled aria2-next engine.
 */

import fs from 'node:fs'
import path from 'node:path'

/** Markers emitted by `aria2-next --version` / aria2.getVersion. */
const ED2K_ENGINE_PATTERN = /aria2-next|motrix-ed2k/i

/** Active eD2k servers used to bootstrap before server.met is refreshed. */
export const ED2K_BOOTSTRAP_SERVERS = [
  '176.125.242.230:5555',
  '176.116.0.62:7555',
  '176.123.5.89:4725',
  '176.116.0.51:6555',
  '54.37.74.32:4661',
  '185.213.22.235:4661',
  '85.17.116.222:6082',
  '213.252.245.239:43333',
  '213.141.198.207:4232',
  '185.25.48.89:18357',
  '57.128.161.24:6666',
  '213.252.245.239:33333',
  '57.130.51.107:4232',
].join(',')

export interface Ed2kEngineBootstrapOptions {
  /** Directory containing server.met / nodes.dat (the staged ed2k-engine dir). */
  bootstrapDir: string
  /** Version string from the engine feature report. */
  version: string
  /** Whether the engine advertises the motrix-only SQLite persistence token. */
  hasSqlitePersistence: boolean
}

/**
 * Whether the running engine is an ED2K-capable aria2-next build.
 * The SQLite3-Persistence token belongs to the upstream motrix fork only;
 * aria2-next deliberately omits it, so a version marker is the reliable
 * discriminator here.
 */
export function isEd2kEngine(version: string): boolean {
  return ED2K_ENGINE_PATTERN.test(version)
}

/**
 * Build the eD2k bootstrap argv tail. Returns an empty array when the engine
 * is not aria2-next (stock aria2 must receive no eD2k options) or when the
 * bootstrap directory is not configured.
 */
export function buildEd2kEngineArgs(
  options: Ed2kEngineBootstrapOptions
): string[] {
  const { bootstrapDir, version } = options
  if (!bootstrapDir || !isEd2kEngine(version)) return []

  const serverMet = path.join(bootstrapDir, 'server.met')
  const nodesDat = path.join(bootstrapDir, 'nodes.dat')
  const args: string[] = []

  if (fs.existsSync(serverMet))
    args.push(`--ed2k-server-list=${serverMet}`)
  if (fs.existsSync(nodesDat))
    args.push(`--ed2k-node-list=${nodesDat}`)

  args.push(
    `--ed2k-server=${ED2K_BOOTSTRAP_SERVERS}`,
    // Manual forwarding is documented; UPnP returned 501 on the test router.
    '--ed2k-port-mapping=false',
    // eD2k transfer tuning. Must be the last occurrences so they win.
    '--split=16',
    '--max-connection-per-server=16',
    '--min-split-size=1M',
    '--ed2k-max-connections=200'
  )
  return args
}
