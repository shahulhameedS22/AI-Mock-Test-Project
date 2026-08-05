import { NextRequest, NextResponse } from 'next/server'
import { generateExamQuestionsAction, generateAdaptiveExamAction } from '@/app/actions/exam-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }

    const { mode } = body as { mode?: string }
    if (mode === 'adaptive') {
      const result = await generateAdaptiveExamAction({
        studentId: body.studentId,
        weakestTopics: body.weakestTopics,
        numQuestions: body.numQuestions,
        difficultyLevel: body.difficultyLevel,
        topicAnalysis: body.topicAnalysis,
        previousQuestionContext: body.previousQuestionContext,
        mistakenTopics: body.mistakenTopics,
        mistakenQuestions: body.mistakenQuestions,
      })
      return NextResponse.json({ success: true, data: result })
    }

    const result = await generateExamQuestionsAction({
      studentId: body.studentId,
      examType: body.examType,
      categories: body.categories,
      difficultyLevel: body.difficultyLevel,
      weakTopics: body.weakTopics,
      strongTopics: body.strongTopics,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[api/exam/generate] Error:', error)
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 })
  }
}
