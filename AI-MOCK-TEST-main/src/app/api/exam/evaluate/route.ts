import { NextRequest, NextResponse } from 'next/server'
import { evaluateAnswersAction } from '@/app/actions/exam-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }

    const result = await evaluateAnswersAction(body)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[api/exam/evaluate] Error:', error)
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 })
  }
}
