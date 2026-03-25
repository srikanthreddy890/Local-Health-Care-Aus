'use client'

import { useState } from 'react'
import { useApiConfigurations, type ApiConfiguration } from '@/lib/hooks/useApiConfigurations'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Globe,
  Plus,
  Star,
  Key,
  TestTube,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import ApiIntegrationWizard from './ApiIntegrationWizard'

interface Props {
  clinicId: string
}

export default function ApiConfigurationManager({ clinicId }: Props) {
  const {
    configs,
    isLoading,
    deleteConfig,
    isDeleting,
    testConnection,
    isTesting,
    setPrimary,
    isSettingPrimary,
    updateConfig,
    isUpdating,
  } = useApiConfigurations(clinicId)

  const [showWizard, setShowWizard] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [apiKeyTarget, setApiKeyTarget] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState('')

  // ── Delete ────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteConfig(deleteTarget)
      toast.success('Configuration deleted')
    } catch {
      toast.error('Failed to delete configuration')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Update API key ────────────────────────────────────────────────────

  async function handleUpdateApiKey() {
    if (!apiKeyTarget || !newApiKey.trim()) return
    try {
      await updateConfig({ id: apiKeyTarget, updates: { apiKey: newApiKey.trim() } })
      toast.success('API key updated')
    } catch {
      toast.error('Failed to update API key')
    } finally {
      setApiKeyTarget(null)
      setNewApiKey('')
    }
  }

  // ── Test connection ───────────────────────────────────────────────────

  async function handleTest(config: ApiConfiguration) {
    try {
      await testConnection({ configId: config.id })
      toast.success('Connection successful')
    } catch {
      toast.error('Connection test failed')
    }
  }

  // ── Set primary ───────────────────────────────────────────────────────

  async function handleSetPrimary(configId: string) {
    try {
      await setPrimary(configId)
      toast.success('Primary configuration updated')
    } catch {
      toast.error('Failed to set primary')
    }
  }

  // ── Update environment ──────────────────────────────────────────────

  async function handleUpdateEnvironment(configId: string, environment: string) {
    try {
      await updateConfig({ id: configId, updates: { environment } })
      toast.success(`Environment changed to ${environment}`)
    } catch {
      toast.error('Failed to update environment')
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────

  async function handleToggleActive(configId: string, currentlyActive: boolean) {
    try {
      await updateConfig({ id: configId, updates: { is_active: !currentlyActive } })
      toast.success(currentlyActive ? 'Configuration deactivated' : 'Configuration activated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  // ── Wizard complete ───────────────────────────────────────────────────

  function handleWizardComplete() {
    setShowWizard(false)
    toast.success('API configuration created')
  }

  if (showWizard) {
    return (
      <ApiIntegrationWizard
        clinicId={clinicId}
        onComplete={handleWizardComplete}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  function getEnabledEndpoints(config: ApiConfiguration) {
    const ep = config.endpoint_config as Record<string, { enabled?: boolean; url?: string; method?: string }> | null
    if (!ep) return []
    return Object.entries(ep)
      .filter(([, v]) => v?.enabled)
      .map(([key, v]) => ({
        name: key.replace(/_/g, ' '),
        method: v.method ?? 'GET',
        url: v.url ?? '',
      }))
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lhc-text-main">API Integrations</h1>
          <p className="text-sm text-lhc-text-muted mt-1">
            Manage external API configurations for your clinic
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="bg-lhc-primary hover:bg-lhc-primary/90 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Configuration
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="w-12 h-12 text-lhc-text-muted/40 mb-4" />
            <h3 className="text-lg font-semibold text-lhc-text-main mb-2">No API Configurations</h3>
            <p className="text-sm text-lhc-text-muted mb-6 max-w-md">
              Connect your clinic&apos;s external booking API to sync doctors, appointments, and bookings.
            </p>
            <Button onClick={() => setShowWizard(true)} className="bg-lhc-primary hover:bg-lhc-primary/90 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Your First Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              endpoints={getEnabledEndpoints(config)}
              onSetPrimary={() => handleSetPrimary(config.id)}
              onUpdateApiKey={() => setApiKeyTarget(config.id)}
              onUpdateEnvironment={(env) => handleUpdateEnvironment(config.id, env)}
              onToggleActive={() => handleToggleActive(config.id, config.is_active)}
              onTest={() => handleTest(config)}
              onDelete={() => setDeleteTarget(config.id)}
              isSettingPrimary={isSettingPrimary}
              isTesting={isTesting}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            This will permanently remove this API configuration and all associated data. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update API key dialog */}
      <Dialog open={!!apiKeyTarget} onOpenChange={() => { setApiKeyTarget(null); setNewApiKey('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>New API Key</Label>
            <Input
              type="password"
              placeholder="Enter new API key"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApiKeyTarget(null); setNewApiKey('') }} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateApiKey} disabled={isUpdating || !newApiKey.trim()} className="bg-lhc-primary hover:bg-lhc-primary/90 text-white">
              {isUpdating && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Update Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Config card sub-component ──────────────────────────────────────────────

function ConfigCard({
  config,
  endpoints,
  onSetPrimary,
  onUpdateApiKey,
  onUpdateEnvironment,
  onToggleActive,
  onTest,
  onDelete,
  isSettingPrimary,
  isTesting,
  isUpdating,
}: {
  config: ApiConfiguration
  endpoints: { name: string; method: string; url: string }[]
  onSetPrimary: () => void
  onUpdateApiKey: () => void
  onUpdateEnvironment: (env: string) => void
  onToggleActive: () => void
  onTest: () => void
  onDelete: () => void
  isSettingPrimary: boolean
  isTesting: boolean
  isUpdating: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold text-lhc-text-main">
              {config.config_name}
            </CardTitle>
            {config.is_primary && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Primary</Badge>
            )}
            {/* Environment selector */}
            <select
              className="rounded-full border border-lhc-border bg-lhc-surface px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:border-lhc-primary transition-colors"
              value={config.environment}
              disabled={isUpdating}
              onChange={(e) => onUpdateEnvironment(e.target.value)}
            >
              <option value="testing">Testing</option>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            {/* Active/Inactive toggle */}
            <button
              type="button"
              onClick={onToggleActive}
              disabled={isUpdating}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border cursor-pointer transition-colors ${
                config.is_active
                  ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {config.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetPrimary}
              disabled={isSettingPrimary || config.is_primary}
              title={config.is_primary ? 'This is the primary config' : 'Set as Primary'}
            >
              <Star className={`w-4 h-4 ${config.is_primary ? 'fill-amber-400 text-amber-400' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onUpdateApiKey} title="Update API Key">
              <Key className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onTest} disabled={isTesting} title="Test Connection">
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700" title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Enabled endpoints */}
        {endpoints.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wider">Endpoints</p>
            {endpoints.map((ep) => (
              <div key={ep.name} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {ep.method}
                </Badge>
                <span className="text-lhc-text-main truncate">{ep.name}</span>
                <span className="text-lhc-text-muted text-xs truncate ml-auto max-w-[300px]">{ep.url}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sync status */}
        <div className="flex items-center gap-4 text-xs text-lhc-text-muted pt-1 border-t border-lhc-border">
          <div className="flex items-center gap-1">
            {config.last_sync_status === 'success' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {config.last_sync_status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
            {!config.last_sync_status && <Clock className="w-3.5 h-3.5" />}
            <span>
              {config.last_sync_at
                ? `Last sync: ${new Date(config.last_sync_at).toLocaleDateString()}`
                : 'Never synced'}
            </span>
          </div>
          {config.last_tested_at && (
            <div className="flex items-center gap-1">
              <TestTube className="w-3.5 h-3.5" />
              <span>Tested: {new Date(config.last_tested_at).toLocaleDateString()}</span>
              {config.test_status && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {config.test_status}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
