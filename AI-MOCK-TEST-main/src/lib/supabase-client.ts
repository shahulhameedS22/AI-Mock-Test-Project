import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Type definitions
export interface UserProfile {
  id: string
  name: string
  email: string
  average_score: number
  total_exams: number
  weak_topics: string[]
  strong_topics: string[]
  difficulty_preference: 'easy' | 'medium' | 'hard'
  target_exam?: string
  last_login?: string
  login_count: number
  created_at: string
}

export interface ExamResult {
  id: string
  user_id: string
  exam_id: string
  topic: string
  difficulty: string
  total_marks: number
  obtained_marks: number
  questions: Record<string, any>[]
  answers: Record<string, string>
  feedback?: string
  time_taken: number
  created_at: string
}

export interface LoginHistory {
  id: string
  user_id: string
  login_time: string
  ip_address?: string
  user_agent?: string
}

// User functions
export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data as UserProfile
}

export const createUser = async (name: string, email: string, passwordHash: string) => {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name,
        email,
        password_hash: passwordHash,
        average_score: 0,
        total_exams: 0,
        weak_topics: ['English', 'Quantitative Aptitude', 'Logical Reasoning'],
        strong_topics: ['English Language'],
        difficulty_preference: 'medium',
        login_count: 0,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

// Login history functions
export const recordLogin = async (userId: string) => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  
  const { error: loginError } = await supabase
    .from('login_history')
    .insert([
      {
        user_id: userId,
        login_time: new Date().toISOString(),
        user_agent: userAgent,
      },
    ])

  if (loginError) console.error('Failed to record login:', loginError)

  // Update last_login and increment login_count
  const { data: user } = await supabase
    .from('users')
    .select('login_count')
    .eq('id', userId)
    .single()

  await supabase
    .from('users')
    .update({
      last_login: new Date().toISOString(),
      login_count: (user?.login_count || 0) + 1,
    })
    .eq('id', userId)
}

export const getLoginHistory = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('login_history')
    .select('*')
    .eq('user_id', userId)
    .order('login_time', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as LoginHistory[]
}

// Exam results functions
export const saveExamResult = async (
  userId: string,
  examData: Omit<ExamResult, 'id' | 'user_id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('exam_results')
    .insert([
      {
        user_id: userId,
        ...examData,
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Update user performance
  await updateUserPerformance(userId)

  return data as ExamResult
}

export const getUserExamResults = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ExamResult[]
}

export const getExamResultsByTopic = async (userId: string, topic: string) => {
  const { data, error } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ExamResult[]
}

// Performance analytics
export const updateUserPerformance = async (userId: string) => {
  // Get all exam results for user
  const { data: exams, error: examsError } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', userId)

  if (examsError || !exams) return

  // Calculate performance metrics
  const totalExams = exams.length
  const totalScore = exams.reduce((sum, exam) => sum + exam.obtained_marks, 0)
  const totalMaxMarks = exams.reduce((sum, exam) => sum + exam.total_marks, 0)
  const averageScore = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0

  // Calculate weak/strong topics
  const topicScores: Record<string, { total: number; count: number }> = {}
  exams.forEach((exam) => {
    if (!topicScores[exam.topic]) {
      topicScores[exam.topic] = { total: 0, count: 0 }
    }
    topicScores[exam.topic].total += exam.obtained_marks
    topicScores[exam.topic].count += 1
  })

  const topicPercentages = Object.entries(topicScores).map(([topic, scores]) => ({
    topic,
    percentage: (scores.total / (scores.count * 100)) * 100,
  }))

  const weakTopics = topicPercentages
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3)
    .map((t) => t.topic)

  const strongTopics = topicPercentages
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2)
    .map((t) => t.topic)

  // Update user profile
  await supabase
    .from('users')
    .update({
      average_score: Math.round(averageScore * 100) / 100,
      total_exams: totalExams,
      weak_topics: weakTopics,
      strong_topics: strongTopics,
    })
    .eq('id', userId)
}

// Analytics summary
export const getUserAnalytics = async (userId: string) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  const { data: exams, error: examsError } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', userId)

  if (examsError) throw examsError

  const { data: logins, error: loginsError } = await supabase
    .from('login_history')
    .select('*')
    .eq('user_id', userId)

  if (loginsError) throw loginsError

  return {
    user,
    totalExams: exams?.length || 0,
    averageScore: user?.average_score || 0,
    weakTopics: user?.weak_topics || [],
    strongTopics: user?.strong_topics || [],
    recentExams: exams?.slice(0, 5) || [],
    loginHistory: logins || [],
    lastLogin: user?.last_login,
    loginCount: user?.login_count || 0,
  }
}

// Batch analytics for admin
export const getAllUsersAnalytics = async () => {
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      average_score,
      total_exams,
      last_login,
      login_count,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return users
}

export const getTotalStats = async () => {
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')

  const { data: exams, error: examError } = await supabase
    .from('exam_results')
    .select('id')

  const { data: logins, error: loginError } = await supabase
    .from('login_history')
    .select('id')

  if (userError || examError || loginError) throw userError

  return {
    totalUsers: users?.length || 0,
    totalExams: exams?.length || 0,
    totalLogins: logins?.length || 0,
  }
}
