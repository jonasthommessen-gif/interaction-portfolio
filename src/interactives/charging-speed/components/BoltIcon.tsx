import type { SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number | string }

export function BoltIcon({ size, ...rest }: IconProps) {
  return (
    <svg
      width={size ?? '1em'}
      height={size ?? '1em'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable={false}
      {...rest}
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none" />
    </svg>
  )
}
