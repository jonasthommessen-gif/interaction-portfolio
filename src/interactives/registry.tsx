import type { ComponentType } from 'react'
import type { InteractiveId } from '../types/cms'
import { ChargingSpeedCardInteractive } from './charging-speed'

export const INTERACTIVE_IDS = ['charging-speed-card'] as const satisfies readonly InteractiveId[]

export type InteractiveProps = {
  initialKw?: number
}

type InteractiveEntry = {
  label: string
  Component: ComponentType<InteractiveProps>
}

export const INTERACTIVE_REGISTRY: Record<InteractiveId, InteractiveEntry> = {
  'charging-speed-card': {
    label: 'Charging speed card',
    Component: ChargingSpeedCardInteractive,
  },
}

export function isInteractiveId(value: string | undefined | null): value is InteractiveId {
  return Boolean(value && (INTERACTIVE_IDS as readonly string[]).includes(value))
}
