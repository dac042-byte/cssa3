'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

function SubscribeContent() {
  const { user, profile, loading } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const canceled = searchParams.get('canceled') === 'true'
  const isSubscribed = profile?.subscription_status === 'active'

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="card-elevated">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're subscribed!</h2>
            <p className="text-gray-600 mb-6">
              You have unlimited access to Clearhold. Thank you for your support.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Go to Clearhold
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-2xl font-semibold text-gray-900">Clearhold</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Get unlimited access</h1>
          <p className="text-gray-600 mt-2">Examine your thoughts without limits</p>
        </div>

        {canceled && (
          <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-6 text-center">
            Checkout was canceled. You can try again when you're ready.
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <div className="card-elevated">
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-gray-900">$1</span>
              <span className="text-gray-600">/month</span>
            </div>
            <p className="text-gray-600">Cancel anytime</p>
          </div>

          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Unlimited daily thought sessions</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Earn Clarity Points without limits</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Support the development of Clearhold</span>
            </li>
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="btn-primary w-full py-3 text-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting to checkout...
              </span>
            ) : (
              'Subscribe for $1/month'
            )}
          </button>

          {!user && (
            <p className="text-center text-sm text-gray-500 mt-4">
              You'll need to <Link href="/login" className="text-primary-600 hover:underline">sign in</Link> or{' '}
              <Link href="/signup" className="text-primary-600 hover:underline">create an account</Link> first.
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Free users get 5 sessions per day</p>
          <Link href="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Continue with free plan
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <AuthProvider>
      <SubscribeContent />
    </AuthProvider>
  )
}
