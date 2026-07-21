 import type { ChargingInputs } from './types'

 export const DEFAULT_INPUTS: ChargingInputs = {
   kw: 224,
   batteryPct: 67,
   temperature: 'normal',
   powerSharing: 'shared',
   explanationMode: 'auto',
   manualExplanation: '',
   chargerMaxKw: 400,
   chargingTargetPct: 80,
 }

 export const THRESHOLDS = {
   veryLowKw: 25,
   reducedKw: 80,
   moderateKw: 150,
   optimalKw: 240,
   peakKw: 320,
   taperStartPct: 78,
   taperEndPct: 95,
 }

 export const COST = {
   nokPerKwh: 6.89,
   sessionKwhEstimate: 20,
 }
