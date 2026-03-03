/**
 * LoadingScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen loading overlay that plays the Rive logo's idle-2 animation
 * (which looks like a loading loop) until the app is ready.
 *
 * "Ready" means: document has loaded AND the TLE data has been fetched
 * (or failed). The screen fades out smoothly once ready.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EventType,
  StateMachineInput,
  StateMachineInputType,
  useRive,
} from '@rive-app/react-canvas'
import styles from './LoadingScreen.module.css'

const RIVE_SRC = '/rive/White.logo.mascot.riv'
const STATE_MACHINE = 'Logo_State Machine'

interface LoadingScreenProps {
  /** Set to true once the app content is ready to show */
  ready: boolean
}

export function LoadingScreen({ ready }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const readyRef = useRef(ready)
  const numberInputRef = useRef<StateMachineInput | null>(null)
  const triggerInputRef = useRef<StateMachineInput | null>(null)

  useEffect(() => {
    readyRef.current = ready
  }, [ready])

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
  })

  const normalize = useMemo(
    () => (name: string) => name.replace(/[\s_-]+/g, '').toLowerCase(),
    [],
  )

  // Set loading animation (idle index 2) when Rive is ready; replay on Loop/Stop until ready
  useEffect(() => {
    if (!rive) return

    const inputs = rive.stateMachineInputs(STATE_MACHINE)
    const wanted = normalize('RareidleIndex')

    const numberInput =
      inputs.find(
        i => i.type === StateMachineInputType.Number && normalize(i.name) === wanted,
      ) ??
      inputs.find(i => i.type === StateMachineInputType.Number) ??
      null

    const triggerInput =
      inputs.find(i => i.type === StateMachineInputType.Trigger) ?? null

    numberInputRef.current = numberInput
    triggerInputRef.current = triggerInput

    function replayLoadingAnimation() {
      const num = numberInputRef.current
      const trig = triggerInputRef.current
      if (num && trig) {
        // eslint-disable-next-line react-hooks/immutability
        num.value = 2
        trig.fire()
      }
    }

    if (numberInput && triggerInput) {
      // eslint-disable-next-line react-hooks/immutability
      numberInput.value = 2
      triggerInput.fire()
    }

    const onLoopOrStop = () => {
      if (!readyRef.current) replayLoadingAnimation()
    }

    rive.on(EventType.Loop, onLoopOrStop)
    rive.on(EventType.Stop, onLoopOrStop)

    return () => {
      rive.off(EventType.Loop, onLoopOrStop)
      rive.off(EventType.Stop, onLoopOrStop)
      numberInputRef.current = null
      triggerInputRef.current = null
    }
  }, [normalize, rive])

  // Fade out when ready
  useEffect(() => {
    if (!ready) return

    setFading(true)
    const timer = setTimeout(() => setVisible(false), 600) // match CSS transition
    return () => clearTimeout(timer)
  }, [ready])

  if (!visible) return null

  return (
    <div className={`${styles.overlay} ${fading ? styles.fadeOut : ''}`}>
      <div className={styles.logoWrap}>
        <RiveComponent className={styles.riveCanvas} />
      </div>
    </div>
  )
}
