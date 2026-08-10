import type { PermissionStatus } from '@shared/types'

interface Props {
  label: string
  status: PermissionStatus
  onRequest?: () => void
  onOpenSettings?: () => void
  onCheckAgain?: () => void
  required?: boolean
}

function statusLabel(status: PermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Granted'
    case 'denied':
      return 'Denied'
    case 'restricted':
      return 'Restricted'
    case 'not-determined':
      return 'Not determined'
    default:
      return 'Unknown'
  }
}

export function PermissionRow({
  label,
  status,
  onRequest,
  onOpenSettings,
  onCheckAgain,
  required
}: Props) {
  const ok = status === 'granted'
  return (
    <div className="permission-row">
      <div>
        <div className="permission-row__label">
          {label}
          {required ? <span className="required"> *</span> : null}
        </div>
        <div className={ok ? 'success-text' : 'warning-text'}>{statusLabel(status)}</div>
      </div>
      <div className="row">
        {onRequest && status !== 'granted' ? (
          <button type="button" className="btn" onClick={onRequest}>
            Request Access
          </button>
        ) : null}
        {onOpenSettings ? (
          <button type="button" className="btn" onClick={onOpenSettings}>
            Open System Settings
          </button>
        ) : null}
        {onCheckAgain ? (
          <button type="button" className="btn btn-ghost" onClick={onCheckAgain}>
            Check Again
          </button>
        ) : null}
      </div>
    </div>
  )
}
