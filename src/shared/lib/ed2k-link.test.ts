import { describe, expect, it } from 'vitest'
import { ed2kLinkFilename, parseEd2kLink } from './ed2k-link'

describe('ED2K link recognition', () => {
  it.each([
    [
      'ed2k://|file|mu_office_home_and_business_2016_for_mac_mac_dvd_7027756.iso|1214924800|D6FA02597D30709949C4FEA6AA0F9D6B|/',
      {
        kind: 'file',
        name: 'mu_office_home_and_business_2016_for_mac_mac_dvd_7027756.iso',
        size: 1214924800,
        hash: 'D6FA02597D30709949C4FEA6AA0F9D6B',
        sources: [],
      },
    ],
    [
      'ed2k://|file|example.iso|1234567890|0123456789ABCDEF0123456789ABCDEF|/',
      {
        kind: 'file',
        name: 'example.iso',
        size: 1234567890,
        hash: '0123456789ABCDEF0123456789ABCDEF',
        sources: [],
      },
    ],
    [
      'ED2K://|FILE|windows 10.iso|3821895680|ff17ff2d5919e3a560151bbc11c399d1|/',
      {
        kind: 'file',
        name: 'windows 10.iso',
        size: 3821895680,
        hash: 'FF17FF2D5919E3A560151BBC11C399D1',
        sources: [],
      },
    ],
    [
      'ed2k://|file|a.iso|10|0123456789ABCDEF0123456789ABCDEF|/|sources,192.168.1.2:4662|/',
      {
        kind: 'file',
        name: 'a.iso',
        size: 10,
        hash: '0123456789ABCDEF0123456789ABCDEF',
        sources: ['192.168.1.2:4662'],
      },
    ],
    [
      'ed2k://|server|server.example.org|4662|/',
      { kind: 'server', host: 'server.example.org', port: 4662 },
    ],
    [
      'ed2k://|serverlist|https://example.org/list.met|/',
      { kind: 'serverlist', url: 'https://example.org/list.met' },
    ],
  ])('accepts a common format: %s', (input, expectedLink) => {
    const result = parseEd2kLink(input)
    expect(result.status).toBe('valid')
    if (result.status !== 'valid') return
    expect(result.link).toEqual(expectedLink)
    expect(parseEd2kLink(result.canonical)).toEqual(result)
  })

  it.each([
    ['https://example.org/a', 'invalidEd2kStructure'],
    [
      'ed2k://|file|a.iso|10|0123456789ABCDEF0123456789ABCDEF',
      'invalidEd2kStructure',
    ],
    [
      'ed2k://|movie|a.iso|10|0123456789ABCDEF0123456789ABCDEF|/',
      'invalidEd2kType',
    ],
    ['ed2k://|file||10|0123456789ABCDEF0123456789ABCDEF|/', 'invalidEd2kName'],
    ['ed2k://|file|a|b|0123456789ABCDEF0123456789ABCDEF|/', 'invalidEd2kSize'],
    ['ed2k://|file|a|10|0123456789ABCDEF0123456789ABCDE|/', 'invalidEd2kHash'],
    ['ed2k://|file|a|10|ZZZZ456789ABCDEF0123456789ABCDEF|/', 'invalidEd2kHash'],
    [
      'ed2k://|file|a|10|0123456789ABCDEF0123456789ABCDEF|/|sources,bad|/',
      'invalidEd2kSources',
    ],
    ['ed2k://|server|host|not-a-port|/', 'invalidEd2kServer'],
    ['ed2k://|serverlist|ftp://example.org/list|/', 'invalidEd2kServerList'],
  ])('rejects %s as %s', (input, reason) => {
    expect(parseEd2kLink(input)).toMatchObject({ status: 'invalid', reason })
  })

  it('reports the exact range of the 31-character hash from the screenshot', () => {
    const link =
      'ed2k://|file|cn_windows_10_enterprise_ltsc_2016_x64_dvd_0908409.iso|3821895680|FF7FF2D5919E3A560151BBC11C399D1|/'
    const result = parseEd2kLink(link)
    expect(result).toMatchObject({
      status: 'invalid',
      reason: 'invalidEd2kHash',
    })
    if (result.status !== 'invalid') return
    expect(link.slice(result.start, result.end)).toBe(
      'FF7FF2D5919E3A560151BBC11C399D1'
    )
  })
})

describe('ED2K output filename', () => {
  it('uses the name carried by the file link', () => {
    expect(
      ed2kLinkFilename(
        'ed2k://|file|example.iso|1234|0123456789ABCDEF0123456789ABCDEF|/'
      )
    ).toBe('example.iso')
  })

  it('decodes percent-encoded file names', () => {
    expect(
      ed2kLinkFilename(
        'ed2k://|file|deepin%2025.2.iso|1234|0123456789ABCDEF0123456789ABCDEF|/'
      )
    ).toBe('deepin 25.2.iso')
  })

  it('returns null for non-file links', () => {
    expect(ed2kLinkFilename('ed2k://|server|1.2.3.4|4661|/')).toBeNull()
  })
})
