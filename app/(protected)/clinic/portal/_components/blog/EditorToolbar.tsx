'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Unlink,
} from 'lucide-react'
import BlogImageUpload from './BlogImageUpload'

interface Props {
  editor: Editor
  clinicId: string
}

function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  )
}

export default function EditorToolbar({ editor, clinicId }: Props) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  function insertLink() {
    if (!linkUrl) return
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl, target: '_blank', rel: 'noopener noreferrer' })
      .run()
    setLinkUrl('')
    setLinkDialogOpen(false)
  }

  function removeLink() {
    editor.chain().focus().unsetLink().run()
  }

  function insertImage(url: string) {
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
    setImageUrl('')
    setImageDialogOpen(false)
  }

  const iconClass = 'w-4 h-4'

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-lhc-border bg-lhc-background/50 rounded-t-lg">
        {/* Headings */}
        <ToolButton
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Paragraph"
        >
          <Pilcrow className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className={iconClass} />
        </ToolButton>

        <div className="w-px h-6 bg-lhc-border mx-1" />

        {/* Text format */}
        <ToolButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className={iconClass} />
        </ToolButton>

        <div className="w-px h-6 bg-lhc-border mx-1" />

        {/* Lists */}
        <ToolButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code className={iconClass} />
        </ToolButton>

        <div className="w-px h-6 bg-lhc-border mx-1" />

        {/* Alignment */}
        <ToolButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
        >
          <AlignLeft className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
        >
          <AlignCenter className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
        >
          <AlignRight className={iconClass} />
        </ToolButton>

        <div className="w-px h-6 bg-lhc-border mx-1" />

        {/* Insert */}
        <ToolButton
          active={editor.isActive('link')}
          onClick={() => {
            if (editor.isActive('link')) {
              removeLink()
            } else {
              setLinkUrl(editor.getAttributes('link').href ?? '')
              setLinkDialogOpen(true)
            }
          }}
          title={editor.isActive('link') ? 'Remove link' : 'Insert link'}
        >
          {editor.isActive('link') ? <Unlink className={iconClass} /> : <LinkIcon className={iconClass} />}
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => setImageDialogOpen(true)}
          title="Insert image"
        >
          <ImageIcon className={iconClass} />
        </ToolButton>

        <div className="w-px h-6 bg-lhc-border mx-1" />

        {/* History */}
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className={iconClass} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className={iconClass} />
        </ToolButton>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Upload Image</Label>
              <BlogImageUpload
                clinicId={clinicId}
                onUpload={(url) => insertImage(url)}
              />
            </div>
            <div className="text-center text-sm text-lhc-text-muted">or</div>
            <div>
              <Label>Image URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button onClick={() => insertImage(imageUrl)} disabled={!imageUrl}>
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
