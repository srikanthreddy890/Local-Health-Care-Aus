import type { Metadata } from 'next'
import AdminBlog from '../_components/AdminBlog'

export const metadata: Metadata = { title: 'Blog | Admin Portal' }

export default function BlogPage() {
  return <AdminBlog />
}
