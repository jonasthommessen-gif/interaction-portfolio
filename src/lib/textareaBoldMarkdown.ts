/**
 * Wraps or unwraps `**bold**` markers for section body text (same convention as formatSectionBody).
 * Used from admin textareas with Cmd/Ctrl+B.
 */
export function isBoldShortcut(e: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'key'>): boolean {
  return (e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')
}

export function applyBoldMarkdownToSelection(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } | null {
  const n = value.length
  if (start < 0 || end < 0 || start > n || end > n || start > end) return null

  const [a, b] = expandNonWhitespaceRun(value, start, end)

  if (a === b) {
    const ins = '****'
    const next = value.slice(0, start) + ins + value.slice(start)
    const caret = start + 2
    return { value: next, start: caret, end: caret }
  }

  if (a >= 2 && b + 2 <= n && value.slice(a - 2, a) === '**' && value.slice(b, b + 2) === '**') {
    const next = value.slice(0, a - 2) + value.slice(a, b) + value.slice(b + 2)
    const newStart = a - 2
    const newEnd = newStart + (b - a)
    return { value: next, start: newStart, end: newEnd }
  }

  const next = value.slice(0, a) + '**' + value.slice(a, b) + '**' + value.slice(b)
  return { value: next, start: a + 2, end: b + 2 }
}

/** When start === end, expands to the contiguous non-whitespace run under the caret; otherwise returns [start, end]. */
function expandNonWhitespaceRun(value: string, start: number, end: number): [number, number] {
  if (start !== end) return [start, end]
  const n = value.length
  let left = start
  let right = start
  while (left > 0 && !/\s/.test(value[left - 1]!)) left--
  while (right < n && !/\s/.test(value[right]!)) right++
  return [left, right]
}
