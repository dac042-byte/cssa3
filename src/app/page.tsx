'use client'

import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import Header from '@/components/Header'
import ThoughtFlow from '@/components/ThoughtFlow'
import { supabase } from '@/lib/supabase'

function generateSessionId() {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('clearhold_guest_session')
    if (!sessionId) {
      sessionId = 'guest_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('clearhold_guest_session', sessionId)
    }
    return sessionId
  }
  return 'guest_' + Math.random().toString(36).substring(2, 15)
}

function HomeContent() {
  const { user, profile, loading } = useAuth()
  const [dailyUsage, setDailyUsage] = useState(0)
  const [guestSessionId, setGuestSessionId] = useState<string>('')
  const maxDailyUsage = 5

  const isSubscribed = profile?.subscription_status === 'active'

  useEffect(() => {
    if (!user) {
      setGuestSessionId(generateSessionId())
    }
  }, [user])

  useEffect(() => {
    const fetchUsage = async () => {
      if (user) {
        // Fetch authenticated user's daily usage
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('daily_usage')
          .select('usage_count')
          .eq('user_id', user.id)
          .eq('usage_date', today)
          .single()

        setDailyUsage(data?.usage_count || 0)
      } else if (guestSessionId) {
        // Fetch guest usage
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('guest_usage')
          .select('usage_count')
          .eq('session_id', guestSessionId)
          .eq('usage_date', today)
          .single()

        setDailyUsage(data?.usage_count || 0)
      }
    }

    if (!loading) {
      fetchUsage()
    }
  }, [user, loading, guestSessionId])

  const handleUsageUpdate = async () => {
    // Refresh usage count
    if (user) {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single()

      setDailyUsage(data?.usage_count || 0)
    } else if (guestSessionId) {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('guest_usage')
        .select('usage_count')
        .eq('session_id', guestSessionId)
        .eq('usage_date', today)
        .single()

      setDailyUsage(data?.usage_count || 0)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        clarityPoints={profile?.clarity_points || 0}
        dailyUsage={dailyUsage}
        maxDailyUsage={maxDailyUsage}
        isSubscribed={isSubscribed}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Show signup prompt for guests who have used their first free session */}
        {!user && dailyUsage >= 1 && dailyUsage < maxDailyUsage && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-primary-800">
              You've used {dailyUsage} of 1 free session without an account.{' '}
              <a href="/signup" className="font-semibold underline">Create an account</a> to get {maxDailyUsage} free sessions per day.
            </p>
          </div>
        )}

        <ThoughtFlow
          dailyUsage={dailyUsage}
          maxDailyUsage={user ? maxDailyUsage : 1} // Guests only get 1 free, signed in users get 5
          isSubscribed={isSubscribed}
          guestSessionId={guestSessionId}
          onUsageUpdate={handleUsageUpdate}
        />
      </main>

      <footer className="py-8 text-center text-sm text-gray-500">
        <p>Clearhold - A tool for examining thoughts with clarity</p>
        <p className="mt-1">Not a substitute for professional mental health care</p>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  )
}
