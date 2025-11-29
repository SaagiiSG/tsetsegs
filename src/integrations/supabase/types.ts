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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          batch_id: string
          created_at: string | null
          id: string
          session_1: Database["public"]["Enums"]["attendance_status"] | null
          session_10: Database["public"]["Enums"]["attendance_status"] | null
          session_11: Database["public"]["Enums"]["attendance_status"] | null
          session_12: Database["public"]["Enums"]["attendance_status"] | null
          session_13: Database["public"]["Enums"]["attendance_status"] | null
          session_14: Database["public"]["Enums"]["attendance_status"] | null
          session_15: Database["public"]["Enums"]["attendance_status"] | null
          session_16: Database["public"]["Enums"]["attendance_status"] | null
          session_17: Database["public"]["Enums"]["attendance_status"] | null
          session_18: Database["public"]["Enums"]["attendance_status"] | null
          session_19: Database["public"]["Enums"]["attendance_status"] | null
          session_2: Database["public"]["Enums"]["attendance_status"] | null
          session_20: Database["public"]["Enums"]["attendance_status"] | null
          session_21: Database["public"]["Enums"]["attendance_status"] | null
          session_22: Database["public"]["Enums"]["attendance_status"] | null
          session_23: Database["public"]["Enums"]["attendance_status"] | null
          session_24: Database["public"]["Enums"]["attendance_status"] | null
          session_3: Database["public"]["Enums"]["attendance_status"] | null
          session_4: Database["public"]["Enums"]["attendance_status"] | null
          session_5: Database["public"]["Enums"]["attendance_status"] | null
          session_6: Database["public"]["Enums"]["attendance_status"] | null
          session_7: Database["public"]["Enums"]["attendance_status"] | null
          session_8: Database["public"]["Enums"]["attendance_status"] | null
          session_9: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
          total_attended: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          id?: string
          session_1?: Database["public"]["Enums"]["attendance_status"] | null
          session_10?: Database["public"]["Enums"]["attendance_status"] | null
          session_11?: Database["public"]["Enums"]["attendance_status"] | null
          session_12?: Database["public"]["Enums"]["attendance_status"] | null
          session_13?: Database["public"]["Enums"]["attendance_status"] | null
          session_14?: Database["public"]["Enums"]["attendance_status"] | null
          session_15?: Database["public"]["Enums"]["attendance_status"] | null
          session_16?: Database["public"]["Enums"]["attendance_status"] | null
          session_17?: Database["public"]["Enums"]["attendance_status"] | null
          session_18?: Database["public"]["Enums"]["attendance_status"] | null
          session_19?: Database["public"]["Enums"]["attendance_status"] | null
          session_2?: Database["public"]["Enums"]["attendance_status"] | null
          session_20?: Database["public"]["Enums"]["attendance_status"] | null
          session_21?: Database["public"]["Enums"]["attendance_status"] | null
          session_22?: Database["public"]["Enums"]["attendance_status"] | null
          session_23?: Database["public"]["Enums"]["attendance_status"] | null
          session_24?: Database["public"]["Enums"]["attendance_status"] | null
          session_3?: Database["public"]["Enums"]["attendance_status"] | null
          session_4?: Database["public"]["Enums"]["attendance_status"] | null
          session_5?: Database["public"]["Enums"]["attendance_status"] | null
          session_6?: Database["public"]["Enums"]["attendance_status"] | null
          session_7?: Database["public"]["Enums"]["attendance_status"] | null
          session_8?: Database["public"]["Enums"]["attendance_status"] | null
          session_9?: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
          total_attended?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          id?: string
          session_1?: Database["public"]["Enums"]["attendance_status"] | null
          session_10?: Database["public"]["Enums"]["attendance_status"] | null
          session_11?: Database["public"]["Enums"]["attendance_status"] | null
          session_12?: Database["public"]["Enums"]["attendance_status"] | null
          session_13?: Database["public"]["Enums"]["attendance_status"] | null
          session_14?: Database["public"]["Enums"]["attendance_status"] | null
          session_15?: Database["public"]["Enums"]["attendance_status"] | null
          session_16?: Database["public"]["Enums"]["attendance_status"] | null
          session_17?: Database["public"]["Enums"]["attendance_status"] | null
          session_18?: Database["public"]["Enums"]["attendance_status"] | null
          session_19?: Database["public"]["Enums"]["attendance_status"] | null
          session_2?: Database["public"]["Enums"]["attendance_status"] | null
          session_20?: Database["public"]["Enums"]["attendance_status"] | null
          session_21?: Database["public"]["Enums"]["attendance_status"] | null
          session_22?: Database["public"]["Enums"]["attendance_status"] | null
          session_23?: Database["public"]["Enums"]["attendance_status"] | null
          session_24?: Database["public"]["Enums"]["attendance_status"] | null
          session_3?: Database["public"]["Enums"]["attendance_status"] | null
          session_4?: Database["public"]["Enums"]["attendance_status"] | null
          session_5?: Database["public"]["Enums"]["attendance_status"] | null
          session_6?: Database["public"]["Enums"]["attendance_status"] | null
          session_7?: Database["public"]["Enums"]["attendance_status"] | null
          session_8?: Database["public"]["Enums"]["attendance_status"] | null
          session_9?: Database["public"]["Enums"]["attendance_status"] | null
          student_id?: string
          total_attended?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_name: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          fb_group_link: string | null
          id: string
          room: string | null
          schedule: string
          start_date: string
          teacher: string | null
          unique_link_id: string
        }
        Insert: {
          batch_name?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          fb_group_link?: string | null
          id?: string
          room?: string | null
          schedule: string
          start_date: string
          teacher?: string | null
          unique_link_id?: string
        }
        Update: {
          batch_name?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          fb_group_link?: string | null
          id?: string
          room?: string | null
          schedule?: string
          start_date?: string
          teacher?: string | null
          unique_link_id?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          batch_id: string
          completed: boolean
          created_at: string
          id: string
          session_number: number
          student_id: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          completed?: boolean
          created_at?: string
          id?: string
          session_number: number
          student_id: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          session_number?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_tests: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          listening: number | null
          reading: number | null
          score: number | null
          speaking: number | null
          student_id: string
          test_number: number
          updated_at: string
          writing: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          listening?: number | null
          reading?: number | null
          score?: number | null
          speaking?: number | null
          student_id: string
          test_number: number
          updated_at?: string
          writing?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          listening?: number | null
          reading?: number | null
          score?: number | null
          speaking?: number | null
          student_id?: string
          test_number?: number
          updated_at?: string
          writing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_tests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          accessed: boolean
          accessed_at: string | null
          batch_id: string
          created_at: string
          english_level: string | null
          first_name: string
          first_session_completed: boolean | null
          grade: string | null
          id: string
          last_name: string | null
          math_level: string | null
          name: string
          parent_phone: string | null
          phone: string
          school_name: string | null
          unique_link_id: string
        }
        Insert: {
          accessed?: boolean
          accessed_at?: string | null
          batch_id: string
          created_at?: string
          english_level?: string | null
          first_name?: string
          first_session_completed?: boolean | null
          grade?: string | null
          id?: string
          last_name?: string | null
          math_level?: string | null
          name: string
          parent_phone?: string | null
          phone: string
          school_name?: string | null
          unique_link_id: string
        }
        Update: {
          accessed?: boolean
          accessed_at?: string | null
          batch_id?: string
          created_at?: string
          english_level?: string | null
          first_name?: string
          first_session_completed?: boolean | null
          grade?: string | null
          id?: string
          last_name?: string | null
          math_level?: string | null
          name?: string
          parent_phone?: string | null
          phone?: string
          school_name?: string | null
          unique_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          id: string
          last_login: string | null
          name: string
          password_hash: string | null
          phone: string
          temporary_password: boolean | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          name: string
          password_hash?: string | null
          phone: string
          temporary_password?: boolean | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          name?: string
          password_hash?: string | null
          phone?: string
          temporary_password?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_batch_student_counts: {
        Args: { teacher_name?: string }
        Returns: {
          batch_id: string
          student_count: number
        }[]
      }
      get_current_teacher_username: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "teacher"
      attendance_status: "present" | "absent" | "sick" | "late"
      course_type: "SAT" | "IELTS"
      room_number: "1105" | "905"
      teacher_name: "Saran-Ochir" | "Altan-Erdene" | "Manlai"
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
      app_role: ["admin", "user", "teacher"],
      attendance_status: ["present", "absent", "sick", "late"],
      course_type: ["SAT", "IELTS"],
      room_number: ["1105", "905"],
      teacher_name: ["Saran-Ochir", "Altan-Erdene", "Manlai"],
    },
  },
} as const
