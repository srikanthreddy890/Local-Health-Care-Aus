'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StaffRole, ClinicPermissions, ClinicStaffMember } from '@/lib/clinic/staffTypes'
import { ROLE_PRESETS, PERMISSION_LABELS } from '@/lib/clinic/staffTypes'

interface EditStaffPermissionsDialogProps {
  isOpen: boolean
  onClose: () => void
  staffMember: ClinicStaffMember
  onSave: (userId: string, role: StaffRole, permissions: ClinicPermissions) => Promise<void>
  isOwner: boolean
}

const EDITABLE_ROLES_OWNER: { value: StaffRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
]

const EDITABLE_ROLES_MANAGER: { value: StaffRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
]

export default function EditStaffPermissionsDialog({
  isOpen,
  onClose,
  staffMember,
  onSave,
  isOwner,
}: EditStaffPermissionsDialogProps) {
  const [role, setRole] = useState<StaffRole>(staffMember.role)
  const [permissions, setPermissions] = useState<ClinicPermissions>(staffMember.permissions)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRole(staffMember.role)
    setPermissions(staffMember.permissions)
  }, [staffMember])

  function handleRoleChange(newRole: StaffRole) {
    setRole(newRole)
    setPermissions(ROLE_PRESETS[newRole])
  }

  function togglePermission(key: keyof ClinicPermissions) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(staffMember.user_id, role, permissions)
      onClose()
    } catch {
      // Dialog stays open on error; toast already shown by mutation's onError
    } finally {
      setSaving(false)
    }
  }

  const displayName = [staffMember.first_name, staffMember.last_name].filter(Boolean).join(' ') || staffMember.email || 'Staff Member'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-lhc-text-main">{displayName}</p>
            {staffMember.email && (
              <p className="text-xs text-lhc-text-muted">{staffMember.email}</p>
            )}
          </div>

          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as StaffRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(isOwner ? EDITABLE_ROLES_OWNER : EDITABLE_ROLES_MANAGER).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PERMISSION_LABELS) as (keyof ClinicPermissions)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-lhc-text-main cursor-pointer"
                >
                  <Checkbox
                    checked={permissions[key]}
                    onCheckedChange={() => togglePermission(key)}
                  />
                  {PERMISSION_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
