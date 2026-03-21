'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StaffRole, ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ROLE_PRESETS, PERMISSION_LABELS } from '@/lib/clinic/staffTypes'

interface InviteStaffDialogProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (data: {
    email: string
    firstName?: string
    lastName?: string
    role: StaffRole
    permissions: ClinicPermissions
  }) => Promise<void>
  isOwner: boolean
}

const INVITABLE_ROLES_OWNER: { value: StaffRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
]

const INVITABLE_ROLES_MANAGER: { value: StaffRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'receptionist', label: 'Receptionist' },
]

export default function InviteStaffDialog({
  isOpen,
  onClose,
  onInvite,
  isOwner,
}: InviteStaffDialogProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<StaffRole>('staff')
  const [permissions, setPermissions] = useState<ClinicPermissions>(ROLE_PRESETS.staff)
  const [customizePermissions, setCustomizePermissions] = useState(false)
  const [sending, setSending] = useState(false)

  const roleOptions = isOwner ? INVITABLE_ROLES_OWNER : INVITABLE_ROLES_MANAGER

  function handleRoleChange(newRole: StaffRole) {
    setRole(newRole)
    if (!customizePermissions) {
      setPermissions(ROLE_PRESETS[newRole])
    }
  }

  function handleCustomizeToggle(checked: boolean) {
    setCustomizePermissions(checked)
    if (!checked) {
      setPermissions(ROLE_PRESETS[role])
    }
  }

  function togglePermission(key: keyof ClinicPermissions) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function resetForm() {
    setEmail('')
    setFirstName('')
    setLastName('')
    setRole('staff')
    setPermissions(ROLE_PRESETS.staff)
    setCustomizePermissions(false)
  }

  async function handleSubmit() {
    if (!email.trim()) return
    setSending(true)
    try {
      await onInvite({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role,
        permissions,
      })
      resetForm()
      onClose()
    } catch {
      // Dialog stays open on error; toast already shown by mutation's onError
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invite-first">First Name</Label>
              <Input
                id="invite-first"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invite-last">Last Name</Label>
              <Input
                id="invite-last"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as StaffRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="customize-perms">Customize Permissions</Label>
            <Switch
              id="customize-perms"
              checked={customizePermissions}
              onCheckedChange={handleCustomizeToggle}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PERMISSION_LABELS) as (keyof ClinicPermissions)[]).map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-lhc-text-main cursor-pointer"
              >
                <Checkbox
                  checked={permissions[key]}
                  onCheckedChange={() => togglePermission(key)}
                  disabled={!customizePermissions}
                />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !email.trim()}>
            {sending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
