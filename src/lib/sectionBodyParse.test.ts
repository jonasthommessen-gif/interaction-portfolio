import { describe, it, expect } from 'vitest'
import { splitSectionBodyParagraphs, splitLineIntoBoldSegments } from './sectionBodyParse'

describe('splitSectionBodyParagraphs', () => {
  it('returns empty for empty or whitespace-only', () => {
    expect(splitSectionBodyParagraphs('')).toEqual([])
    expect(splitSectionBodyParagraphs('   \n\n  ')).toEqual([])
  })

  it('returns one paragraph for plain text', () => {
    expect(splitSectionBodyParagraphs('Hello')).toEqual(['Hello'])
  })

  it('splits on blank lines', () => {
    expect(splitSectionBodyParagraphs('First\n\nSecond')).toEqual(['First', 'Second'])
  })

  it('collapses multiple blank lines', () => {
    expect(splitSectionBodyParagraphs('A\n\n\n\nB')).toEqual(['A', 'B'])
  })

  it('trims paragraph edges', () => {
    expect(splitSectionBodyParagraphs('  x  \n\n  y  ')).toEqual(['x', 'y'])
  })
})

describe('splitLineIntoBoldSegments', () => {
  it('marks odd **-delimited parts as bold', () => {
    expect(splitLineIntoBoldSegments('a **b** c')).toEqual([
      { bold: false, text: 'a ' },
      { bold: true, text: 'b' },
      { bold: false, text: ' c' },
    ])
  })

  it('handles line with no asterisks', () => {
    expect(splitLineIntoBoldSegments('plain')).toEqual([{ bold: false, text: 'plain' }])
  })

  it('handles only bold', () => {
    expect(splitLineIntoBoldSegments('**x**')).toEqual([
      { bold: false, text: '' },
      { bold: true, text: 'x' },
      { bold: false, text: '' },
    ])
  })
})
