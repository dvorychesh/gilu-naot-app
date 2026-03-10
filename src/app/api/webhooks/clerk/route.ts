import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/db'

type ClerkUserPayload = {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name?: string
    last_name?: string
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let payload: ClerkUserPayload
  try {
    const wh = new Webhook(secret)
    payload = wh.verify(body, headers) as ClerkUserPayload
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (payload.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = payload.data
    const email = email_addresses[0]?.email_address
    if (email) {
      await prisma.user.upsert({
        where: { clerkId: id },
        update: { email, name: [first_name, last_name].filter(Boolean).join(' ') || null },
        create: {
          clerkId: id,
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || null,
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
