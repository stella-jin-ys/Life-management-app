export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; timezone: string; created_at: string; updated_at: string }
        Insert: { id: string; display_name: string; timezone?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; display_name?: string; timezone?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      mood_entries: {
        Row: { id: string; user_id: string; entry_date: string; mood: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; entry_date: string; mood: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; entry_date?: string; mood?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      highlights: {
        Row: { id: string; user_id: string; content: string; compliment: string | null; compliment_status: string; compliment_attempted_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; content: string; compliment?: string | null; compliment_status?: string; compliment_attempted_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; content?: string; compliment?: string | null; compliment_status?: string; compliment_attempted_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      feeling_checkins: {
        Row: { id: string; user_id: string; feeling: string; created_at: string }
        Insert: { id?: string; user_id: string; feeling: string; created_at?: string }
        Update: { id?: string; user_id?: string; feeling?: string; created_at?: string }
        Relationships: []
      }
      health_entries: {
        Row: { id: string; user_id: string; entry_date: string; hydration_glasses: number; nourishing_meals: number; sleep_minutes: number; movement_minutes: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; entry_date: string; hydration_glasses?: number; nourishing_meals?: number; sleep_minutes?: number; movement_minutes?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; entry_date?: string; hydration_glasses?: number; nourishing_meals?: number; sleep_minutes?: number; movement_minutes?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      goals: {
        Row: { id: string; user_id: string; title: string; why: string; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; why?: string; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; why?: string; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      milestones: {
        Row: { id: string; goal_id: string; label: string; position: number; is_complete: boolean; completed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; goal_id: string; label: string; position?: number; is_complete?: boolean; completed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; goal_id?: string; label?: string; position?: number; is_complete?: boolean; completed_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'milestones_goal_id_fkey'; columns: ['goal_id']; isOneToOne: false; referencedRelation: 'goals'; referencedColumns: ['id'] }]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_comfort_signal: { Args: { p_feeling: string }; Returns: { status: string; percentage: number | null; total_count: number | null }[] }
      claim_compliment_generation: { Args: { p_highlight_id: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
