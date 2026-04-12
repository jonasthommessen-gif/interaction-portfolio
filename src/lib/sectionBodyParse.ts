/** Paragraphs separated by one or more blank lines (trimmed, empties dropped). */
export function splitSectionBodyParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/** Odd-index segments after splitting on `**` are bold. */
export function splitLineIntoBoldSegments(line: string): { bold: boolean; text: string }[] {
  return line.split('**').map((t, i) => ({ bold: i % 2 === 1, text: t }))
}
