import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  StateMachineInputType,
  useRive,
  type StateMachineInput,
} from '@rive-app/react-canvas'
import { useIdleTimer } from '../hooks/useIdleTimer'
import styles from './RiveLogoButton.module.css'

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/White.logo.mascot.riv`
const STATE_MACHINE = 'Logo_State Machine'
const RARE_IDLE_INDEX_INPUT = 'RareidleIndex'

/**
 * Rive-powered logo.
 *
 * Note: This component is rendered *inside* a <NavLink> (see Navbar), so it
 * must NOT render an interactive element like <button>.
 */
export function RiveLogoButton({
  invert = false,
  contracted = false,
}: { invert?: boolean; contracted?: boolean }) {
  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    onLoad: () => {
      if (import.meta.env.DEV) console.debug('[RiveLogoButton] Rive animation loaded')
    },
    onLoadError: (err) => {
      console.error('[RiveLogoButton] Rive load error', err)
    },
  })

  const normalize = useMemo(
    () => (name: string) => name.replace(/[\s_-]+/g, '').toLowerCase(),
    [],
  )

  const [rareIdleIndexInput, setRareIdleIndexInput] =
    useState<StateMachineInput | null>(null)
  const [rareIdleTriggerInput, setRareIdleTriggerInput] =
    useState<StateMachineInput | null>(null)

  useEffect(() => {
    if (!rive) return

    const inputs = rive.stateMachineInputs(STATE_MACHINE)
    const wanted = normalize(RARE_IDLE_INDEX_INPUT)

    const numberInput =
      inputs.find(
        (input) =>
          input.type === StateMachineInputType.Number &&
          normalize(input.name) === wanted,
      ) ??
      inputs.find((input) => input.type === StateMachineInputType.Number) ??
      null

    const triggerInput =
      inputs.find((input) => input.type === StateMachineInputType.Trigger) ?? null

    setRareIdleIndexInput(numberInput)
    setRareIdleTriggerInput(triggerInput)

    if (import.meta.env.DEV) {
      const typeLabel = (t: StateMachineInputType) => StateMachineInputType[t]

      console.groupCollapsed('[RiveLogoButton] State machine inputs')
      console.info('available state machines:', rive.stateMachineNames)
      console.info('requested state machine:', STATE_MACHINE)
      console.table(
        inputs.map((i) => ({
          name: i.name,
          type: typeLabel(i.type),
          value: i.value,
        })),
      )
      if (!numberInput) {
        console.warn(
          'No number input found for RareidleIndex (or fallback to first number input).',
        )
      }
      if (!triggerInput) {
        console.warn('No trigger input found (cannot fire rare idles).')
      }
      console.groupEnd()
    }
  }, [normalize, rive])

  const isReady = Boolean(rive && rareIdleIndexInput && rareIdleTriggerInput)

  const fireRareIdle = useCallback(() => {
    if (!rareIdleIndexInput || !rareIdleTriggerInput) return

    // Pick random rare idle: 1, 2 or 3
    const randomIndex = Math.floor(Math.random() * 3) + 1

    if (import.meta.env.DEV) {
      console.debug('[RiveLogoButton] firing rare idle', { randomIndex })
    }

    // This is an imperative API from Rive. ESLint's react-hooks immutability
    // rule flags *any* mutation of values returned from hooks, but in this case
    // it's the intended mechanism for controlling the state machine.
    // eslint-disable-next-line react-hooks/immutability
    rareIdleIndexInput.value = randomIndex
    rareIdleTriggerInput.fire()
  }, [rareIdleIndexInput, rareIdleTriggerInput])

  // Once per idle period: fire after 6s inactivity
  useIdleTimer({ timeoutMs: 6_000, onIdle: fireRareIdle, enabled: isReady })

  return (
    <span
      className={`${styles.logo} ${contracted ? styles.logoContracted : styles.logoInPill} ${invert ? styles.logoInverted : ''}`}
      aria-hidden="true"
    >
      <span className={styles.logoInner}>
        <RiveComponent className={styles.canvas} />
      </span>
    </span>
  )
}
