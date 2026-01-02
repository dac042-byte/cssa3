'use client'

import { useAuth } from './AuthProvider'
import Link from 'next/link'

interface HeaderProps {
  clarityPoints?: number
  dailyUsage?: number
  maxDailyUsage?: number
  isSubscribed?: boolean
}

export default function Header({
  clarityPoints = 0,
  dailyUsage = 0,
  maxDailyUsage = 5,
  isSubscribed = false
}: HeaderProps) {
  const { user, profile, signOut, loading } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-900">Clearhold</span>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{profile?.clarity_points || clarityPoints} pts</span>
                  </div>

                  {!isSubscribed && profile?.subscription_status !== 'active' && (
                    <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                      <span>{dailyUsage}/{maxDailyUsage} today</span>
                    </div>
                  )}

                  {(isSubscribed || profile?.subscription_status === 'active') && (
                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Unlimited</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}

            {!user && !loading && (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
