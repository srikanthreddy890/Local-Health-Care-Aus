import { permanentRedirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ category: string }>
}

export default async function BlogCategoryOrPostRedirect({ params }: Props) {
  const slug = (await params).category
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('blog_posts')
    .select('category, slug')
    .eq('slug', slug)
    .single()

  if (!data) notFound()
  permanentRedirect(`/blog/${data.category ?? 'general'}/${data.slug}`)
}
