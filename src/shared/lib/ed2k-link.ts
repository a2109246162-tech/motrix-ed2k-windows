/**
 * ED2K link syntax validation.
 *
 * This module only recognises and validates the textual representation of an
 * eD2k link. It intentionally performs no network access and does not imply
 * that the bundled download engine can fetch the resource: Motrix uses aria2,
 * which has no eD2k support. Keeping recognition separate from execution lets
 * the UI give a precise diagnostic instead of mislabelling a well-formed link
 * as "unsupported protocol".
 */

export type Ed2kLinkKind = 'file' | 'server' | 'serverlist'

export type Ed2kReason =
  | 'invalidEd2kStructure'
  | 'invalidEd2kType'
  | 'invalidEd2kName'
  | 'invalidEd2kSize'
  | 'invalidEd2kHash'
  | 'invalidEd2kSources'
  | 'invalidEd2kServer'
  | 'invalidEd2kServerList'

export interface Ed2kFileLink {
  kind: 'file'
  name: string
  size: number
  hash: string
  sources: string[]
}

export interface Ed2kServerLink {
  kind: 'server'
  host: string
  port: number
}

export interface Ed2kServerListLink {
  kind: 'serverlist'
  url: string
}

export type Ed2kLink = Ed2kFileLink | Ed2kServerLink | Ed2kServerListLink

export type Ed2kParseResult =
  | { status: 'valid'; link: Ed2kLink; canonical: string }
  | {
      status: 'invalid'
      reason: Ed2kReason
      start: number
      end: number
    }

const SCHEME = /^ed2k:\/\//i
const HASH = /^[0-9a-f]{32}$/i
const SIZE = /^\d+$/
const PORT = /^\d{1,5}$/
const SOURCE = /^[^\s|,/:]+:\d{1,5}$/

function invalid(
  reason: Ed2kReason,
  start: number,
  end: number
): Ed2kParseResult {
  return { status: 'invalid', reason, start, end }
}

/** Byte offsets of a pipe-delimited segment, including its leading pipe. */
function segmentOffset(
  segments: string[],
  index: number,
  prefixLength: number
) {
  let offset = prefixLength
  for (let i = 0; i < index; i++) offset += segments[i].length + 1
  return { start: offset, end: offset + segments[index].length }
}

function validPort(value: string): number | null {
  if (!PORT.test(value)) return null
  const port = Number(value)
  return port >= 1 && port <= 65535 ? port : null
}

function parseSources(value: string): string[] | null {
  if (!value.startsWith('sources,')) return null
  const list = value.slice('sources,'.length)
  if (!list) return []
  const sources = list.split(',')
  return sources.every((source) => SOURCE.test(source)) ? sources : null
}

export function parseEd2kLink(raw: string): Ed2kParseResult {
  const scheme = SCHEME.exec(raw)
  if (!scheme) return invalid('invalidEd2kStructure', 0, raw.length)

  const canonicalScheme = 'ed2k://'
  const body = raw.slice(scheme[0].length)
  if (!body.startsWith('|') || !body.endsWith('|/'))
    return invalid('invalidEd2kStructure', 0, raw.length)

  const segments = body.split('|')
  // "|file|name|size|hash|/" -> ["", "file", "name", "size", "hash", "/"]
  if (segments.length < 4 || segments[segments.length - 1] !== '/')
    return invalid('invalidEd2kStructure', 0, raw.length)

  const kind = segments[1].toLowerCase()
  if (kind !== 'file' && kind !== 'server' && kind !== 'serverlist') {
    const at = segmentOffset(segments, 1, canonicalScheme.length)
    return invalid('invalidEd2kType', at.start, at.end)
  }

  if (kind === 'file') {
    if (segments.length < 6 || segments[segments.length - 1] !== '/')
      return invalid('invalidEd2kStructure', 0, raw.length)

    const nameAt = segmentOffset(segments, 2, canonicalScheme.length)
    const name = segments[2]
    if (
      !name ||
      name.includes('/') ||
      name.includes('\\') ||
      [...name].some((char) => {
        const code = char.charCodeAt(0)
        return code <= 31 || code === 127
      })
    )
      return invalid('invalidEd2kName', nameAt.start, nameAt.end)

    const sizeAt = segmentOffset(segments, 3, canonicalScheme.length)
    const sizeText = segments[3]
    if (!SIZE.test(sizeText) || !Number.isSafeInteger(Number(sizeText)))
      return invalid('invalidEd2kSize', sizeAt.start, sizeAt.end)

    const hashAt = segmentOffset(segments, 4, canonicalScheme.length)
    const hash = segments[4]
    if (!HASH.test(hash))
      return invalid('invalidEd2kHash', hashAt.start, hashAt.end)

    let sources: string[] = []
    if (segments.length > 6) {
      // Remaining segments are "|sources,...|/" only.
      if (segments.length !== 8 || !segments[6].startsWith('sources,'))
        return invalid('invalidEd2kStructure', 0, raw.length)
      const sourcesAt = segmentOffset(segments, 6, canonicalScheme.length)
      const parsedSources = parseSources(segments[6])
      if (!parsedSources)
        return invalid('invalidEd2kSources', sourcesAt.start, sourcesAt.end)
      sources = parsedSources
    }

    const canonical =
      `${canonicalScheme}|file|${name}|${sizeText}|${hash.toUpperCase()}|/` +
      (sources.length ? `|sources,${sources.join(',')}|/` : '')
    return {
      status: 'valid',
      link: {
        kind: 'file',
        name,
        size: Number(sizeText),
        hash: hash.toUpperCase(),
        sources,
      },
      canonical,
    }
  }

  if (kind === 'server') {
    if (segments.length !== 5)
      return invalid('invalidEd2kStructure', 0, raw.length)
    const hostAt = segmentOffset(segments, 2, canonicalScheme.length)
    const portAt = segmentOffset(segments, 3, canonicalScheme.length)
    const host = segments[2]
    const port = validPort(segments[3])
    if (!host || /[\s|/\\]/.test(host))
      return invalid('invalidEd2kServer', hostAt.start, hostAt.end)
    if (port === null)
      return invalid('invalidEd2kServer', portAt.start, portAt.end)
    return {
      status: 'valid',
      link: { kind: 'server', host, port },
      canonical: `${canonicalScheme}|server|${host}|${port}|/`,
    }
  }

  if (segments.length !== 4)
    return invalid('invalidEd2kStructure', 0, raw.length)
  const urlAt = segmentOffset(segments, 2, canonicalScheme.length)
  const url = segments[2]
  if (!/^https?:\/\/[^\s|]+$/i.test(url))
    return invalid('invalidEd2kServerList', urlAt.start, urlAt.end)
  return {
    status: 'valid',
    link: { kind: 'serverlist', url },
    canonical: `${canonicalScheme}|serverlist|${url}|/`,
  }
}

/**
 * Return the file name carried by an ED2K file link.
 *
 * `new URL()` cannot parse `ed2k://|file|name|size|hash|/`, so callers that
 * need a display/output name must use this helper instead of a URL basename.
 */
export function ed2kLinkFilename(raw: string): string | null {
  const parsed = parseEd2kLink(raw)
  if (parsed.status !== 'valid' || parsed.link.kind !== 'file') return null
  try {
    return decodeURIComponent(parsed.link.name)
  } catch {
    return parsed.link.name
  }
}
