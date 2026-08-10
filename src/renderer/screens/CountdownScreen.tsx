import { useEffect, useState } from 'react'
import { COUNTDOWN_SECONDS } from '@shared/constants'
import '../styles/countdown.css'

export function CountdownScreen() {
  const [value, setValue] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => Math.max(0, v - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="countdown">
      <div className="countdown__number">{value > 0 ? value : ''}</div>
    </div>
  )
}
