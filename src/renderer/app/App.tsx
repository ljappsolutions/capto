import type { WindowKind } from '@shared/types'
import { CompleteScreen } from '../screens/CompleteScreen'
import { ControlsScreen } from '../screens/ControlsScreen'
import { CountdownScreen } from '../screens/CountdownScreen'
import { PickerScreen } from '../screens/PickerScreen'
import { RecordingsScreen } from '../screens/RecordingsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

function getWindowKind(): WindowKind {
  const params = new URLSearchParams(window.location.search)
  const kind = params.get('window')
  if (
    kind === 'picker' ||
    kind === 'controls' ||
    kind === 'complete' ||
    kind === 'recordings' ||
    kind === 'settings' ||
    kind === 'countdown'
  ) {
    return kind
  }
  return 'picker'
}

export function App() {
  const kind = getWindowKind()

  switch (kind) {
    case 'picker':
      return <PickerScreen />
    case 'settings':
      return <SettingsScreen />
    case 'recordings':
      return <RecordingsScreen />
    case 'complete':
      return <CompleteScreen />
    case 'controls':
      return <ControlsScreen />
    case 'countdown':
      return <CountdownScreen />
    default:
      return <PickerScreen />
  }
}
