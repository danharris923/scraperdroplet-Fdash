import { NextRequest, NextResponse } from 'next/server'

const DROPLET_API_URL = process.env.DROPLET_API_URL || 'http://146.190.240.167:8080'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')

  try {
    const response = await fetch(`${DROPLET_API_URL}/${pathString}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Droplet API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Droplet API error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to droplet API' },
      { status: 503 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathString = path.join('/')

  try {
    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${DROPLET_API_URL}/${pathString}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Droplet API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Droplet API error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to droplet API' },
      { status: 503 }
    )
  }
}
