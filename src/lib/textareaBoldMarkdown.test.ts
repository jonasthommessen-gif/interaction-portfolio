import { describe, it, expect } from 'vitest'
import { applyBoldMarkdownToSelection } from './textareaBoldMarkdown'

describe('applyBoldMarkdownToSelection', () => {
  it('wraps a non-empty selection in **', () => {
    const r = applyBoldMarkdownToSelection('hello bold there', 6, 10)
    expect(r).toEqual({
      value: 'hello **bold** there',
      start: 8,
      end: 12,
    })
  })

  it('unwraps when ** immediately wraps the range', () => {
    const v = 'x **word** y'
    const innerStart = v.indexOf('word')
    const r = applyBoldMarkdownToSelection(v, innerStart, innerStart + 4)
    expect(r).toEqual({
      value: 'x word y',
      start: 2,
      end: 6,
    })
  })

  it('bolds the word under a collapsed caret', () => {
    const v = 'hello world'
    const i = v.indexOf('w')
    const r = applyBoldMarkdownToSelection(v, i, i)
    expect(r).toEqual({
      value: 'hello **world**',
      start: 8,
      end: 13,
    })
  })

  it('inserts **** with caret between markers when caret has no word', () => {
    const v = 'a  b'
    const gap = 2
    const r = applyBoldMarkdownToSelection(v, gap, gap)
    expect(r?.value).toBe('a **** b')
    expect(r?.start).toBe(4)
    expect(r?.end).toBe(4)
  })

  it('returns null for invalid range', () => {
    expect(applyBoldMarkdownToSelection('hi', 2, 1)).toBeNull()
    expect(applyBoldMarkdownToSelection('hi', -1, 1)).toBeNull()
    expect(applyBoldMarkdownToSelection('hi', 0, 5)).toBeNull()
  })

  it('wraps first word at start of string', () => {
    const r = applyBoldMarkdownToSelection('hi', 0, 0)
    expect(r).toEqual({ value: '**hi**', start: 2, end: 4 })
  })
})
