 export type TemperatureCondition = 'cold' | 'normal' | 'warm'
 export type PowerSharing = 'none' | 'shared'
 export type ExplanationMode = 'auto' | 'manual'

 export type ChargingInputs = {
   kw: number
   batteryPct: number
   temperature: TemperatureCondition
   powerSharing: PowerSharing
   explanationMode: ExplanationMode
   manualExplanation?: string
   /** Charger nameplate max in kW (defaults to 400 when undefined). */
   chargerMaxKw?: number
   /** Charging target percentage (defaults to 100 when undefined). */
   chargingTargetPct?: number
 }

 export type ChargingStateTitle =
   | 'Warming up'
   | 'Almost there'
   | 'Shared'
   | 'Reduced'
   | 'Peak'
   | 'Fast'
  | 'Very fast'
  | 'Maximum speed'
   | 'Optimal'
   | 'Slow'

 export type MotionDerivedState = {
   intensity: number // 0..1 overall energy
   taper: number // 0..1 battery-related taper near/after 80%
   constrained: number // 0..1 (cold/shared)
   fragmented: number // 0..1 (shared can fragment)
   brightness: number // 0..1 target brightness
   density: number // 0..1 target density
   speed: number // 0..1 target motion speed
   upward: number // 0..1 upward drift
   pulse: number // 0..1 pulse strength
 }

 export type DerivedChargingState = {
   stateTitle: ChargingStateTitle
   explanation?: string
   intensity: number
   taperFactor: number
   summary: string
   estimatedTime: string
   estimatedTimeHelp: string
   estimatedCost: string
   estimatedCostHelp: string
   motionDerived: MotionDerivedState
 }
