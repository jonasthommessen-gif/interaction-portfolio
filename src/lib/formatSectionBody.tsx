import type { ReactElement, ReactNode } from 'react'
import { splitLineIntoBoldSegments, splitSectionBodyParagraphs } from './sectionBodyParse'

/**
 * Renders CMS section body: blank lines become paragraphs; single newlines become <br />;
 * **segments** become <strong> (no HTML parsing — React escapes plain text).
 */
export function formatSectionBody(text: string): ReactElement[] {
  return splitSectionBodyParagraphs(text).map((para, pi) => (
    <p key={pi}>{paragraphChildren(para, pi)}</p>
  ))
}

function paragraphChildren(para: string, pIndex: number): ReactNode[] {
  const lines = para.split('\n')
  const nodes: ReactNode[] = []

  lines.forEach((line, li) => {
    splitLineIntoBoldSegments(line).forEach(({ bold, text }, bi) => {
      const key = `${pIndex}-${li}-${bi}`
      if (bold) {
        nodes.push(<strong key={key}>{text}</strong>)
      } else {
        nodes.push(text)
      }
    })
    if (li < lines.length - 1) {
      nodes.push(<br key={`${pIndex}-br-${li}`} />)
    }
  })

  return nodes
}
