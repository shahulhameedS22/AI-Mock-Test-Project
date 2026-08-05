"use client"

import { EvaluateAnswersAndProvideFeedbackOutput } from "@/ai/flows/evaluate-answers-and-provide-feedback-flow"

type SavedExamQuestion = {
  questionId: string
  questionText: string
  options: string[]
  correctAnswer: string
  explanation?: string
  topic: string
  difficulty: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  weakTopics: string[]
  strongTopics: string[]
  averageScore: number
  totalExams: number
  difficultyPreference: "easy" | "medium" | "hard"
  targetExam?: string
}

export interface ExamRecord {
  id: string
  type: string
  difficulty: string
  timestamp: number
  questions: Array<SavedExamQuestion & { marks?: number }>
  answers: Record<string, string>
  result?: EvaluateAnswersAndProvideFeedbackOutput
  category?: string
  duration?: number
  totalQuestions?: number
  adaptivePlan?: {
    focusAreas: string[]
    explanation: string
    distribution: Array<{
      topic: string
      percentage: number
      questionCount: number
    }>
  }
}

const STORAGE_KEY_CURRENT_USER_ID = "quantum_quizzes_current_user_id"
const STORAGE_KEY_USERS = "quantum_quizzes_users"
const STORAGE_KEY_EXAMS_BY_USER = "quantum_quizzes_exams_by_user"
const STORAGE_KEY_USER_CREDENTIALS = "quantum_quizzes_user_credentials"
const SESSION_STORAGE_KEY_EXAMS_BY_USER = "quantum_quizzes_exams_by_user_session"
const MAX_STORED_EXAMS_PER_USER = 12

const LEGACY_STORAGE_KEY_USER = "quantum_quizzes_user"
const LEGACY_STORAGE_KEY_EXAMS = "quantum_quizzes_exams"

const DEFAULT_WEAK_TOPICS = ["English", "Quantitative Aptitude", "Logical Reasoning"]
const DEFAULT_STRONG_TOPICS = ["English Language"]

const normalizeUserProfile = (profile: Partial<UserProfile> & Pick<UserProfile, "id" | "name" | "email">): UserProfile => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  weakTopics: Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0 ? profile.weakTopics : [...DEFAULT_WEAK_TOPICS],
  strongTopics: Array.isArray(profile.strongTopics) && profile.strongTopics.length > 0 ? profile.strongTopics : [...DEFAULT_STRONG_TOPICS],
  averageScore: typeof profile.averageScore === "number" ? profile.averageScore : 0,
  totalExams: typeof profile.totalExams === "number" ? profile.totalExams : 0,
  difficultyPreference: profile.difficultyPreference === "easy" || profile.difficultyPreference === "medium" || profile.difficultyPreference === "hard" ? profile.difficultyPreference : "medium",
  targetExam: typeof profile.targetExam === "string" ? profile.targetExam : undefined,
})

type UserMap = Record<string, UserProfile>
type ExamMap = Record<string, ExamRecord[]>

const createDefaultProfile = (user: Pick<UserProfile, "id" | "name" | "email">): UserProfile => normalizeUserProfile(user)

const getStorageJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback

  const saved = localStorage.getItem(key)
  if (!saved) return fallback

  try {
    return JSON.parse(saved) as T
  } catch {
    return fallback
  }
}

const getSessionStorageJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback

  const saved = sessionStorage.getItem(key)
  if (!saved) return fallback

  try {
    return JSON.parse(saved) as T
  } catch {
    return fallback
  }
}

const isQuotaExceededError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const err = error as any
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  )
}

const setStorageJson = (key: string, value: unknown): boolean => {
  if (typeof window === "undefined") return true

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn(`LocalStorage quota exceeded while saving ${key}`)
      return false
    }
    throw error
  }
}

const setSessionStorageJson = (key: string, value: unknown): boolean => {
  if (typeof window === "undefined") return true

  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const mergeExamMaps = (base: ExamMap, override: ExamMap): ExamMap => {
  const merged: ExamMap = { ...base }
  for (const [userId, exams] of Object.entries(override)) {
    merged[userId] = exams
  }
  return merged
}

const truncateExamEntries = (examsByUser: ExamMap, maxPerUser = MAX_STORED_EXAMS_PER_USER): ExamMap => {
  const result: ExamMap = {}
  for (const [userId, exams] of Object.entries(examsByUser)) {
    result[userId] = exams.slice(-maxPerUser)
  }
  return result
}

const mergeUserProfile = (existing: UserProfile | undefined, incoming: Pick<UserProfile, "id" | "name" | "email">): UserProfile => normalizeUserProfile({
  ...(existing ?? {}),
  ...incoming,
})

export const useAppStore = () => {
  const migrateLegacyStorage = () => {
    if (typeof window === "undefined") return

    const legacyUserRaw = localStorage.getItem(LEGACY_STORAGE_KEY_USER)
    const legacyExamsRaw = localStorage.getItem(LEGACY_STORAGE_KEY_EXAMS)

    if (!legacyUserRaw && !legacyExamsRaw) return

    const users = getStorageJson<UserMap>(STORAGE_KEY_USERS, {})
    const examsByUser = getStorageJson<ExamMap>(STORAGE_KEY_EXAMS_BY_USER, {})

    if (legacyUserRaw) {
      try {
        const legacyUser = JSON.parse(legacyUserRaw) as UserProfile
        users[legacyUser.id] = mergeUserProfile(users[legacyUser.id], legacyUser)
        localStorage.setItem(STORAGE_KEY_CURRENT_USER_ID, legacyUser.id)

        if (legacyExamsRaw) {
          const legacyExams = JSON.parse(legacyExamsRaw) as ExamRecord[]
          examsByUser[legacyUser.id] = legacyExams
        }
      } catch {
        // Ignore unreadable legacy data and continue with clean storage.
      }
    }

    setStorageJson(STORAGE_KEY_USERS, users)
    setStorageJson(STORAGE_KEY_EXAMS_BY_USER, examsByUser)
    localStorage.removeItem(LEGACY_STORAGE_KEY_USER)
    localStorage.removeItem(LEGACY_STORAGE_KEY_EXAMS)
  }

  const getUsers = (): UserMap => {
    migrateLegacyStorage()
    return getStorageJson<UserMap>(STORAGE_KEY_USERS, {})
  }

  const saveUsers = (users: UserMap) => {
    setStorageJson(STORAGE_KEY_USERS, users)
  }

  const getExamsByUser = (): ExamMap => {
    migrateLegacyStorage()
    const localExams = getStorageJson<ExamMap>(STORAGE_KEY_EXAMS_BY_USER, {})
    const sessionExams = getSessionStorageJson<ExamMap>(SESSION_STORAGE_KEY_EXAMS_BY_USER, {})
    return mergeExamMaps(localExams, sessionExams)
  }

  const saveExamsByUser = (examsByUser: ExamMap) => {
    if (setStorageJson(STORAGE_KEY_EXAMS_BY_USER, examsByUser)) {
      return
    }

    const trimmedExams = truncateExamEntries(examsByUser, MAX_STORED_EXAMS_PER_USER)
    if (setStorageJson(STORAGE_KEY_EXAMS_BY_USER, trimmedExams)) {
      return
    }

    console.warn('[store] LocalStorage full, saving exam data to sessionStorage fallback.')
    setSessionStorageJson(SESSION_STORAGE_KEY_EXAMS_BY_USER, examsByUser)
  }

  const getCurrentUserId = (): string | null => {
    migrateLegacyStorage()
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEY_CURRENT_USER_ID)
  }

  const getCredentials = (): Record<string, string> => {
    return getStorageJson<Record<string, string>>(STORAGE_KEY_USER_CREDENTIALS, {})
  }

  const saveCredentials = (credentials: Record<string, string>) => {
    setStorageJson(STORAGE_KEY_USER_CREDENTIALS, credentials)
  }

  const getUserByEmail = (email: string): UserProfile | null => {
    const users = getUsers()
    const normalizedEmail = email.toLowerCase()
    const found = Object.values(users).find((user) => user.email.toLowerCase() === normalizedEmail)
    return found ? normalizeUserProfile(found) : null
  }

  const registerUser = (name: string, email: string, password: string): UserProfile => {
    if (!name || !email || !password) throw new Error("name, email and password are required")

    if (getUserByEmail(email)) {
      throw new Error("Email already in use")
    }

    const id = String(Date.now())
    const user: UserProfile = createDefaultProfile({ id, name, email })
    saveUser(user)

    const credentials = getCredentials()
    credentials[email.toLowerCase()] = password
    saveCredentials(credentials)

    return user
  }

  const authenticateUser = (email: string, password: string): UserProfile | null => {
    const credentials = getCredentials()
    const storedPassword = credentials[email.toLowerCase()]
    if (!storedPassword || storedPassword !== password) {
      return null
    }
    return getUserByEmail(email)
  }

  const getUser = (): UserProfile | null => {
    const currentUserId = getCurrentUserId()
    if (!currentUserId) return null

    const users = getUsers()
    const found = users[currentUserId]
    return found ? normalizeUserProfile(found) : null
  }

  const saveUser = (user: UserProfile) => {
    const users = getUsers()
    const normalizedUser = normalizeUserProfile(user)
    users[normalizedUser.id] = normalizedUser
    saveUsers(users)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER_ID, normalizedUser.id)
    }
  }

  const saveAuthenticatedUser = (user: Pick<UserProfile, "id" | "name" | "email">) => {
    const users = getUsers()
    const mergedUser = mergeUserProfile(users[user.id], user)
    saveUser(mergedUser)
    return mergedUser
  }

  const updateUser = (user: UserProfile) => {
    saveUser(user)
  }

  const logout = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER_ID)
  }

  const getExams = (): ExamRecord[] => {
    const currentUserId = getCurrentUserId()
    if (!currentUserId) return []

    const examsByUser = getExamsByUser()
    return examsByUser[currentUserId] ?? []
  }

  const saveExam = (exam: ExamRecord) => {
    const currentUser = getUser()
    if (!currentUser) {
      throw new Error("No logged in user found")
    }

    const examsByUser = getExamsByUser()
    const userExams = examsByUser[currentUser.id] ?? []
    const index = userExams.findIndex((existingExam) => existingExam.id === exam.id)

    if (index > -1) {
      userExams[index] = exam
    } else {
      userExams.push(exam)
    }

    examsByUser[currentUser.id] = userExams.slice(-MAX_STORED_EXAMS_PER_USER)
    saveExamsByUser(examsByUser)

    if (exam.result) {
      const completedExams = userExams.filter((storedExam) => !!storedExam.result)
      const totalScore = completedExams.reduce((acc, storedExam) => acc + (storedExam.result?.overallScore || 0), 0)

      const updatedUser: UserProfile = {
        ...currentUser,
        totalExams: completedExams.length,
        averageScore: completedExams.length > 0 ? Math.min(100, totalScore / completedExams.length) : 0,
        weakTopics: Array.isArray(exam.result.weakestTopics) && exam.result.weakestTopics.length > 0
          ? exam.result.weakestTopics
          : currentUser.weakTopics,
        strongTopics: Array.from(
          new Set([
            ...currentUser.strongTopics,
            ...exam.result.topicAnalysis
              .filter((topic) => topic.performancePercentage > 70 && !exam.result?.weakestTopics.includes(topic.topic))
              .map((topic) => topic.topic),
          ])
        ),
      }

      if (exam.result.overallScore > 80 && updatedUser.difficultyPreference !== "hard") {
        updatedUser.difficultyPreference = updatedUser.difficultyPreference === "easy" ? "medium" : "hard"
      } else if (exam.result.overallScore < 40 && updatedUser.difficultyPreference !== "easy") {
        updatedUser.difficultyPreference = updatedUser.difficultyPreference === "hard" ? "medium" : "easy"
      }

      saveUser(updatedUser)
    }
  }

  return {
    getUser,
    saveUser,
    saveAuthenticatedUser,
    updateUser,
    logout,
    getExams,
    saveExam,
    getUserByEmail,
    registerUser,
    authenticateUser,
  }
}
