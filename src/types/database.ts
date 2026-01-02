export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          clarity_points: number
          subscription_status: 'free' | 'active' | 'canceled' | 'past_due'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          clarity_points?: number
          subscription_status?: 'free' | 'active' | 'canceled' | 'past_due'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          clarity_points?: number
          subscription_status?: 'free' | 'active' | 'canceled' | 'past_due'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_usage: {
        Row: {
          id: string
          user_id: string
          usage_date: string
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_date: string
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          usage_date?: string
          usage_count?: number
          created_at?: string
        }
      }
      guest_usage: {
        Row: {
          id: string
          session_id: string
          usage_date: string
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          usage_date: string
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          usage_date?: string
          usage_count?: number
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type DailyUsage = Database['public']['Tables']['daily_usage']['Row']
export type GuestUsage = Database['public']['Tables']['guest_usage']['Row']
