'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PatientSharedDocuments from './PatientSharedDocuments'
import ClinicDocumentsTab from './ClinicDocumentsTab'

export default function DocumentsView({ clinicId }: { clinicId: string }) {
  return (
    <Tabs defaultValue="from-patients">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="from-patients">From Patients</TabsTrigger>
        <TabsTrigger value="to-patients">Shared with Patients</TabsTrigger>
      </TabsList>
      <TabsContent value="from-patients" className="mt-4">
        <PatientSharedDocuments clinicId={clinicId} />
      </TabsContent>
      <TabsContent value="to-patients" className="mt-4">
        <ClinicDocumentsTab clinicId={clinicId} />
      </TabsContent>
    </Tabs>
  )
}
