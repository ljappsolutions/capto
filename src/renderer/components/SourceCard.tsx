import type { CaptureSource } from '@shared/types'

interface Props {
  source: CaptureSource
  selected: boolean
  onSelect: () => void
}

export function SourceCard({ source, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`source-card${selected ? ' source-card--selected' : ''}`}
      onClick={onSelect}
    >
      <div className="source-card__thumb">
        {source.thumbnailDataUrl ? (
          <img src={source.thumbnailDataUrl} alt="" />
        ) : (
          <div className="source-card__placeholder" />
        )}
      </div>
      <div className="source-card__meta">
        {source.appIconDataUrl ? (
          <img className="source-card__icon" src={source.appIconDataUrl} alt="" />
        ) : null}
        <span className="source-card__name" title={source.name}>
          {source.name}
        </span>
      </div>
    </button>
  )
}
