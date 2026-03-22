'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import UnderlineExt from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Youtube from '@tiptap/extension-youtube'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import EditorToolbar from './EditorToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  content: string
  onChange: (html: string) => void
  clinicId: string
}

export default function RichTextEditor({ content, onChange, clinicId }: Props) {
  const isInternalChange = useRef(false)
  const [imageAltEdit, setImageAltEdit] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExt.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full', loading: 'lazy' },
        allowBase64: false,
      }),
      LinkExt.configure({
        HTMLAttributes: {
          class: 'text-lhc-primary underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        openOnClick: false,
      }),
      UnderlineExt,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your blog post...',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'blog-table' },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      TaskList.configure({
        HTMLAttributes: { class: 'blog-task-list' },
      }),
      TaskItem.configure({ nested: true }),
      Youtube.configure({
        HTMLAttributes: { class: 'blog-youtube-embed' },
        nocookie: true,
      }),
      CharacterCount,
      Typography,
    ],
    content,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      queueMicrotask(() => {
        onChange(editor.getHTML())
        isInternalChange.current = false
      })
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none min-h-[400px] p-4 bg-lhc-surface focus:outline-none prose-headings:text-lhc-text-main prose-p:text-lhc-text-main prose-a:text-lhc-primary prose-img:rounded-lg',
      },
    },
  })

  // Sync external content changes (e.g., loading existing post)
  useEffect(() => {
    if (editor && !isInternalChange.current && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className="border border-lhc-border rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} clinicId={clinicId} />
      <EditorContent editor={editor} />

      {/* Image Bubble Menu */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e }) => e.isActive('image')}
      >
        <div className="flex items-center gap-1 bg-white border border-lhc-border rounded-lg shadow-lg p-1.5">
          <span className="text-xs text-lhc-text-muted px-1">Size:</span>
          {[
            { label: 'S', width: '25%' },
            { label: 'M', width: '50%' },
            { label: 'L', width: '75%' },
            { label: 'Full', width: '100%' },
          ].map((size) => (
            <Button
              key={size.label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .updateAttributes('image', { style: `width: ${size.width}` })
                  .run()
              }}
            >
              {size.label}
            </Button>
          ))}
          <div className="w-px h-5 bg-lhc-border mx-1" />
          <Input
            placeholder="Alt text"
            className="h-7 text-xs w-32"
            value={imageAltEdit}
            onChange={(e) => setImageAltEdit(e.target.value)}
            onBlur={() => {
              if (imageAltEdit) {
                editor
                  .chain()
                  .focus()
                  .updateAttributes('image', { alt: imageAltEdit })
                  .run()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                editor
                  .chain()
                  .focus()
                  .updateAttributes('image', { alt: imageAltEdit })
                  .run()
              }
            }}
            onFocus={() => {
              const attrs = editor.getAttributes('image')
              setImageAltEdit(attrs.alt ?? '')
            }}
          />
        </div>
      </BubbleMenu>
    </div>
  )
}
