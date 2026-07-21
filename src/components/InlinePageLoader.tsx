import { useEffect, useMemo, useRef } from 'react'
import {
  StateMachineInput,
  StateMachineInputType,
  useRive,
} from '@rive-app/react-canvas'
import styles from './InlinePageLoader.module.css'

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/White.logo.mascot.riv`
const STATE_MACHINE = 'Logo_State Machine'
const LOADING_ANIMATION_INTERVAL_MS = 2500

type Props = {
  label: string
}

/**
 * Centered in-page loader: label above the same Rive idle-2 mascot used on first load.
 */
export function InlinePageLoader({ label }: Props) {
  const numberInputRef = useRef<StateMachineInput | null>(null)
  const triggerInputRef = useRef<StateMachineInput | null>(null)

  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
  })

  const normalize = useMemo(
    () => (name: string) => name.replace(/[\s_-]+/g, '').toLowerCase(),
    [],
  )

  useEffect(() => {
    if (!rive) return

    const inputs = rive.stateMachineInputs(STATE_MACHINE)
    const wanted = normalize('RareidleIndex')

    const numberInput =
      inputs.find(
        (i) => i.type === StateMachineInputType.Number && normalize(i.name) === wanted,
      ) ??
      inputs.find((i) => i.type === StateMachineInputType.Number) ??
      null

    const triggerInput =
      inputs.find((i) => i.type === StateMachineInputType.Trigger) ?? null

    numberInputRef.current = numberInput
    triggerInputRef.current = triggerInput

    function replayLoadingAnimation() {
      const num = numberInputRef.current
      const trig = triggerInputRef.current
      if (num && trig) {
        num.value = 2
        trig.fire()
      }
    }

    if (numberInput && triggerInput) {
      numberInput.value = 2
      triggerInput.fire()
    }

    const interval = setInterval(replayLoadingAnimation, LOADING_ANIMATION_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      numberInputRef.current = null
      triggerInputRef.current = null
    }
  }, [normalize, rive])

  return (
    <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
      <p className={styles.label}>{label}</p>
      <div className={styles.logoWrap}>
        <RiveComponent className={styles.riveCanvas} />
      </div>
    </div>
  )
}
