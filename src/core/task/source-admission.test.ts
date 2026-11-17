import { describe, expect, it } from 'vitest'
import { admitTaskCreateRequest } from './source-admission'

const ED2K_URL =
  'ed2k://|file|synthetic-test.bin|1234|0123456789ABCDEF0123456789ABCDEF|/'

describe('task source admission', () => {
  it('accepts an ED2K link in an http-type create request', () => {
    const request = admitTaskCreateRequest({
      type: 'http',
      uris: [ED2K_URL],
      saveDir: '/tmp',
      headers: [],
    })
    if (request.type !== 'http') throw new Error('expected http request')
    expect(request.uris).toEqual([ED2K_URL])
  })

  it('still rejects a malformed ED2K link', () => {
    expect(() =>
      admitTaskCreateRequest({
        type: 'http',
        uris: [ED2K_URL.replace('0123456789ABCDEF0123456789ABCDEF', 'BAD')],
        saveDir: '/tmp',
        headers: [],
      })
    ).toThrow()
  })
})
