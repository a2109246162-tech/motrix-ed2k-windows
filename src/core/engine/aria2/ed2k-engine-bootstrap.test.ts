import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildEd2kEngineArgs,
  ED2K_BOOTSTRAP_SERVERS,
  isEd2kEngine,
} from './ed2k-engine-bootstrap'

describe('isEd2kEngine', () => {
  it('recognises aria2-next and the motrix-ed2k version marker', () => {
    expect(isEd2kEngine('aria2-next version 3.1.0')).toBe(true)
    expect(isEd2kEngine('aria2 version 3.1.0-motrix-ed2k')).toBe(true)
  })

  it('rejects stock aria2 and the upstream motrix fork', () => {
    expect(isEd2kEngine('aria2 version 1.37.0')).toBe(false)
    expect(isEd2kEngine('aria2 version 1.37.0-motrix.3')).toBe(false)
  })
})

describe('buildEd2kEngineArgs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ed2k-bootstrap-'))

  it('adds server/Kad bootstrap and transfer tuning for aria2-next', () => {
    fs.writeFileSync(path.join(dir, 'server.met'), 'x')
    fs.writeFileSync(path.join(dir, 'nodes.dat'), 'x')
    const args = buildEd2kEngineArgs({
      bootstrapDir: dir,
      version: 'aria2-next version 3.1.0',
      hasSqlitePersistence: false,
    })
    expect(args).toContain(`--ed2k-server-list=${path.join(dir, 'server.met')}`)
    expect(args).toContain(`--ed2k-node-list=${path.join(dir, 'nodes.dat')}`)
    expect(args).toContain(`--ed2k-server=${ED2K_BOOTSTRAP_SERVERS}`)
    expect(args).toContain('--ed2k-port-mapping=false')
    expect(args).toContain('--split=16')
    expect(args).toContain('--max-connection-per-server=16')
    expect(args).toContain('--min-split-size=1M')
    expect(args).toContain('--ed2k-max-connections=200')
  })

  it('is a no-op for stock aria2', () => {
    const args = buildEd2kEngineArgs({
      bootstrapDir: dir,
      version: 'aria2 version 1.37.0',
      hasSqlitePersistence: true,
    })
    expect(args).toEqual([])
  })

  it('is a no-op without a bootstrap directory', () => {
    const args = buildEd2kEngineArgs({
      bootstrapDir: '',
      version: 'aria2-next version 3.1.0',
      hasSqlitePersistence: false,
    })
    expect(args).toEqual([])
  })
})
