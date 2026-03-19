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
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="my-docs" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Documents</span>
          <span className="sm:hidden">My Docs</span>
        </TabsTrigger>
        <TabsTrigger value="from-clinics" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">From Clinics</span>
          <span className="sm:hidden">Clinics</span>
        </TabsTrigger>
        <TabsTrigger value="health-fund" className="flex items-center gap-1.5 text-xs sm:text-sm">
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
