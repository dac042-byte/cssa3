'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/components/AuthProvider'

function SuccessContent() {
  const { refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Give a moment for the webhook to process
    const timer = setTimeout(async () => {
      await refreshProfile()
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [refreshProfile])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="card-elevated">
          {isLoading ? (
            <>
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Setting up your subscription...</h2>
              <p className="text-gray-600">Just a moment while we activate your account.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Clearhold!</h2>
              <p className="text-gray-600 mb-6">
                Your subscription is active. You now have unlimited access to examine your thoughts.
              </p>
              <Link href="/" className="btn-primary inline-block">
                Start using Clearhold
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <AuthProvider>
      <SuccessContent />
    </AuthProvider>
  )
}
