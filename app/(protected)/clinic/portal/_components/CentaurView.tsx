'use client'

import CentaurSyncPanel from './CentaurSyncPanel'
import CentaurLogsViewer from './CentaurLogsViewer'

interface Props {
  clinicId: string
  centaurPracticeId: string
}

export default function CentaurView({ clinicId, centaurPracticeId }: Props) {
  return (
    <div className="space-y-6">
      <CentaurSyncPanel practiceId={centaurPracticeId} clinicId={clinicId} />
      <CentaurLogsViewer clinicId={clinicId} />
    </div>
  )
}
