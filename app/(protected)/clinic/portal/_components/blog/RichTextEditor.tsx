'use client'

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import UnderlineExt from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import EditorToolbar from './EditorToolbar'

interface Props {
  content: string
  onChange: (html: string) => void
  clinicId: string
}

export default function RichTextEditor({ content, onChange, clinicId }: Props) {
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExt.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
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
          'prose prose-lg max-w-none min-h-[400px] p-4 focus:outline-none prose-headings:text-lhc-text-main prose-p:text-lhc-text-main prose-a:text-lhc-primary prose-img:rounded-lg',
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
    </div>
  )
}
