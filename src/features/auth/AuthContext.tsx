import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppwriteException, type Models } from 'appwrite'
import { account, appwriteConfig, teams } from '../../lib/appwrite'

type AuthStatus = 'loading' | 'authenticated' | 'guest'

interface SignInResult {
  user: Models.User
  isTeacher: boolean
}

interface AuthContextValue {
  user: Models.User | null
  status: AuthStatus
  isTeacher: boolean
  teacherAuthorizationConfigured: boolean
  signIn(email: string, password: string): Promise<SignInResult>
  signOut(): Promise<void>
  refresh(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function belongsToTeachersTeam() {
  if (!appwriteConfig.teachersTeamId) return false
  try {
    await teams.get({ teamId: appwriteConfig.teachersTeamId })
    return true
  } catch {
    return false
  }
}

export function readableAuthError(error: unknown) {
  if (error instanceof AppwriteException) {
    if (error.code === 401) return 'E-mail eller adgangskode er forkert.'
    if (error.code === 409) return 'Der findes allerede en konto eller aktiv session med disse oplysninger.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Der opstod en ukendt fejl. Prøv igen.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [isTeacher, setIsTeacher] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const currentUser = await account.get()
      const teacher = await belongsToTeachersTeam()
      setUser(currentUser)
      setIsTeacher(teacher)
      setStatus('authenticated')
    } catch {
      setUser(null)
      setIsTeacher(false)
      setStatus('guest')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    await account.createEmailPasswordSession({ email, password })
    const currentUser = await account.get()
    const teacher = await belongsToTeachersTeam()
    setUser(currentUser)
    setIsTeacher(teacher)
    setStatus('authenticated')
    return { user: currentUser, isTeacher: teacher }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: 'current' })
    } finally {
      setUser(null)
      setIsTeacher(false)
      setStatus('guest')
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    isTeacher,
    teacherAuthorizationConfigured: Boolean(appwriteConfig.teachersTeamId),
    signIn,
    signOut,
    refresh,
  }), [isTeacher, refresh, signIn, signOut, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
