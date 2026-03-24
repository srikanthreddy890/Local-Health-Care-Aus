'use client'

import { useState, useCallback, useEffect } from 'react'
import { useApiConfigurations } from '@/lib/hooks/useApiConfigurations'
import { useWizardDraft } from '@/lib/hooks/useWizardDraft'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Globe, ArrowLeft, ArrowRight, MonitorCog } from 'lucide-react'
import EndpointConfigurationStep, { type HeaderEntry } from './EndpointConfigurationStep'

interface Props {
  clinicId: string
  onComplete: () => void
  onCancel: () => void
}

type IntegrationType = 'custom' | 'centaur' | 'd4w'

interface WizardState {
  integrationType: IntegrationType
  configName: string
  environment: string
  endpointConfig: Record<string, unknown>
  fieldMappings: Record<string, unknown>
  bookingResponseConfig: Record<string, unknown>
  authMethod: string
  apiKey: string
  practiceId: string
}

const INITIAL_STATE: WizardState = {
  integrationType: 'custom',
  configName: 'Custom API',
  environment: 'production',
  endpointConfig: {},
  fieldMappings: {},
  bookingResponseConfig: {},
  authMethod: 'api_key',
  apiKey: '',
  practiceId: '',
}

export default function ApiIntegrationWizard({ clinicId, onComplete, onCancel }: Props) {
  const { createConfig, isCreating } = useApiConfigurations(clinicId)
  const { hasDraft, draftData, saveDraft, deleteDraft, isLoading: isDraftLoading } = useWizardDraft(clinicId)

  const [step, setStep] = useState(0) // 0 = choose type, 1 = configure
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [showResumeDialog, setShowResumeDialog] = useState(false)

  // Show resume dialog if draft exists
  useEffect(() => {
    if (!isDraftLoading && hasDraft && draftData) {
      setShowResumeDialog(true)
    }
  }, [isDraftLoading, hasDraft, draftData])

  // Resume from draft
  function handleResume() {
    if (draftData) {
      const wd = draftData.wizard_data as Partial<WizardState>
      setState((prev) => ({ ...prev, ...wd }))
      setStep(draftData.current_step)
    }
    setShowResumeDialog(false)
  }

  // Start fresh
  function handleStartFresh() {
    deleteDraft()
    setShowResumeDialog(false)
  }

  // Auto-save draft on state changes
  const saveCurrentDraft = useCallback(() => {
    // Strip sensitive values before persisting draft to database
    const safeDraftState = { ...state } as Record<string, unknown>
    if (state.endpointConfig && typeof state.endpointConfig === 'object') {
      const { sanitizedEndpointConfig } = extractSensitiveHeaders(
        state.endpointConfig as Record<string, Record<string, unknown>>
      )
      // Also strip auth.token from each endpoint in the draft
      const stripped = JSON.parse(JSON.stringify(sanitizedEndpointConfig)) as Record<string, Record<string, unknown>>
      for (const ep of Object.values(stripped)) {
        const auth = ep.auth as Record<string, unknown> | undefined
        if (auth?.token && auth.token !== '[ENCRYPTED]') {
          auth.token = '[ENCRYPTED]'
        }
        if (auth?.password && auth.password !== '[ENCRYPTED]') {
          auth.password = '[ENCRYPTED]'
        }
      }
      safeDraftState.endpointConfig = stripped
    }
    saveDraft({
      wizard_data: safeDraftState,
      current_step: step,
    })
  }, [state, step, saveDraft])

  useEffect(() => {
    if (step > 0) saveCurrentDraft()
  }, [state, step, saveCurrentDraft])

  // ── Step 0: Choose integration type ───────────────────────────────────

  function handleTypeSelect(type: IntegrationType) {
    setState((prev) => ({
      ...prev,
      integrationType: type,
      configName: type === 'custom' ? 'Custom API' : type === 'centaur' ? 'Centaur' : 'D4W',
    }))
    setStep(1)
  }

  // ── Submit ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    try {
      // Extract sensitive header values before sending to edge function
      // The edge function will encrypt custom_auth_headers and strip them from endpoint_config
      const { sanitizedEndpointConfig, customAuthHeaders } = extractSensitiveHeaders(
        state.endpointConfig as Record<string, Record<string, unknown>>
      )

      await createConfig({
        clinic_id: clinicId,
        config_name: state.configName,
        integration_type: state.integrationType,
        environment: state.environment,
        auth_method: state.authMethod,
        endpoint_config: sanitizedEndpointConfig,
        field_mappings: state.fieldMappings,
        booking_response_config: state.bookingResponseConfig,
        practice_id: state.practiceId || undefined,
        apiKey: state.apiKey || undefined,
        custom_auth_headers: Object.keys(customAuthHeaders).length > 0 ? customAuthHeaders : undefined,
      })
      await deleteDraft()
      onComplete()
    } catch {
      toast.error('Failed to create configuration. Please try again.')
    }
  }

  // ── Progress bar ──────────────────────────────────────────────────────

  const totalSteps = 2
  const progress = ((step + 1) / totalSteps) * 100

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-lhc-text-main">New API Integration</h1>
          <p className="text-sm text-lhc-text-muted">
            Step {step + 1} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-lhc-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-lhc-text-main">Choose Integration Type</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <IntegrationTypeCard

              title="Custom API"
              description="Connect any REST API with configurable endpoints and field mappings"
              icon={<Globe className="w-8 h-8 text-lhc-primary" />}
              onClick={() => handleTypeSelect('custom')}
            />
            <IntegrationTypeCard

              title="Centaur"
              description="Integration with Centaur practice management software"
              icon={<MonitorCog className="w-8 h-8 text-purple-600" />}
              onClick={() => handleTypeSelect('centaur')}
            />
            <IntegrationTypeCard

              title="D4W"
              description="Integration with D4W dental software"
              icon={<MonitorCog className="w-8 h-8 text-blue-600" />}
              onClick={() => handleTypeSelect('d4w')}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <EndpointConfigurationStep
          clinicId={clinicId}
          state={state}
          onStateChange={(updates) => setState((prev) => ({ ...prev, ...updates }) as WizardState)}
          onSubmit={handleSubmit}
          isSubmitting={isCreating}
        />
      )}

      {/* Resume draft dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Previous Configuration?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            You have an incomplete API configuration from{' '}
            {draftData?.updated_at
              ? new Date(draftData.updated_at).toLocaleDateString()
              : 'a previous session'}
            . Would you like to continue where you left off?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleStartFresh}>
              Start Fresh
            </Button>
            <Button onClick={handleResume} className="bg-lhc-primary hover:bg-lhc-primary/90 text-white">
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Integration type card ──────────────────────────────────────────────────

function IntegrationTypeCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer hover:border-lhc-primary/50 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center text-center p-6 gap-3">
        {icon}
        <h3 className="font-semibold text-lhc-text-main">{title}</h3>
        <p className="text-sm text-lhc-text-muted">{description}</p>
        <Button variant="outline" size="sm" className="mt-2">
          Select
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Security helpers ───────────────────────────────────────────────────────

/**
 * Extract sensitive custom header values from endpoint_config.
 * Returns sanitized config (sensitive values replaced with '[ENCRYPTED]')
 * and a separate map of sensitive headers for encrypted storage.
 */
function extractSensitiveHeaders(endpointConfig: Record<string, Record<string, unknown>>) {
  const sanitized = JSON.parse(JSON.stringify(endpointConfig)) as Record<string, Record<string, unknown>>
  const customAuthHeaders: Record<string, Record<string, string>> = {}

  for (const [endpointKey, endpoint] of Object.entries(sanitized)) {
    const headerEntries = endpoint.headerEntries as HeaderEntry[] | undefined
    if (!headerEntries?.length) continue

    const sensitiveHeaders: Record<string, string> = {}
    const cleanedEntries: HeaderEntry[] = []
    const cleanedHeaders: Record<string, string> = {}

    for (const entry of headerEntries) {
      if (!entry.name) continue
      if (entry.sensitive && entry.value && entry.value !== '[ENCRYPTED]') {
        sensitiveHeaders[entry.name] = entry.value
        cleanedEntries.push({ ...entry, value: '[ENCRYPTED]' })
        cleanedHeaders[entry.name] = '[ENCRYPTED]'
      } else {
        cleanedEntries.push(entry)
        cleanedHeaders[entry.name] = entry.value
      }
    }

    if (Object.keys(sensitiveHeaders).length > 0) {
      customAuthHeaders[endpointKey] = sensitiveHeaders
    }

    sanitized[endpointKey] = {
      ...endpoint,
      headers: cleanedHeaders,
      headerEntries: cleanedEntries,
    }
  }

  return { sanitizedEndpointConfig: sanitized, customAuthHeaders }
}
