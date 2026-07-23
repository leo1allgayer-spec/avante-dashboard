export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_settings: {
        Row: {
          created_at: string
          id: string
          min_advance_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_advance_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_advance_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          balance_note: string | null
          commission_value: number
          company: string | null
          contract_value: number
          created_at: string | null
          id: string
          instagram: string | null
          last_account_update: string | null
          last_balance_date: string | null
          last_report_date: string | null
          manager: string
          monthly_budget: number
          name: string
          next_charge_date: string | null
          notes: Json | null
          payment_date: number
          payment_status: string
          report_day: string | null
          start_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          balance_note?: string | null
          commission_value?: number
          company?: string | null
          contract_value?: number
          created_at?: string | null
          id?: string
          instagram?: string | null
          last_account_update?: string | null
          last_balance_date?: string | null
          last_report_date?: string | null
          manager: string
          monthly_budget?: number
          name: string
          next_charge_date?: string | null
          notes?: Json | null
          payment_date?: number
          payment_status?: string
          report_day?: string | null
          start_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          balance_note?: string | null
          commission_value?: number
          company?: string | null
          contract_value?: number
          created_at?: string | null
          id?: string
          instagram?: string | null
          last_account_update?: string | null
          last_balance_date?: string | null
          last_report_date?: string | null
          manager?: string
          monthly_budget?: number
          name?: string
          next_charge_date?: string | null
          notes?: Json | null
          payment_date?: number
          payment_status?: string
          report_day?: string | null
          start_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      course_blocked_dates: {
        Row: {
          course_name: string | null
          created_at: string | null
          date: string
          id: string
          shift: string | null
        }
        Insert: {
          course_name?: string | null
          created_at?: string | null
          date: string
          id?: string
          shift?: string | null
        }
        Update: {
          course_name?: string | null
          created_at?: string | null
          date?: string
          id?: string
          shift?: string | null
        }
        Relationships: []
      }
      course_bookings: {
        Row: {
          certificate_name: string | null
          course_name: string
          course_status: string
          created_at: string | null
          date: string
          email: string
          id: string
          instagram: string | null
          phone: string
          slot_id: string
          status: string
          student_name: string
          time: string
        }
        Insert: {
          certificate_name?: string | null
          course_name: string
          course_status?: string
          created_at?: string | null
          date: string
          email: string
          id?: string
          instagram?: string | null
          phone: string
          slot_id: string
          status?: string
          student_name: string
          time: string
        }
        Update: {
          certificate_name?: string | null
          course_name?: string
          course_status?: string
          created_at?: string | null
          date?: string
          email?: string
          id?: string
          instagram?: string | null
          phone?: string
          slot_id?: string
          status?: string
          student_name?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "course_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      course_disabled_days: {
        Row: {
          course_name: string
          created_at: string | null
          day_of_week: number
          id: string
          shift: string | null
        }
        Insert: {
          course_name: string
          created_at?: string | null
          day_of_week: number
          id?: string
          shift?: string | null
        }
        Update: {
          course_name?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          shift?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          contact: string | null
          course_type: string
          created_at: string | null
          date: string | null
          email: string | null
          id: string
          instagram: string | null
          student_name: string
          time: string | null
          user_id: string
        }
        Insert: {
          contact?: string | null
          course_type: string
          created_at?: string | null
          date?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          student_name: string
          time?: string | null
          user_id: string
        }
        Update: {
          contact?: string | null
          course_type?: string
          created_at?: string | null
          date?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          student_name?: string
          time?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_slots: {
        Row: {
          course_name: string
          created_at: string | null
          date: string
          id: string
          max_students: number
          time: string
        }
        Insert: {
          course_name: string
          created_at?: string | null
          date: string
          id?: string
          max_students?: number
          time: string
        }
        Update: {
          course_name?: string
          created_at?: string | null
          date?: string
          id?: string
          max_students?: number
          time?: string
        }
        Relationships: []
      }
      meeting_reminder_logs: {
        Row: {
          id: string
          meeting_id: string
          participant_name: string
          phone: string
          sent_at: string
          status: string
        }
        Insert: {
          id?: string
          meeting_id: string
          participant_name: string
          phone: string
          sent_at?: string
          status?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          participant_name?: string
          phone?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          has_closing: boolean
          id: string
          modality: string
          origin: string
          outcome: string | null
          participants: string[] | null
          status: string
          time: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          has_closing?: boolean
          id?: string
          modality?: string
          origin?: string
          outcome?: string | null
          participants?: string[] | null
          status?: string
          time?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          has_closing?: boolean
          id?: string
          modality?: string
          origin?: string
          outcome?: string | null
          participants?: string[] | null
          status?: string
          time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_ads_exceptions: {
        Row: {
          created_at: string
          date: string
          id: string
          shift: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          shift?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          shift?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_daily: boolean | null
          priority: string
          started_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_daily?: boolean | null
          priority?: string
          started_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_daily?: boolean | null
          priority?: string
          started_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          daily_task_goal: number | null
          id: string
          max_task_minutes: number | null
          name: string
          user_id: string
          weekly_task_goal: number | null
        }
        Insert: {
          created_at?: string | null
          daily_task_goal?: number | null
          id?: string
          max_task_minutes?: number | null
          name: string
          user_id: string
          weekly_task_goal?: number | null
        }
        Update: {
          created_at?: string | null
          daily_task_goal?: number | null
          id?: string
          max_task_minutes?: number | null
          name?: string
          user_id?: string
          weekly_task_goal?: number | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access_bookings: boolean
          can_access_clients: boolean
          can_access_tasks: boolean
          created_at: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          can_access_bookings?: boolean
          can_access_clients?: boolean
          can_access_tasks?: boolean
          created_at?: string | null
          email?: string
          id?: string
          user_id: string
        }
        Update: {
          can_access_bookings?: boolean
          can_access_clients?: boolean
          can_access_tasks?: boolean
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          booking_id: string | null
          course_name: string
          created_at: string
          error_message: string | null
          id: string
          message_text: string
          message_type: string
          phone: string
          sent_at: string | null
          status: string
          student_name: string
        }
        Insert: {
          booking_id?: string | null
          course_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_text: string
          message_type: string
          phone: string
          sent_at?: string | null
          status?: string
          student_name: string
        }
        Update: {
          booking_id?: string | null
          course_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_text?: string
          message_type?: string
          phone?: string
          sent_at?: string | null
          status?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "course_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_message_timing: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          message_type: string
          offset_unit: string
          offset_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string
          id?: string
          message_type: string
          offset_unit?: string
          offset_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          message_type?: string
          offset_unit?: string
          offset_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_scheduled_messages: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message_type: string
          recipient_phone: string | null
          scheduled_for: string
          status: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message_type: string
          recipient_phone?: string | null
          scheduled_for: string
          status?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message_type?: string
          recipient_phone?: string | null
          scheduled_for?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "course_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_course_booking: {
        Args: { p_booking_id: string }
        Returns: {
          course_date: string | null
          course_name: string | null
          course_status: string | null
          course_time: string | null
          message: string
          student_name: string | null
          success: boolean
        }[]
      }
      get_booking_counts: {
        Args: { p_course_name: string }
        Returns: {
          booking_count: number
          booking_date: string
          booking_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
