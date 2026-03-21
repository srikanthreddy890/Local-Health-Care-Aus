'use client'

import { createContext, useContext } from 'react'

interface AdminContextValue {
  userId: string
  userEmail: string
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({
  userId,
  userEmail,
  children,
}: AdminContextValue & { children: React.ReactNode }) {
  return (
    <AdminContext.Provider value={{ userId, userEmail }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdminContext must be used within AdminProvider')
  return ctx
}
