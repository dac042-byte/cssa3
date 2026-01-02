import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface ReflectRequest {
  thought: string
  classification: string
  chosen_distortions: string[]
  evidence_choice: string
  guest_session_id?: string
}

interface AIResponse {
  type: string
  distortions: string[]
  assumptions_vs_facts: string
  grounded_reframe: string
}

const DISTORTION_LABELS: Record<string, string> = {
  'catastrophizing': 'Catastrophizing',
  'mind-reading': 'Mind reading',
  'all-or-nothing': 'All-or-nothing thinking',
  'emotional-reasoning': 'Emotional reasoning',
  'should-statements': 'Should statements',
  'fortune-telling': 'Fortune telling',
  'personalization': 'Personalization',
  'overgeneralization': 'Overgeneralization',
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  'fact': 'Fact',
  'thought': 'Thought',
  'prediction': 'Prediction',
}

export async function POST(request: NextRequest) {
  try {
    const body: ReflectRequest = await request.json()
    const { thought, classification, chosen_distortions, evidence_choice, guest_session_id } = body

    // Validate input
    if (!thought || !classification || !chosen_distortions?.length || !evidence_choice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client for auth check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    let isSubscribed = false

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    // Use service role client for database operations
    const adminClient = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    if (userId) {
      // Check user's subscription status
      const { data: profile } = await adminClient
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single()

      isSubscribed = profile?.subscription_status === 'active'

      // Check daily usage for authenticated user
      if (!isSubscribed) {
        const { data: usage } = await adminClient
          .from('daily_usage')
          .select('usage_count')
          .eq('user_id', userId)
          .eq('usage_date', today)
          .single()

        const currentUsage = usage?.usage_count || 0
        if (currentUsage >= 5) {
          return NextResponse.json(
            { error: 'Daily usage limit reached. Subscribe for unlimited access.' },
            { status: 429 }
          )
        }
      }
    } else if (guest_session_id) {
      // Check guest usage (limit to 1 for guests)
      const { data: usage } = await adminClient
        .from('guest_usage')
        .select('usage_count')
        .eq('session_id', guest_session_id)
        .eq('usage_date', today)
        .single()

      const currentUsage = usage?.usage_count || 0
      if (currentUsage >= 1) {
        return NextResponse.json(
          { error: 'Create an account to continue using Clearhold.' },
          { status: 429 }
        )
      }
    }

    // Prepare the prompt
    const distortionLabels = chosen_distortions.map(d => DISTORTION_LABELS[d] || d).join(', ')
    const classificationLabel = CLASSIFICATION_LABELS[classification] || classification

    const systemPrompt = `You are a CBT-informed thought analysis assistant. You provide structured, neutral analysis of thoughts using cognitive behavioral therapy principles. You never provide diagnoses. You respond only with valid JSON.`

    const userPrompt = `Analyze the following thought and provide a structured response.

User's thought: "${thought}"

User's self-assessment:
- They classified this as: ${classificationLabel}
- They identified these potential patterns: ${distortionLabels}
- When asked if there's direct evidence this is objectively true: ${evidence_choice}

Instructions:
1. Use neutral, supportive CBT language
2. Be concise and clear
3. Do not provide any diagnosis
4. If the user's self-assessment seems inaccurate, gently correct it
5. Provide an objective, grounded perspective
6. The reframe should be realistic and helpful, not dismissive of valid concerns

Respond ONLY with valid JSON in exactly this format (no markdown, no code blocks):
{
  "type": "A brief label for what kind of thought this is (e.g., 'Worry about future events', 'Self-critical thought', 'Assumption about others')",
  "distortions": ["List", "of", "likely", "cognitive", "distortions"],
  "assumptions_vs_facts": "A concise statement contrasting what is assumed versus what is actually observable or known",
  "grounded_reframe": "One neutral, accurate reframe of the thought that acknowledges valid concerns while offering perspective"
}`

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    })

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text())
      return NextResponse.json(
        { error: 'Failed to analyze thought' },
        { status: 500 }
      )
    }

    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices?.[0]?.message?.content

    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedResponse: AIResponse
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsedResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate response structure
    if (!parsedResponse.type || !parsedResponse.distortions ||
        !parsedResponse.assumptions_vs_facts || !parsedResponse.grounded_reframe) {
      return NextResponse.json(
        { error: 'Invalid AI response structure' },
        { status: 500 }
      )
    }

    // Increment usage after successful response
    if (userId) {
      await adminClient
        .from('daily_usage')
        .upsert({
          user_id: userId,
          usage_date: today,
          usage_count: 1
        }, {
          onConflict: 'user_id,usage_date'
        })

      // If record exists, increment it
      await adminClient.rpc('increment_daily_usage', { p_user_id: userId })
    } else if (guest_session_id) {
      // Increment guest usage
      await adminClient
        .from('guest_usage')
        .upsert({
          session_id: guest_session_id,
          usage_date: today,
          usage_count: 1
        }, {
          onConflict: 'session_id,usage_date'
        })
    }

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Reflect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
