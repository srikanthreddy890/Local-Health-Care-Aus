'use client'

import BlogPostsManager from './blog/BlogPostsManager'

interface Props {
  clinicId: string
  clinicName: string
  clinicLogo?: string
}

export default function ClinicBlogManager({ clinicId, clinicName, clinicLogo }: Props) {
  return (
    <BlogPostsManager
      clinicContext={{ clinicId, clinicName, clinicLogo }}
    />
  )
}
