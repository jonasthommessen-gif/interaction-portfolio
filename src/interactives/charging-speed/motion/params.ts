 export type MotionParams = {
   particleCount: number
   particleSize: number
   brightness: number
   glow: number
   spread: number
   verticalConcentration: number
   motionSpeed: number
   upwardDrift: number
   jitter: number
   density: number
   pulseFrequency: number
   coreIntensity: number
   turbulence: number
 }
 
 export const DEFAULT_MOTION_PARAMS: MotionParams = {
   particleCount: 120,
   particleSize: 1.4,
   brightness: 0.9,
   glow: 0.8,
   spread: 0.7,
   verticalConcentration: 0.55,
   motionSpeed: 0.8,
   upwardDrift: 0.45,
   jitter: 0.55,
   density: 0.8,
   pulseFrequency: 0.45,
   coreIntensity: 0.7,
   turbulence: 0.65,
 }
 
 export const MOTION_PARAM_SCHEMA: Array<{
   key: keyof MotionParams
   label: string
   min: number
   max: number
   step: number
   help?: string
 }> = [
   { key: 'particleCount', label: 'Particle count', min: 10, max: 420, step: 1 },
   { key: 'particleSize', label: 'Particle size', min: 0.4, max: 4, step: 0.05 },
   { key: 'brightness', label: 'Brightness', min: 0, max: 1.2, step: 0.01 },
   { key: 'glow', label: 'Glow / blur', min: 0, max: 1.2, step: 0.01 },
   { key: 'spread', label: 'Spread width', min: 0.05, max: 1.4, step: 0.01 },
   {
     key: 'verticalConcentration',
     label: 'Vertical concentration',
     min: 0,
     max: 1,
     step: 0.01,
     help: 'Higher values compress energy toward the middle vertically.',
   },
   { key: 'motionSpeed', label: 'Motion speed', min: 0, max: 1.6, step: 0.01 },
   { key: 'upwardDrift', label: 'Upward drift', min: 0, max: 1.6, step: 0.01 },
   { key: 'jitter', label: 'Flicker / jitter', min: 0, max: 1.6, step: 0.01 },
   { key: 'density', label: 'Density', min: 0, max: 1.4, step: 0.01 },
   { key: 'pulseFrequency', label: 'Pulse frequency', min: 0, max: 1.6, step: 0.01 },
   { key: 'coreIntensity', label: 'Core intensity', min: 0, max: 1.6, step: 0.01 },
   { key: 'turbulence', label: 'Turbulence', min: 0, max: 1.6, step: 0.01 },
 ]
