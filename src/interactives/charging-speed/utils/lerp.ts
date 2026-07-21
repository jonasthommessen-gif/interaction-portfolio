 export function clamp01(n: number) {
   return Math.max(0, Math.min(1, n))
 }
 
 export function lerp(a: number, b: number, t: number) {
   return a + (b - a) * t
 }
 
 export function damp(current: number, target: number, lambda: number, dt: number) {
   // Exponential decay toward target
   const t = 1 - Math.exp(-lambda * dt)
   return lerp(current, target, t)
 }
