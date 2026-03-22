'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BlogPostsManager from '@/app/(protected)/clinic/portal/_components/blog/BlogPostsManager'
import AdminClinicBlogReview from './AdminClinicBlogReview'

export default function AdminBlog() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">Blog Management</h2>
        <p className="text-sm text-lhc-text-muted">
          Manage platform articles and review clinic blog submissions.
        </p>
      </div>

      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">Platform Articles</TabsTrigger>
          <TabsTrigger value="clinic">Clinic Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-4">
          <BlogPostsManager platformOnly />
        </TabsContent>

        <TabsContent value="clinic" className="mt-4">
          <AdminClinicBlogReview />
        </TabsContent>
      </Tabs>
    </div>
  )
}
