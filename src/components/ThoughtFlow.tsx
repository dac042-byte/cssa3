'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

const COGNITIVE_DISTORTIONS = [
  { id: 'catastrophizing', label: 'Catastrophizing', description: 'Assuming the worst will happen' },
  { id: 'mind-reading', label: 'Mind reading', description: 'Assuming you know what others think' },
  { id: 'all-or-nothing', label: 'All-or-nothing', description: 'Seeing things in black and white' },
  { id: 'emotional-reasoning', label: 'Emotional reasoning', description: 'Feelings as evidence of truth' },
  { id: 'should-statements', label: 'Should statements', description: 'Rigid rules about how things must be' },
  { id: 'fortune-telling', label: 'Fortune telling', description: 'Predicting negative outcomes' },
  { id: 'personalization', label: 'Personalization', description: 'Taking excessive responsibility' },
  { id: 'overgeneralization', label: 'Overgeneralization', description: 'One event = always/never' },
]

const CLASSIFICATION_OPTIONS = [
  { id: 'fact', label: 'Fact', description: 'Something objectively verifiable' },
  { id: 'thought', label: 'Thought', description: 'An interpretation or opinion' },
  { id: 'prediction', label: 'Prediction', description: 'An assumption about the future' },
]

const EVIDENCE_OPTIONS = [
  { id: 'yes', label: 'Yes', description: 'There is direct evidence' },
  { id: 'no', label: 'No', description: 'There is no direct evidence' },
  { id: 'unclear', label: 'Unclear', description: 'The evidence is mixed or uncertain' },
]

interface ReflectionResult {
  type: string
  distortions: string[]
  assumptions_vs_facts: string
  grounded_reframe: string
}

interface ThoughtFlowProps {
  onPointsUpdate?: (points: number) => void
  dailyUsage: number
  maxDailyUsage: number
  isSubscribed: boolean
  guestSessionId?: string
  onUsageUpdate?: () => void
}

type Step = 'input' | 'classify' | 'distortions' | 'evidence' | 'processing' | 'results' | 'limit-reached'

export default function ThoughtFlow({
  onPointsUpdate,
  dailyUsage,
  maxDailyUsage,
  isSubscribed,
  guestSessionId,
  onUsageUpdate
}: ThoughtFlowProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState<Step>('input')
  const [thought, setThought] = useState('')
  const [classification, setClassification] = useState('')
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([])
  const [evidenceChoice, setEvidenceChoice] = useState('')
  const [sessionPoints, setSessionPoints] = useState(0)
  const [result, setResult] = useState<ReflectionResult | null>(null)
  const [error, setError] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  const currentStep = step === 'classify' ? 1 : step === 'distortions' ? 2 : step === 'evidence' ? 3 : 0

  const addPoints = async (points: number) => {
    setIsAnimating(true)
    setSessionPoints(prev => prev + points)

    if (user) {
      // Update points in database
      await supabase.rpc('add_clarity_points', { p_user_id: user.id, p_points: points })
      await refreshProfile()
    }

    onPointsUpdate?.(points)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleThoughtSubmit = () => {
    if (thought.trim().length < 10) {
      setError('Please enter a more detailed thought (at least 10 characters)')
      return
    }
    setError('')
    setStep('classify')
  }

  const handleClassificationSelect = async (id: string) => {
    setClassification(id)
    await addPoints(5)
    setStep('distortions')
  }

  const handleDistortionToggle = (id: string) => {
    setSelectedDistortions(prev => {
      if (prev.includes(id)) {
        return prev.filter(d => d !== id)
      }
      if (prev.length >= 2) {
        return prev
      }
      return [...prev, id]
    })
  }

  const handleDistortionsConfirm = async () => {
    if (selectedDistortions.length === 0) {
      setError('Please select at least one distortion')
      return
    }
    setError('')
    await addPoints(5)
    setStep('evidence')
  }

  const handleEvidenceSelect = async (id: string) => {
    setEvidenceChoice(id)
    await addPoints(10)

    // Check usage limits before processing
    const canProceed = isSubscribed || dailyUsage < maxDailyUsage

    if (!canProceed) {
      setStep('limit-reached')
      return
    }

    setStep('processing')
    await processThought()
  }

  const processThought = async () => {
    try {
      const response = await fetch('/api/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thought,
          classification,
          chosen_distortions: selectedDistortions,
          evidence_choice: evidenceChoice,
          guest_session_id: guestSessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 429) {
          setStep('limit-reached')
          return
        }
        throw new Error(errorData.error || 'Failed to process thought')
      }

      const data = await response.json()
      setResult(data)
      await addPoints(5)
      setStep('results')
      onUsageUpdate?.()

      if (user) {
        await refreshProfile()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('evidence')
    }
  }

  const handleStartOver = () => {
    setStep('input')
    setThought('')
    setClassification('')
    setSelectedDistortions([])
    setEvidenceChoice('')
    setResult(null)
    setError('')
    // Keep sessionPoints - they accumulate
  }

  const renderStepIndicators = () => {
    if (step === 'input' || step === 'limit-reached') return null

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center">
            <div className={`step-indicator ${
              currentStep === num ? 'step-active' :
              currentStep > num ? 'step-completed' : 'step-pending'
            }`}>
              {currentStep > num ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                String.fromCharCode(64 + num)
              )}
            </div>
            {num < 3 && (
              <div className={`w-12 h-0.5 mx-1 ${currentStep > num ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderPointsDisplay = () => {
    if (sessionPoints === 0 && !profile?.clarity_points) return null

    return (
      <div className={`fixed top-20 right-4 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg ${isAnimating ? 'points-pulse' : ''}`}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold">
            {user ? (profile?.clarity_points || 0) : sessionPoints} Clarity Points
          </span>
        </div>
      </div>
    )
  }

  // Input step
  if (step === 'input') {
    return (
      <div className="fade-in">
        {renderPointsDisplay()}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What's on your mind?</h2>
          <p className="text-gray-600">
            Enter a thought that keeps looping. We'll help you examine it.
          </p>
        </div>

        <div className="card-elevated max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="I keep thinking that..."
            className="input-field min-h-[150px] resize-none text-lg"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleThoughtSubmit}
              disabled={thought.trim().length < 10}
              className="btn-primary"
            >
              Examine this thought
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Classification step (Step A)
  if (step === 'classify') {
    return (
      <div className="fade-in">
        {renderPointsDisplay()}
        {renderStepIndicators()}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step A: Classify your thought</h2>
          <p className="text-gray-600">Is this a fact, a thought, or a prediction?</p>
        </div>

        <div className="card-elevated max-w-2xl mx-auto mb-6">
          <p className="text-gray-700 italic text-lg">"{thought}"</p>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto">
          {CLASSIFICATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleClassificationSelect(option.id)}
              className="card hover:border-primary-400 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-lg">{option.label[0]}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{option.label}</h3>
                  <p className="text-gray-600 text-sm">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">+5 Clarity Points for completing this step</p>
      </div>
    )
  }

  // Distortions step (Step B)
  if (step === 'distortions') {
    return (
      <div className="fade-in">
        {renderPointsDisplay()}
        {renderStepIndicators()}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step B: Identify patterns</h2>
          <p className="text-gray-600">Select 1-2 thinking patterns that might apply</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto mb-8">
          {COGNITIVE_DISTORTIONS.map((distortion) => (
            <button
              key={distortion.id}
              onClick={() => handleDistortionToggle(distortion.id)}
              className={`distortion-chip ${
                selectedDistortions.includes(distortion.id)
                  ? 'distortion-chip-selected'
                  : 'distortion-chip-unselected'
              }`}
              title={distortion.description}
            >
              {distortion.label}
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleDistortionsConfirm}
            disabled={selectedDistortions.length === 0}
            className="btn-primary"
          >
            Continue ({selectedDistortions.length}/2 selected)
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">+5 Clarity Points for completing this step</p>
      </div>
    )
  }

  // Evidence step (Step C)
  if (step === 'evidence') {
    return (
      <div className="fade-in">
        {renderPointsDisplay()}
        {renderStepIndicators()}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step C: Check the evidence</h2>
          <p className="text-gray-600">Is there direct evidence that this is objectively true?</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
          {EVIDENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleEvidenceSelect(option.id)}
              className="evidence-option evidence-option-unselected flex-col gap-2"
            >
              <span className="text-lg font-semibold">{option.label}</span>
              <span className="text-xs opacity-75">{option.description}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">+10 Clarity Points for completing this step</p>
      </div>
    )
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="fade-in text-center py-12">
        {renderPointsDisplay()}
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyzing your thought...</h2>
        <p className="text-gray-600">This will just take a moment</p>
      </div>
    )
  }

  // Limit reached step
  if (step === 'limit-reached') {
    return (
      <div className="fade-in text-center py-12">
        {renderPointsDisplay()}
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily limit reached</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          You've used your {maxDailyUsage} free sessions for today.
          {!user && ' Create an account to track your usage or '}
          {user && ' '}
          Subscribe for just $1/month to get unlimited access.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!user && (
            <a href="/signup" className="btn-secondary">
              Create account
            </a>
          )}
          <a href="/subscribe" className="btn-primary">
            Subscribe for $1/month
          </a>
        </div>

        <button
          onClick={handleStartOver}
          className="mt-6 text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Start over (points kept)
        </button>
      </div>
    )
  }

  // Results step
  if (step === 'results' && result) {
    return (
      <div className="fade-in">
        {renderPointsDisplay()}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your reflection</h2>
          <p className="text-gray-600">Here's a clearer perspective on your thought</p>
        </div>

        <div className="card-elevated max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-700">1</span>
              What this is
            </h3>
            <p className="text-gray-700 pl-8">{result.type}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-700">2</span>
              Likely distortions
            </h3>
            <div className="pl-8 flex flex-wrap gap-2">
              {result.distortions.map((distortion, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {distortion}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-700">3</span>
              Assumptions vs facts
            </h3>
            <p className="text-gray-700 pl-8">{result.assumptions_vs_facts}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-700">4</span>
              Grounded reframe
            </h3>
            <p className="text-gray-700 pl-8 font-medium">{result.grounded_reframe}</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Not medical advice. Not for diagnosis or treatment.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button onClick={handleStartOver} className="btn-primary">
            Start over
          </button>
          <p className="text-sm text-gray-500 mt-2">Your Clarity Points will be kept</p>
        </div>
      </div>
    )
  }

  return null
}
