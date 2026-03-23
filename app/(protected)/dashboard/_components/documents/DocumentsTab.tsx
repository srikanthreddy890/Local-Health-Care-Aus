'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Building2, CreditCard } from 'lucide-react'
import MyDocumentsTab from './MyDocumentsTab'
import ClinicSharedDocumentsTab from './ClinicSharedDocumentsTab'
import HealthFundCardsTab from './HealthFundCardsTab'

interface DocumentsTabProps {
  userId: string
}

export default function DocumentsTab({ userId }: DocumentsTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dtab = searchParams.get('dtab') ?? 'my-docs'

  function setDtab(t: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('dtab', t)
    router.replace(`?${p.toString()}`)
  }

  return (
    <Tabs value={dtab} onValueChange={setDtab}>
      <TabsList className="inline-flex p-[3px] rounded-[10px] border border-lhc-border bg-lhc-background mb-6 w-fit max-w-full overflow-x-auto">
        <TabsTrigger value="my-docs" className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-[7px] data-[state=active]:bg-white data-[state=active]:text-lhc-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-lhc-border/50 data-[state=active]:font-medium data-[state=inactive]:text-lhc-text-muted">
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Documents</span>
          <span className="sm:hidden">My Docs</span>
        </TabsTrigger>
        <TabsTrigger value="from-clinics" className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-[7px] data-[state=active]:bg-white data-[state=active]:text-lhc-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-lhc-border/50 data-[state=active]:font-medium data-[state=inactive]:text-lhc-text-muted">
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">From Clinics</span>
          <span className="sm:hidden">Clinics</span>
        </TabsTrigger>
        <TabsTrigger value="health-fund" className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-[7px] data-[state=active]:bg-white data-[state=active]:text-lhc-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-lhc-border/50 data-[state=active]:font-medium data-[state=inactive]:text-lhc-text-muted">
          <CreditCard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Health Fund Cards</span>
          <span className="sm:hidden">Cards</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="my-docs">
        <MyDocumentsTab userId={userId} />
      </TabsContent>

      <TabsContent value="from-clinics">
        <ClinicSharedDocumentsTab userId={userId} />
      </TabsContent>

      <TabsContent value="health-fund">
        <HealthFundCardsTab userId={userId} />
      </TabsContent>
    </Tabs>
  )
}
