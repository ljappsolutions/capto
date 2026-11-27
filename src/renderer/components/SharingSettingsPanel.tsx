import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  expiryOptionsFor,
  PROVIDER_LABELS,
  STORAGE_PROVIDERS
} from '@shared/sharing'
import type {
  AppSettings,
  AppSettingsView,
  CredentialStatus,
  SharingSettings,
  StorageProviderId,
  StorageTestResult
} from '@shared/types'

interface Props {
  settings: AppSettingsView
  update: (partial: Partial<AppSettings>) => Promise<AppSettingsView>
}

const DOC_SLUGS: Record<StorageProviderId, string> = {
  'aws-s3': 'aws-s3',
  's3-compatible': 's3-compatible',
  'azure-blob': 'azure',
  gcs: 'gcs'
}

/** Text input that keeps a local draft and commits on blur / Enter. */
function DraftInput({
  id,
  value,
  placeholder,
  onCommit,
  type = 'text'
}: {
  id: string
  value: string
  placeholder?: string
  onCommit: (value: string) => void
  type?: 'text' | 'url'
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      id={id}
      type={type === 'url' ? 'text' : type}
      inputMode={type === 'url' ? 'url' : undefined}
      value={draft}
      placeholder={placeholder}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  )
}

export function SharingSettingsPanel({ settings, update }: Props) {
  const sharing = settings.sharing
  const provider = sharing.provider
  const [statuses, setStatuses] = useState<CredentialStatus[]>([])
  const [editingKeys, setEditingKeys] = useState(false)
  const [secretA, setSecretA] = useState('')
  const [secretB, setSecretB] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<StorageTestResult | null>(null)

  const refreshStatuses = useCallback(async () => {
    setStatuses(await window.recorderAPI.getCredentialStatuses())
  }, [])

  useEffect(() => {
    void refreshStatuses()
  }, [refreshStatuses])

  useEffect(() => {
    setEditingKeys(false)
    setSecretA('')
    setSecretB('')
    setKeyError(null)
    setTest(null)
  }, [provider])

  const status = statuses.find((s) => s.provider === provider)

  function patch(next: Partial<SharingSettings>): void {
    setTest(null)
    void update({ sharing: { ...sharing, ...next } })
  }

  async function saveKeys(): Promise<void> {
    if (!provider) return
    setKeyError(null)
    let payload: unknown
    if (provider === 'aws-s3' || provider === 's3-compatible') {
      payload = { provider, accessKeyId: secretA, secretAccessKey: secretB }
    } else if (provider === 'azure-blob') {
      payload = { provider, accountKey: secretA }
    } else {
      payload = { provider, serviceAccountJson: secretA }
    }
    try {
      await window.recorderAPI.saveCredentials(payload)
      setSecretA('')
      setSecretB('')
      setEditingKeys(false)
      setTest(null)
      await refreshStatuses()
    } catch (err) {
      setKeyError(
        err instanceof Error
          ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
          : 'Could not save credentials'
      )
    }
  }

  async function removeKeys(): Promise<void> {
    if (!provider) return
    await window.recorderAPI.clearCredentials(provider)
    await refreshStatuses()
  }

  async function runTest(): Promise<void> {
    setTesting(true)
    setTest(null)
    try {
      setTest(await window.recorderAPI.testStorage())
    } finally {
      setTesting(false)
    }
  }

  async function loadJsonFile(file: File | undefined): Promise<void> {
    if (!file) return
    setSecretA(await file.text())
  }

  return (
    <section className="panel sharing">
      <p className="muted">
        Upload recordings to <strong>your own</strong> cloud storage and send clients a private link
        that expires. Keys are encrypted in your macOS Keychain and only sent to your provider.
      </p>

      <Field id="provider" label="Storage provider">
        <select
          id="provider"
          value={provider ?? ''}
          onChange={(e) =>
            patch({ provider: (e.target.value || null) as StorageProviderId | null })
          }
        >
          <option value="">Not configured</option>
          {STORAGE_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </Field>

      {provider ? (
        <>
          <p className="muted">
            <button
              type="button"
              className="link-btn"
              onClick={() => void window.recorderAPI.openDocs(DOC_SLUGS[provider])}
            >
              Setup guide for {PROVIDER_LABELS[provider].split(' (')[0]} ↗
            </button>
            {provider === 'azure-blob' || provider === 'gcs' ? (
              <span> · Community-tested; please report issues.</span>
            ) : null}
          </p>

          {provider === 'aws-s3' ? (
            <div className="grid-2">
              <Field id="bucket" label="Bucket">
                <DraftInput id="bucket" value={sharing.aws.bucket} placeholder="my-recordings" onCommit={(v) => patch({ aws: { ...sharing.aws, bucket: v } })} />
              </Field>
              <Field id="region" label="Region">
                <DraftInput id="region" value={sharing.aws.region} placeholder="us-east-1" onCommit={(v) => patch({ aws: { ...sharing.aws, region: v } })} />
              </Field>
            </div>
          ) : null}

          {provider === 's3-compatible' ? (
            <>
              <Field id="endpoint" label="Endpoint URL" hint="Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com · MinIO: http://localhost:9000">
                <DraftInput id="endpoint" type="url" value={sharing.s3Compatible.endpoint} placeholder="https://…" onCommit={(v) => patch({ s3Compatible: { ...sharing.s3Compatible, endpoint: v } })} />
              </Field>
              <div className="grid-2">
                <Field id="bucket" label="Bucket">
                  <DraftInput id="bucket" value={sharing.s3Compatible.bucket} onCommit={(v) => patch({ s3Compatible: { ...sharing.s3Compatible, bucket: v } })} />
                </Field>
                <Field id="region" label="Region" hint="R2 uses “auto”.">
                  <DraftInput id="region" value={sharing.s3Compatible.region} onCommit={(v) => patch({ s3Compatible: { ...sharing.s3Compatible, region: v } })} />
                </Field>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={sharing.s3Compatible.forcePathStyle}
                  onChange={(e) => patch({ s3Compatible: { ...sharing.s3Compatible, forcePathStyle: e.target.checked } })}
                />
                Use path-style URLs (needed for MinIO and some providers)
              </label>
            </>
          ) : null}

          {provider === 'azure-blob' ? (
            <>
              <div className="grid-2">
                <Field id="account" label="Storage account name">
                  <DraftInput id="account" value={sharing.azure.accountName} onCommit={(v) => patch({ azure: { ...sharing.azure, accountName: v } })} />
                </Field>
                <Field id="container" label="Container">
                  <DraftInput id="container" value={sharing.azure.container} placeholder="recordings" onCommit={(v) => patch({ azure: { ...sharing.azure, container: v } })} />
                </Field>
              </div>
              <Field id="azendpoint" label="Custom endpoint (optional)" hint="Leave empty for Azure. For Azurite: http://127.0.0.1:10000/devstoreaccount1">
                <DraftInput id="azendpoint" type="url" value={sharing.azure.endpoint} onCommit={(v) => patch({ azure: { ...sharing.azure, endpoint: v } })} />
              </Field>
            </>
          ) : null}

          {provider === 'gcs' ? (
            <>
              <Field id="bucket" label="Bucket">
                <DraftInput id="bucket" value={sharing.gcs.bucket} onCommit={(v) => patch({ gcs: { ...sharing.gcs, bucket: v } })} />
              </Field>
              <Field id="gcsendpoint" label="Custom API endpoint (optional)" hint="Leave empty for Google Cloud. For fake-gcs-server: http://localhost:4443">
                <DraftInput id="gcsendpoint" type="url" value={sharing.gcs.apiEndpoint} onCommit={(v) => patch({ gcs: { ...sharing.gcs, apiEndpoint: v } })} />
              </Field>
            </>
          ) : null}

          <Field id="prefix" label="Folder" hint={<>Files go to <code>{(sharing.prefix ? sharing.prefix + '/' : '') + 'YYYY/MM/<recording>/'}</code></>}>
            <DraftInput id="prefix" value={sharing.prefix} placeholder="capto" onCommit={(v) => patch({ prefix: v })} />
          </Field>

          <div className="credentials panel-inset">
            <div className="credentials__head">
              <strong>Credentials</strong>
              {status?.configured && !editingKeys ? (
                <span className="muted">Saved ({status.hint})</span>
              ) : null}
            </div>

            {status?.configured && !editingKeys ? (
              <div className="row">
                <button type="button" className="btn" onClick={() => setEditingKeys(true)}>
                  Replace
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void removeKeys()}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                {provider === 'aws-s3' || provider === 's3-compatible' ? (
                  <div className="grid-2">
                    <Field id="akid" label="Access key ID">
                      <input id="akid" type="text" autoComplete="off" spellCheck={false} value={secretA} onChange={(e) => setSecretA(e.target.value)} />
                    </Field>
                    <Field id="secret" label="Secret access key">
                      <input id="secret" type="password" autoComplete="off" value={secretB} onChange={(e) => setSecretB(e.target.value)} />
                    </Field>
                  </div>
                ) : null}
                {provider === 'azure-blob' ? (
                  <Field id="akey" label="Account key">
                    <input id="akey" type="password" autoComplete="off" value={secretA} onChange={(e) => setSecretA(e.target.value)} />
                  </Field>
                ) : null}
                {provider === 'gcs' ? (
                  <Field id="sajson" label="Service account key (JSON)">
                    <textarea id="sajson" rows={4} spellCheck={false} value={secretA} placeholder='{"type": "service_account", …}' onChange={(e) => setSecretA(e.target.value)} />
                    <input type="file" accept="application/json,.json" aria-label="Load JSON key file" onChange={(e) => void loadJsonFile(e.target.files?.[0])} />
                  </Field>
                ) : null}
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!secretA || ((provider === 'aws-s3' || provider === 's3-compatible') && !secretB)}
                    onClick={() => void saveKeys()}
                  >
                    Save credentials
                  </button>
                  {editingKeys ? (
                    <button type="button" className="btn" onClick={() => setEditingKeys(false)}>
                      Cancel
                    </button>
                  ) : null}
                </div>
                {keyError ? <p className="error-text">{keyError}</p> : null}
              </>
            )}
          </div>

          <div className="row">
            <button type="button" className="btn" disabled={testing || !status?.configured} onClick={() => void runTest()}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {test ? (
              <span className={test.ok ? 'test-ok' : 'error-text'}>
                {test.ok ? '✓ ' : '✗ '}
                {test.message}
              </span>
            ) : null}
          </div>

          <h3>Links</h3>
          <Field id="expiry" label="Default link expiry" hint={provider === 'azure-blob' ? 'Azure allows up to 30 days.' : 'This provider allows signed links of up to 7 days. Use “Renew link” to extend.'}>
            <select id="expiry" value={sharing.defaultExpirySec} onChange={(e) => patch({ defaultExpirySec: Number(e.target.value) })}>
              {expiryOptionsFor(provider).map((o) => (
                <option key={o.seconds} value={o.seconds}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="field">
            <span className="field__label">Link type</span>
            <label className="toggle">
              <input type="radio" name="linkFormat" checked={sharing.linkFormat === 'viewer'} onChange={() => patch({ linkFormat: 'viewer' })} />
              Viewer page (clean player; the website never sees your link)
            </label>
            <label className="toggle">
              <input type="radio" name="linkFormat" checked={sharing.linkFormat === 'raw'} onChange={() => patch({ linkFormat: 'raw' })} />
              Direct file link
            </label>
          </div>

          <label className="toggle">
            <input type="checkbox" checked={sharing.autoUpload} onChange={(e) => patch({ autoUpload: e.target.checked })} />
            Upload and copy the link automatically when a recording finishes
          </label>

          <details>
            <summary>Advanced</summary>
            <Field id="viewer" label="Viewer base URL" hint="Self-hosting the website? Point links at your own deployment.">
              <DraftInput id="viewer" type="url" value={sharing.viewerBaseUrl} onCommit={(v) => patch({ viewerBaseUrl: v })} />
            </Field>
          </details>
        </>
      ) : null}
    </section>
  )
}
