import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '../test/utils'
import { useTLEData } from './useTLEData'

const MINIMAL_TLE = `ISS (ZARYA)
1 25544U 98067A   25057.54791667  .00020351  00000+0  36234-3 0  9993
2 25544  51.6393 108.4583 0003456  47.2345 312.9012 15.50419762494123`

function TestHarness() {
  const { loading, error, sats } = useTLEData()
  return (
    <div>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="sats-count">{sats.length}</span>
    </div>
  )
}

describe('useTLEData', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string) => {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(MINIMAL_TLE),
        } as Response)
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.stubGlobal('fetch', originalFetch)
    vi.restoreAllMocks()
  })

  it('when fetch returns valid TLE, loading becomes false and sats are populated', async () => {
    const { getByTestId } = render(<TestHarness />)

    await waitFor(
      () => {
        expect(getByTestId('loading').textContent).toBe('no')
        expect(Number(getByTestId('sats-count').textContent)).toBeGreaterThan(0)
      },
      { timeout: 3000 },
    )
    expect(getByTestId('error').textContent).toBe('none')
  })

  it('when all fetches fail, fallback is used and sats are still populated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500, statusText: 'Server Error', text: () => Promise.resolve('') } as Response)),
    )

    const { getAllByTestId } = render(<TestHarness />)

    await waitFor(
      () => {
        const loading = getAllByTestId('loading')[0]
        const count = getAllByTestId('sats-count')[0]
        expect(loading?.textContent).toBe('no')
        expect(Number(count?.textContent)).toBeGreaterThan(0)
      },
      { timeout: 3000 },
    )
  })
})
