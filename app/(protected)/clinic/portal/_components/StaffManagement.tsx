'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Users, UserPlus, Edit2, UserMinus, RefreshCw, X, Mail, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useClinicStaff } from '@/lib/hooks/useClinicStaff'
import { useClinicPermissions } from '@/lib/hooks/useClinicPermissions'
import type { ClinicStaffMember, ClinicInvitation, StaffRole, ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ROLE_BADGE_VARIANT } from '@/lib/clinic/staffTypes'
import InviteStaffDialog from './InviteStaffDialog'
import EditStaffPermissionsDialog from './EditStaffPermissionsDialog'

interface StaffManagementProps {
  clinicId: string
  userId?: string
}

export default function StaffManagement({ clinicId, userId }: StaffManagementProps) {
  const { staff, invitations, staffLoading, invitationsLoading, inviteStaff, resendInvitation, revokeInvitation, deactivateStaff, updatePermissions } = useClinicStaff(clinicId)
  const { canManageStaff, isOwner, loading: permLoading } = useClinicPermissions(clinicId)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<ClinicStaffMember | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'revoke'
    target: ClinicStaffMember | ClinicInvitation
    name: string
  } | null>(null)

  const loading = staffLoading || permLoading

  async function handleInvite(data: {
    email: string
    firstName?: string
    lastName?: string
    role: StaffRole
    permissions: ClinicPermissions
  }) {
    await inviteStaff.mutateAsync(data)
  }

  async function handleUpdatePermissions(targetUserId: string, role: StaffRole, permissions: ClinicPermissions) {
    await updatePermissions.mutateAsync({ userId: targetUserId, role, permissions })
  }

  async function handleConfirm() {
    if (!confirmAction) return
    try {
      if (confirmAction.type === 'deactivate') {
        await deactivateStaff.mutateAsync((confirmAction.target as ClinicStaffMember).user_id)
      } else {
        await revokeInvitation.mutateAsync((confirmAction.target as ClinicInvitation).id)
      }
      setConfirmAction(null)
    } catch {
      // Dialog stays open on error; toast already shown by mutation's onError
    }
  }

  function getInitials(member: ClinicStaffMember) {
    const f = member.first_name?.[0] ?? ''
    const l = member.last_name?.[0] ?? ''
    return (f + l).toUpperCase() || (member.email?.[0]?.toUpperCase() ?? '?')
  }

  function getDisplayName(member: ClinicStaffMember) {
    return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Unknown'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-lhc-primary" />
          <div>
            <h2 className="text-xl font-semibold text-lhc-text-main">Staff Management</h2>
            <p className="text-sm text-lhc-text-muted">
              {staff.length} active{invitations.length > 0 ? `, ${invitations.length} pending` : ''}
            </p>
          </div>
        </div>
        {canManageStaff && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Staff
          </Button>
        )}
      </div>

      {/* Active Staff */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-lhc-text-muted uppercase tracking-wide">Team Members</h3>
        {staff.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-10 h-10 text-lhc-text-muted mb-2" />
              <p className="text-lhc-text-muted text-sm">No staff members yet</p>
              {canManageStaff && (
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                  Invite your first team member
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          staff.map((member) => {
            const isTargetOwner = member.role === 'owner'
            const isSelf = member.user_id === userId
            const showActions = canManageStaff && !isTargetOwner && !isSelf

            return (
              <Card key={member.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-lhc-primary/10 flex items-center justify-center text-sm font-medium text-lhc-primary shrink-0">
                    {getInitials(member)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lhc-text-main truncate">
                        {getDisplayName(member)}
                      </span>
                      <Badge variant={ROLE_BADGE_VARIANT[member.role] as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'orange'}>
                        {member.role}
                      </Badge>
                      {isSelf && (
                        <span className="text-xs text-lhc-text-muted">(you)</span>
                      )}
                    </div>
                    {member.email && (
                      <p className="text-sm text-lhc-text-muted truncate">{member.email}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setEditingStaff(member)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() =>
                          setConfirmAction({
                            type: 'deactivate',
                            target: member,
                            name: getDisplayName(member),
                          })
                        }
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Deactivate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pending Invitations */}
      {(invitations.length > 0 || invitationsLoading) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-lhc-text-muted uppercase tracking-wide">Pending Invitations</h3>
          {invitations.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-lhc-border/30 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-lhc-text-muted" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lhc-text-main truncate">{inv.email}</span>
                    <Badge variant={ROLE_BADGE_VARIANT[inv.role] as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'orange'}>
                      {inv.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-lhc-text-muted">
                    {inv.first_name && (
                      <>
                        <span>{[inv.first_name, inv.last_name].filter(Boolean).join(' ')}</span>
                        <span>&middot;</span>
                      </>
                    )}
                    <span>Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {canManageStaff && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={resendInvitation.isPending}
                      onClick={() => resendInvitation.mutate(inv.id)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() =>
                        setConfirmAction({
                          type: 'revoke',
                          target: inv,
                          name: inv.email,
                        })
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                      Revoke
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <InviteStaffDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        isOwner={isOwner}
      />

      {/* Edit Permissions Dialog */}
      {editingStaff && (
        <EditStaffPermissionsDialog
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staffMember={editingStaff}
          onSave={handleUpdatePermissions}
          isOwner={isOwner}
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'deactivate' ? 'Deactivate Staff Member' : 'Revoke Invitation'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            {confirmAction?.type === 'deactivate'
              ? `Are you sure you want to deactivate ${confirmAction.name}? They will lose access to the clinic portal.`
              : `Are you sure you want to revoke the invitation for ${confirmAction?.name}?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={deactivateStaff.isPending || revokeInvitation.isPending}
            >
              {deactivateStaff.isPending || revokeInvitation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
