import { createContext, useContext, useState, useCallback } from 'react'

type NavbarInvertContextValue = {
  invertLogo: boolean
  setInvertLogo: (value: boolean) => void
}

const NavbarInvertContext = createContext<NavbarInvertContextValue | null>(null)

export function NavbarInvertProvider({ children }: { children: React.ReactNode }) {
  const [invertLogo, setInvertLogoState] = useState(false)
  const setInvertLogo = useCallback((value: boolean) => {
    setInvertLogoState(value)
  }, [])
  return (
    <NavbarInvertContext.Provider value={{ invertLogo, setInvertLogo }}>
      {children}
    </NavbarInvertContext.Provider>
  )
}

export function useNavbarInvert() {
  const ctx = useContext(NavbarInvertContext)
  return ctx ?? { invertLogo: false, setInvertLogo: () => {} }
}
