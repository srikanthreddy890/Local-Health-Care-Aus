import type { Metadata } from 'next'
import AcceptInvitation from './_components/AcceptInvitation'

export const metadata: Metadata = { title: 'Accept Invitation | Local Health Care' }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams
  return <AcceptInvitation token={token ?? null} />
}
