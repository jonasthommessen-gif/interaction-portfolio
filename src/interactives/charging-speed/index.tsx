import { SpeedCardShowcase } from './showcase/SpeedCardShowcase'

export type ChargingSpeedCardInteractiveProps = {
  initialKw?: number
}

/** Portfolio CMS wrapper for the charging speed interactive. */
export function ChargingSpeedCardInteractive({
  initialKw = 120,
}: ChargingSpeedCardInteractiveProps) {
  return <SpeedCardShowcase initialKw={initialKw} />
}
