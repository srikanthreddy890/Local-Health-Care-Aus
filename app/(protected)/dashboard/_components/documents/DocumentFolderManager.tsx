'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, FolderOpen, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { DocumentFolder, CreateFolderData } from '@/lib/hooks/useDocumentFolders'

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface DocumentFolderManagerProps {
  folders: DocumentFolder[]
  onCreate: (data: CreateFolderData) => Promise<boolean>
  onUpdate: (id: string, data: Partial<CreateFolderData>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  trigger?: React.ReactNode
}

export default function DocumentFolderManager({
  folders,
  onCreate,
  onUpdate,
  onDelete,
  trigger,
}: DocumentFolderManagerProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(PRESET_COLORS[0])
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(folder: DocumentFolder) {
    setEditingId(folder.id)
    setEditName(folder.folder_name)
    setEditColor(folder.color)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    await onUpdate(id, { folder_name: editName.trim(), color: editColor })
    setSaving(false)
    setEditingId(null)
  }

  async function confirmCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const ok = await onCreate({ folder_name: newName.trim(), color: newColor })
    setSaving(false)
    if (ok) {
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setAddingNew(false)
    }
  }

  async function confirmDelete(id: string) {
    await onDelete(id)
    setDeleteId(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <FolderOpen className="w-4 h-4 mr-2" />
              Manage Folders
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Folders</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center gap-2 rounded-lg border border-lhc-border p-2">
                {editingId === folder.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          className="w-5 h-5 rounded-full ring-offset-1 transition-all"
                          style={{
                            backgroundColor: c,
                            outline: editColor === c ? `2px solid ${c}` : undefined,
                          }}
                          onClick={() => setEditColor(c)}
                          aria-label={`Select color ${c}`}
                        />
                      ))}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(folder.id)} disabled={saving}>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="flex-1 text-sm truncate text-lhc-text-main">{folder.folder_name}</span>
                    {!folder.is_default && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(folder)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(folder.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}

            {folders.length === 0 && !addingNew && (
              <p className="text-center text-sm text-lhc-text-muted py-4">No custom folders yet.</p>
            )}
          </div>

          {addingNew ? (
            <div className="border border-lhc-border rounded-lg p-3 space-y-2">
              <Input
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-full ring-offset-1 transition-all"
                    style={{
                      backgroundColor: c,
                      outline: newColor === c ? `2px solid ${c}` : undefined,
                    }}
                    onClick={() => setNewColor(c)}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={confirmCreate} disabled={saving || !newName.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingNew(false); setNewName('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingNew(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Folder
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-lhc-text-muted">
            Documents in this folder will not be deleted — they will just be moved to &quot;All Documents&quot;.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && confirmDelete(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
