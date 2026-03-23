'use client'

import { useState } from 'react'
import PatientSharedDocuments from './PatientSharedDocuments'
import ClinicDocumentsTab from './ClinicDocumentsTab'
import { FileText, Users, Share2, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'shared-with', label: 'Shared with Patients', icon: Share2 },
  { key: 'from-patients', label: 'From Patients', icon: Users },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function DocumentsView({ clinicId }: { clinicId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>('from-patients')

  return (
    <div className="space-y-4">
      {/* Single flat pill-toggle tab row */}
      <div className="bg-gray-100 rounded-[10px] p-[3px] border border-gray-200/80 inline-flex w-full">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-white border border-gray-200/80 shadow-sm text-[#00A86B]'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {activeTab === 'from-patients' && <PatientSharedDocuments clinicId={clinicId} />}
      {activeTab === 'shared-with' && <ClinicDocumentsTab clinicId={clinicId} />}
    </div>
  )
}
