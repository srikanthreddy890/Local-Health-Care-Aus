'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
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
  Minus,
  Table as TableIcon,
  TableCellsMerge,
  Rows3,
  Columns3,
  Trash2,
  Superscript,
  Subscript,
  Highlighter,
  Palette,
  Video,
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
  disabled,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

const COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#4B5563' },
  { label: 'Red', value: '#DC2626' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Green', value: '#16A34A' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Purple', value: '#9333EA' },
  { label: 'Pink', value: '#DB2777' },
  { label: 'Teal', value: '#0D9488' },
]

const HIGHLIGHTS = [
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Green', value: '#BBF7D0' },
  { label: 'Blue', value: '#BFDBFE' },
  { label: 'Pink', value: '#FBCFE8' },
  { label: 'Orange', value: '#FED7AA' },
  { label: 'Purple', value: '#E9D5FF' },
]

const Separator = () => <div className="w-px h-6 bg-lhc-border mx-1" />

export default function EditorToolbar({ editor, clinicId }: Props) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const iconClass = 'w-4 h-4'
  const isInTable = editor.isActive('table')

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

  function insertImage(url: string, alt?: string) {
    if (!url) return
    editor.chain().focus().setImage({ src: url, alt: alt || '' }).run()
    setImageUrl('')
    setImageAlt('')
    setImageDialogOpen(false)
  }

  function insertYoutube() {
    if (!youtubeUrl) return
    editor.commands.setYoutubeVideo({ src: youtubeUrl })
    setYoutubeUrl('')
    setYoutubeDialogOpen(false)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-lhc-border bg-lhc-surface shadow-sm sticky top-0 z-[1] rounded-t-lg">
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

        <Separator />

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
        <ToolButton
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <Superscript className={iconClass} />
        </ToolButton>
        <ToolButton
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <Subscript className={iconClass} />
        </ToolButton>

        <Separator />

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text color">
              <Palette className={iconClass} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full mt-1 text-xs text-lhc-text-muted hover:text-lhc-text-main"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Remove color
            </button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive('highlight') ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              title="Highlight"
            >
              <Highlighter className={iconClass} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-3 gap-1">
              {HIGHLIGHTS.map((hl) => (
                <button
                  key={hl.value}
                  type="button"
                  className="w-8 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: hl.value }}
                  title={hl.label}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: hl.value }).run()}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full mt-1 text-xs text-lhc-text-muted hover:text-lhc-text-main"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Remove highlight
            </button>
          </PopoverContent>
        </Popover>

        <Separator />

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
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Task list"
        >
          <ListChecks className={iconClass} />
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
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className={iconClass} />
        </ToolButton>

        <Separator />

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

        <Separator />

        {/* Table */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={isInTable ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              title="Table"
            >
              <TableIcon className={iconClass} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="space-y-1">
              {!isInTable ? (
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-lhc-background/50"
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                  <TableCellsMerge className="w-4 h-4" /> Insert 3x3 table
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-lhc-background/50"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                  >
                    <Rows3 className="w-4 h-4" /> Add row below
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-lhc-background/50"
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                  >
                    <Columns3 className="w-4 h-4" /> Add column right
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-lhc-background/50"
                    onClick={() => editor.chain().focus().deleteRow().run()}
                  >
                    <Rows3 className="w-4 h-4 text-red-500" /> Delete row
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-lhc-background/50"
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                  >
                    <Columns3 className="w-4 h-4 text-red-500" /> Delete column
                  </button>
                  <hr className="my-1 border-lhc-border" />
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-red-50 text-red-600"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                  >
                    <Trash2 className="w-4 h-4" /> Delete table
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Separator />

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
        <ToolButton
          active={false}
          onClick={() => setYoutubeDialogOpen(true)}
          title="Embed YouTube video"
        >
          <Video className={iconClass} />
        </ToolButton>

        <Separator />

        {/* History */}
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          <Undo className={iconClass} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          <Redo className={iconClass} />
        </ToolButton>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Enter the URL for the link.</DialogDescription>
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
            <DialogDescription>Upload an image or paste a URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Upload Image</Label>
              <BlogImageUpload
                clinicId={clinicId}
                onUpload={(url) => insertImage(url, imageAlt)}
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
                <Button onClick={() => insertImage(imageUrl, imageAlt)} disabled={!imageUrl}>
                  Insert
                </Button>
              </div>
            </div>
            <div>
              <Label>Alt Text (for accessibility)</Label>
              <Input
                placeholder="Describe the image..."
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Dialog */}
      <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube Video</DialogTitle>
            <DialogDescription>Paste a YouTube URL to embed a video.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>YouTube URL</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertYoutube()}
              />
              <p className="text-xs text-lhc-text-muted mt-1">
                Paste any YouTube URL (regular, short, or embed format)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYoutubeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertYoutube} disabled={!youtubeUrl}>
              Embed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
