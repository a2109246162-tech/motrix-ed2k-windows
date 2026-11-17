import fs from 'node:fs'
import path from 'node:path'
import type { DownloadTask } from '@shared/types/task'

/** 50% of downloaded bytes is shared back unless the user chooses otherwise. */
export const DEFAULT_ED2K_SHARE_RATIO = 0.5

export type Ed2kShareRatio = number

interface SharingEntry {
  taskId: string
  engineGid: string
  ratio: Ed2kShareRatio
}

export interface Ed2kSharingDeps {
  userDataDir: string
  adapter: {
    getUploadLength(engineTaskId: string): Promise<number>
    removeTask(engineTaskId: string): Promise<void>
  }
  taskManager: {
    getAll(): readonly DownloadTask[]
    getByEngineTaskId(engineTaskId: string): DownloadTask | undefined
  }
  settings: {
    get(): { engine: { ed2kShareBandwidth?: boolean } }
  }
}

const PRESET_RATIOS: readonly number[] = [-1, 0, 0.5, 1, 1.5, 2, 3, 5, 10]
let monitorTimer: NodeJS.Timeout | undefined

function configPath(userDataDir: string) {
  return path.join(userDataDir, 'ed2k-sharing.json')
}

function isValidRatio(ratio: unknown): ratio is number {
  return (
    typeof ratio === 'number' &&
    Number.isFinite(ratio) &&
    (ratio === -1 || ratio === 0 || (ratio > 0 && ratio <= 10))
  )
}

function readEntries(userDataDir: string): SharingEntry[] {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(configPath(userDataDir), 'utf8')
    )
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SharingEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as SharingEntry).taskId === 'string' &&
        typeof (entry as SharingEntry).engineGid === 'string' &&
        isValidRatio((entry as SharingEntry).ratio)
    )
  } catch {
    return []
  }
}

function writeEntries(userDataDir: string, entries: readonly SharingEntry[]) {
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(
    configPath(userDataDir),
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8'
  )
}

export function setEd2kShareRatio(
  deps: Ed2kSharingDeps,
  taskId: string,
  engineGid: string,
  ratio: Ed2kShareRatio
) {
  if (!isValidRatio(ratio)) throw new Error('Invalid ED2K share ratio')
  const entries = readEntries(deps.userDataDir).filter(
    (entry) => entry.taskId !== taskId
  )
  entries.push({ taskId, engineGid, ratio })
  writeEntries(deps.userDataDir, entries)
}

export function getEd2kShareRatio(
  userDataDir: string,
  taskId: string
): Ed2kShareRatio {
  return (
    readEntries(userDataDir).find((entry) => entry.taskId === taskId)?.ratio ??
    DEFAULT_ED2K_SHARE_RATIO
  )
}

export function getEd2kPresetRatios(): readonly number[] {
  return PRESET_RATIOS
}

interface ContributionData {
  last: Record<string, string>
  days: Record<string, Record<string, { name: string; bytes: string }>>
}

export interface Ed2kContributionSnapshot {
  totalBytes: string
  days: Array<{
    date: string
    bytes: string
    tasks: Array<{ name: string; bytes: string }>
  }>
}

function contributionPath(userDataDir: string) {
  return path.join(userDataDir, 'ed2k-contribution.json')
}

function readContribution(userDataDir: string): ContributionData {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(contributionPath(userDataDir), 'utf8')
    ) as Partial<ContributionData>
    return {
      last: parsed.last ?? {},
      days: parsed.days ?? {},
    }
  } catch {
    return { last: {}, days: {} }
  }
}

function writeContribution(userDataDir: string, data: ContributionData) {
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(
    contributionPath(userDataDir),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8'
  )
}

function dayKey(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function recordContribution(
  userDataDir: string,
  task: DownloadTask,
  uploaded: number
) {
  if (!Number.isFinite(uploaded) || uploaded <= 0) return
  const data = readContribution(userDataDir)
  const previous = Number.parseInt(data.last[task.id] ?? '0', 10)
  const delta = uploaded >= previous ? uploaded - previous : uploaded
  if (delta <= 0) return
  const date = dayKey()
  const day = data.days[date] ?? {}
  const current = day[task.id] ?? { name: task.name, bytes: '0' }
  current.name = task.name
  current.bytes = (BigInt(current.bytes) + BigInt(delta)).toString()
  day[task.id] = current
  data.days[date] = day
  data.last[task.id] = String(uploaded)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const oldest = dayKey(cutoff)
  for (const key of Object.keys(data.days)) {
    if (key < oldest) delete data.days[key]
  }
  writeContribution(userDataDir, data)
}

export function getEd2kContribution(
  userDataDir: string
): Ed2kContributionSnapshot {
  const data = readContribution(userDataDir)
  let total = 0n
  const days = Object.entries(data.days)
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, tasks]) => {
      let bytes = 0n
      const entries = Object.values(tasks).map((task) => {
        const value = BigInt(task.bytes)
        bytes += value
        return { name: task.name, bytes: value.toString() }
      })
      total += bytes
      return {
        date,
        bytes: bytes.toString(),
        tasks: entries.sort((a, b) => {
          const diff = BigInt(b.bytes) - BigInt(a.bytes)
          return diff > 0n ? 1 : diff < 0n ? -1 : 0
        }),
      }
    })
  return { totalBytes: total.toString(), days }
}

export function startEd2kSharingMonitor(deps: Ed2kSharingDeps) {
  if (monitorTimer) return
  const tick = async () => {
    const sharingEnabled =
      deps.settings.get().engine.ed2kShareBandwidth !== false
    const overrides = readEntries(deps.userDataDir)
    const overrideIds = new Set(overrides.map((entry) => entry.taskId))
    const candidates: SharingEntry[] = [...overrides]

    // Tasks without an explicit choice use the 50% default. This makes the
    // policy apply to every ED2K download, not only menu-customised ones.
    for (const task of deps.taskManager.getAll()) {
      if (overrideIds.has(task.id)) continue
      if (!task.uris.some((uri) => uri.startsWith('ed2k://'))) continue
      if (!task.engineTaskId) continue
      candidates.push({
        taskId: task.id,
        engineGid: task.engineTaskId,
        ratio: DEFAULT_ED2K_SHARE_RATIO,
      })
    }

    const remainingOverrides: SharingEntry[] = []
    for (const entry of candidates) {
      const isOverride = overrideIds.has(entry.taskId)
      // The global switch overrides every per-task choice: when it is off,
      // sharing is 0 for all ED2K tasks.
      const effectiveRatio = sharingEnabled ? entry.ratio : 0
      if (effectiveRatio === -1) {
        if (isOverride) remainingOverrides.push(entry)
        continue
      }
      const task = deps.taskManager.getByEngineTaskId(entry.engineGid)
      if (
        !task ||
        task.id !== entry.taskId ||
        !task.uris.some((uri) => uri.startsWith('ed2k://'))
      ) {
        continue
      }
      if (effectiveRatio === 0 && task.status !== 'completed') {
        if (isOverride) remainingOverrides.push(entry)
        continue
      }
      try {
        const downloaded = Math.max(
          0,
          Number(task.downloadedBytes) || Number(task.totalBytes) || 0
        )
        const uploaded = await deps.adapter.getUploadLength(entry.engineGid)
        recordContribution(deps.userDataDir, task, uploaded)
        const reached =
          effectiveRatio === 0 ||
          (downloaded > 0 && uploaded >= downloaded * effectiveRatio)
        if (reached) {
          await deps.adapter.removeTask(entry.engineGid)
          continue
        }
      } catch {
        // Keep the override for the next tick; a transient RPC failure must
        // not silently disable a user's sharing policy.
      }
      if (isOverride) remainingOverrides.push(entry)
    }
    writeEntries(deps.userDataDir, remainingOverrides)
  }
  monitorTimer = setInterval(() => {
    void tick()
  }, 10_000)
  monitorTimer.unref?.()
}
