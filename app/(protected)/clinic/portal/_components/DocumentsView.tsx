'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PatientSharedDocuments from './PatientSharedDocuments'
import ClinicDocumentsTab from './ClinicDocumentsTab'

export default function DocumentsView({ clinicId }: { clinicId: string }) {
  return (
    <Tabs defaultValue="from-patients">
      <TabsList className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-gray-100 p-1">
        <TabsTrigger value="from-patients" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700">From Patients</TabsTrigger>
        <TabsTrigger value="to-patients" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700">Shared with Patients</TabsTrigger>
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
