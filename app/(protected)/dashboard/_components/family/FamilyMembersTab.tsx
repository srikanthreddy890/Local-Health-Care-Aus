'use client'

import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Calendar, Mail, Phone, X, Loader2 } from 'lucide-react'
import { differenceInYears } from 'date-fns'
import { useFamilyMembers, DEFAULT_FORM_DATA, type FamilyMember, type FamilyMemberFormData } from '@/lib/hooks/useFamilyMembers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Other']
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

// ── FormFields ─────────────────────────────────────────────────────────────────
interface FormFieldsProps {
  formData: FamilyMemberFormData
  onChange: (field: keyof FamilyMemberFormData, value: string) => void
}

function FormFields({ formData, onChange }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Relationship */}
      <div className="space-y-1.5">
        <Label>Relationship <span className="text-red-500">*</span></Label>
        <Select value={formData.relationship} onValueChange={(v) => onChange('relationship', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* First / Last Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name <span className="text-red-500">*</span></Label>
          <Input
            value={formData.first_name}
            onChange={(e) => onChange('first_name', e.target.value)}
            placeholder="First name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name <span className="text-red-500">*</span></Label>
          <Input
            value={formData.last_name}
            onChange={(e) => onChange('last_name', e.target.value)}
            placeholder="Last name"
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div className="space-y-1.5">
        <Label>Date of Birth</Label>
        <Input
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => onChange('date_of_birth', e.target.value)}
        />
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <Label>Gender</Label>
        <Select value={formData.gender} onValueChange={(v) => onChange('gender', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="email@example.com"
        />
      </div>

      {/* Mobile */}
      <div className="space-y-1.5">
        <Label>Mobile</Label>
        <Input
          type="tel"
          value={formData.mobile}
          onChange={(e) => onChange('mobile', e.target.value)}
          placeholder="+61 4XX XXX XXX"
        />
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1.5">
        <Label>Address Line 1</Label>
        <Input
          value={formData.address_line1}
          onChange={(e) => onChange('address_line1', e.target.value)}
          placeholder="123 Main St"
        />
      </div>

      {/* Address Line 2 */}
      <div className="space-y-1.5">
        <Label>Address Line 2</Label>
        <Input
          value={formData.address_line2}
          onChange={(e) => onChange('address_line2', e.target.value)}
          placeholder="Apt 4B (optional)"
        />
      </div>

      {/* City / State */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={formData.state} onValueChange={(v) => onChange('state', v)}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {AU_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Postcode */}
      <div className="space-y-1.5">
        <Label>Postcode</Label>
        <Input
          value={formData.postcode}
          onChange={(e) => onChange('postcode', e.target.value)}
          placeholder="2000"
          maxLength={4}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Allergies, medical conditions, special requirements..."
        />
      </div>
    </div>
  )
}

// ── Member Card ────────────────────────────────────────────────────────────────
interface CardProps {
  member: FamilyMember
  onEdit: () => void
  onDelete: () => void
}

function MemberCard({ member, onEdit, onDelete }: CardProps) {
  const age = member.date_of_birth
    ? differenceInYears(new Date(), new Date(member.date_of_birth))
    : null

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-lhc-text-main truncate">
            {member.first_name} {member.last_name}
          </h4>
          <Badge variant="secondary" className="mt-1 text-xs">{member.relationship}</Badge>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-lhc-text-muted hover:text-lhc-primary hover:bg-lhc-primary/10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-lhc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1">
        {age !== null && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{age} years old</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.mobile && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{member.mobile}</span>
          </div>
        )}
        {member.notes && (
          <p className="text-xs text-lhc-text-muted mt-1">
            <span className="font-medium">Note:</span> {member.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// ── FamilyMembersTab ───────────────────────────────────────────────────────────
export default function FamilyMembersTab() {
  const { familyMembers, isLoading, addFamilyMember, updateFamilyMember, deleteFamilyMember } =
    useFamilyMembers()

  const [formData, setFormData] = useState<FamilyMemberFormData>(DEFAULT_FORM_DATA)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleFieldChange(field: keyof FamilyMemberFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData(DEFAULT_FORM_DATA)
    setSelectedMember(null)
  }

  function handleEdit(member: FamilyMember) {
    setSelectedMember(member)
    setFormData({
      relationship: member.relationship,
      first_name: member.first_name,
      last_name: member.last_name,
      date_of_birth: member.date_of_birth ?? '',
      gender: member.gender ?? '',
      email: member.email ?? '',
      mobile: member.mobile ?? '',
      address_line1: member.address_line1 ?? '',
      address_line2: member.address_line2 ?? '',
      city: member.city ?? '',
      state: member.state ?? '',
      postcode: member.postcode ?? '',
      country: member.country ?? 'Australia',
      notes: member.notes ?? '',
    })
    setShowEditDialog(true)
  }

  function handleDeleteClick(member: FamilyMember) {
    setSelectedMember(member)
    setShowDeleteDialog(true)
  }

  async function handleAdd() {
    if (!formData.first_name.trim() || !formData.last_name.trim()) return
    setSubmitting(true)
    const ok = await addFamilyMember(formData)
    setSubmitting(false)
    if (ok) {
      setShowAddDialog(false)
      resetForm()
    }
  }

  async function handleUpdate() {
    if (!selectedMember || !formData.first_name.trim() || !formData.last_name.trim()) return
    setSubmitting(true)
    const ok = await updateFamilyMember(selectedMember.id, formData)
    setSubmitting(false)
    if (ok) {
      setShowEditDialog(false)
      resetForm()
    }
  }

  async function handleDelete() {
    if (!selectedMember) return
    setSubmitting(true)
    await deleteFamilyMember(selectedMember.id)
    setSubmitting(false)
    setShowDeleteDialog(false)
    setSelectedMember(null)
  }

  if (isLoading && familyMembers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-lhc-text-main">Family Members</h2>
        <Button
          onClick={() => { resetForm(); setShowAddDialog(true) }}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Family Member
        </Button>
      </div>

      {/* Empty state */}
      {familyMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-lhc-primary/10 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-lhc-primary/50" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lhc-text-main">No family members yet</p>
            <p className="text-sm text-lhc-text-muted mt-1">Add family members to book appointments on their behalf.</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add Your First Family Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {familyMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={() => handleEdit(member)}
              onDelete={() => handleDeleteClick(member)}
            />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm() } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <FormFields formData={formData} onChange={handleFieldChange} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting || !formData.first_name.trim() || !formData.last_name.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); resetForm() } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Family Member</DialogTitle>
          </DialogHeader>
          <FormFields formData={formData} onChange={handleFieldChange} />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm() }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || !formData.first_name.trim() || !formData.last_name.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Overlay */}
      {showDeleteDialog && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lhc-text-main">Remove Family Member?</h2>
              <button
                onClick={() => { setShowDeleteDialog(false); setSelectedMember(null) }}
                className="text-lhc-text-muted hover:text-lhc-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-lhc-text-muted">
              Are you sure you want to remove{' '}
              <strong className="text-lhc-text-main">
                {selectedMember.first_name} {selectedMember.last_name}
              </strong>
              ?
            </p>
            <p className="text-xs text-lhc-text-muted">
              This won&apos;t delete their booking history, but they won&apos;t appear in future bookings.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowDeleteDialog(false); setSelectedMember(null) }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
