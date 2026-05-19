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
      ai_variations: {
        Row: {
          answer: string
          generated_at: string
          id: string
          multiple_choice_options: Json | null
          parent_question_id: string
          question_image_url: string | null
          question_text: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          answer: string
          generated_at?: string
          id?: string
          multiple_choice_options?: Json | null
          parent_question_id: string
          question_image_url?: string | null
          question_text: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          answer?: string
          generated_at?: string
          id?: string
          multiple_choice_options?: Json | null
          parent_question_id?: string
          question_image_url?: string | null
          question_text?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_variations_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon_name: string
          id: string
          name: string
          point_value: number
          rarity: string
          requirements: Json
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon_name: string
          id?: string
          name: string
          point_value: number
          rarity: string
          requirements?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          name?: string
          point_value?: number
          rarity?: string
          requirements?: Json
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_name: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          english_schedule: Json | null
          fb_group_link: string | null
          id: string
          math_schedule: Json | null
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
          english_schedule?: Json | null
          fb_group_link?: string | null
          id?: string
          math_schedule?: Json | null
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
          english_schedule?: Json | null
          fb_group_link?: string | null
          id?: string
          math_schedule?: Json | null
          room?: string | null
          schedule?: string
          start_date?: string
          teacher?: string | null
          unique_link_id?: string
        }
        Relationships: []
      }
      bluebook_answers: {
        Row: {
          answer_submitted: string | null
          answered_at: string | null
          attempt_id: string | null
          id: string
          is_correct: boolean | null
          is_marked: boolean | null
          module_id: string | null
          question_id: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          answer_submitted?: string | null
          answered_at?: string | null
          attempt_id?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          module_id?: string | null
          question_id?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          answer_submitted?: string | null
          answered_at?: string | null
          attempt_id?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          module_id?: string | null
          question_id?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bluebook_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "bluebook_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluebook_answers_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "bluebook_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluebook_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bluebook_attempts: {
        Row: {
          completed_at: string | null
          current_module: number | null
          current_module_id: string | null
          id: string
          math_raw_score: number | null
          math_scaled_score: number | null
          module_started_at: string | null
          rw_raw_score: number | null
          rw_scaled_score: number | null
          started_at: string | null
          status: string | null
          student_account_id: string | null
          test_id: string | null
          total_score: number | null
        }
        Insert: {
          completed_at?: string | null
          current_module?: number | null
          current_module_id?: string | null
          id?: string
          math_raw_score?: number | null
          math_scaled_score?: number | null
          module_started_at?: string | null
          rw_raw_score?: number | null
          rw_scaled_score?: number | null
          started_at?: string | null
          status?: string | null
          student_account_id?: string | null
          test_id?: string | null
          total_score?: number | null
        }
        Update: {
          completed_at?: string | null
          current_module?: number | null
          current_module_id?: string | null
          id?: string
          math_raw_score?: number | null
          math_scaled_score?: number | null
          module_started_at?: string | null
          rw_raw_score?: number | null
          rw_scaled_score?: number | null
          started_at?: string | null
          status?: string | null
          student_account_id?: string | null
          test_id?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bluebook_attempts_current_module_id_fkey"
            columns: ["current_module_id"]
            isOneToOne: false
            referencedRelation: "bluebook_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluebook_attempts_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluebook_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "bluebook_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      bluebook_module_questions: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          order_index: number
          question_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          order_index: number
          question_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          order_index?: number
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bluebook_module_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "bluebook_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluebook_module_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bluebook_modules: {
        Row: {
          created_at: string | null
          difficulty: string | null
          id: string
          module_number: number
          section: string
          test_id: string | null
          time_limit_minutes: number
        }
        Insert: {
          created_at?: string | null
          difficulty?: string | null
          id?: string
          module_number: number
          section: string
          test_id?: string | null
          time_limit_minutes: number
        }
        Update: {
          created_at?: string | null
          difficulty?: string | null
          id?: string
          module_number?: number
          section?: string
          test_id?: string | null
          time_limit_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "bluebook_modules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "bluebook_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      bluebook_tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          section_type: string | null
          test_month: number | null
          test_year: number | null
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          section_type?: string | null
          test_month?: number | null
          test_year?: number | null
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          section_type?: string | null
          test_month?: number | null
          test_year?: number | null
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      booking_bans: {
        Row: {
          banned_until: string
          created_at: string
          id: string
          reason: string | null
          student_account_id: string
        }
        Insert: {
          banned_until: string
          created_at?: string
          id?: string
          reason?: string | null
          student_account_id: string
        }
        Update: {
          banned_until?: string
          created_at?: string
          id?: string
          reason?: string | null
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_bans_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          screenshot_url: string | null
          status: string
          student_account_id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          student_account_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          student_account_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cb_import_issues: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          issue_type: string
          page_image_url: string | null
          page_number: number
          raw_data: Json | null
          resolved: boolean | null
          resolved_at: string | null
          session_id: string
          skip_reason: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          issue_type: string
          page_image_url?: string | null
          page_number: number
          raw_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_id: string
          skip_reason?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          issue_type?: string
          page_image_url?: string | null
          page_number?: number
          raw_data?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          session_id?: string
          skip_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cb_import_issues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cb_import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cb_import_sessions: {
        Row: {
          created_at: string
          error_count: number
          filename: string
          id: string
          skipped_count: number
          success_count: number
          total_pages: number
        }
        Insert: {
          created_at?: string
          error_count?: number
          filename: string
          id?: string
          skipped_count?: number
          success_count?: number
          total_pages: number
        }
        Update: {
          created_at?: string
          error_count?: number
          filename?: string
          id?: string
          skipped_count?: number
          success_count?: number
          total_pages?: number
        }
        Relationships: []
      }
      closing_report_settings: {
        Row: {
          body: string
          heading: string
          id: string
          sign_off: string
          updated_at: string
        }
        Insert: {
          body?: string
          heading?: string
          id?: string
          sign_off?: string
          updated_at?: string
        }
        Update: {
          body?: string
          heading?: string
          id?: string
          sign_off?: string
          updated_at?: string
        }
        Relationships: []
      }
      closing_report_tokens: {
        Row: {
          batch_id: string
          created_at: string
          expires_at: string
          id: string
          student_id: string
          token: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          expires_at?: string
          id?: string
          student_id: string
          token?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          student_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_report_tokens_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_report_tokens_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          objectives: string | null
          session_number: number
          teacher_notes: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          objectives?: string | null
          session_number: number
          teacher_notes?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          objectives?: string | null
          session_number?: number
          teacher_notes?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_templates: {
        Row: {
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          course_type: Database["public"]["Enums"]["course_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      desmos_usage_events: {
        Row: {
          closed_at: string | null
          context: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          opened_at: string
          question_id: string | null
          student_account_id: string
        }
        Insert: {
          closed_at?: string | null
          context?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          opened_at?: string
          question_id?: string | null
          student_account_id: string
        }
        Update: {
          closed_at?: string | null
          context?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          opened_at?: string
          question_id?: string | null
          student_account_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      featured_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          slot_position: number
          student_account_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          slot_position: number
          student_account_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          slot_position?: number
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_badges_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      homework_assignments: {
        Row: {
          created_at: string
          description: string | null
          due_session_number: number | null
          id: string
          is_published: boolean
          session_id: string
          submission_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_session_number?: number | null
          id?: string
          is_published?: boolean
          session_id: string
          submission_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_session_number?: number | null
          id?: string
          is_published?: boolean
          session_id?: string
          submission_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "curriculum_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_questions: {
        Row: {
          assignment_id: string
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number
          points: number
          question_text: string
          question_type: string
        }
        Insert: {
          assignment_id: string
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_text: string
          question_type: string
        }
        Update: {
          assignment_id?: string
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      intense_prep_groups: {
        Row: {
          created_at: string
          created_by_teacher_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by_teacher_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by_teacher_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "intense_prep_groups_created_by_teacher_id_fkey"
            columns: ["created_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      intense_prep_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          manual_name: string | null
          manual_phone: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          manual_name?: string | null
          manual_phone?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          manual_name?: string | null
          manual_phone?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intense_prep_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "intense_prep_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intense_prep_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      intense_prep_tracking: {
        Row: {
          id: string
          member_id: string
          practice_test_scores: Json | null
          prep_session_notes: number | null
          problems_68_notes: boolean[] | null
          problems_68_solved: boolean[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          member_id: string
          practice_test_scores?: Json | null
          prep_session_notes?: number | null
          problems_68_notes?: boolean[] | null
          problems_68_solved?: boolean[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          practice_test_scores?: Json | null
          prep_session_notes?: number | null
          problems_68_notes?: boolean[] | null
          problems_68_solved?: boolean[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intense_prep_tracking_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "intense_prep_members"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_answers: {
        Row: {
          answer: string
          id: string
          is_correct: boolean
          participant_id: string
          points_earned: number
          question_id: string
          session_id: string
          submitted_at: string
          time_taken_ms: number
        }
        Insert: {
          answer: string
          id?: string
          is_correct?: boolean
          participant_id: string
          points_earned?: number
          question_id: string
          session_id: string
          submitted_at?: string
          time_taken_ms?: number
        }
        Update: {
          answer?: string
          id?: string
          is_correct?: boolean
          participant_id?: string
          points_earned?: number
          question_id?: string
          session_id?: string
          submitted_at?: string
          time_taken_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_session_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "live_session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_participants: {
        Row: {
          id: string
          joined_at: string
          phone_number: string
          player_name: string
          session_id: string
          total_points: number
        }
        Insert: {
          id?: string
          joined_at?: string
          phone_number: string
          player_name: string
          session_id: string
          total_points?: number
        }
        Update: {
          id?: string
          joined_at?: string
          phone_number?: string
          player_name?: string
          session_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_questions: {
        Row: {
          id: string
          order_index: number
          question_id: string
          session_id: string
        }
        Insert: {
          id?: string
          order_index: number
          question_id: string
          session_id: string
        }
        Update: {
          id?: string
          order_index?: number
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          current_question_index: number
          finished_at: string | null
          id: string
          join_code: string
          question_set: string
          status: string
          teacher_name: string
          time_per_question: number
        }
        Insert: {
          created_at?: string
          current_question_index?: number
          finished_at?: string | null
          id?: string
          join_code: string
          question_set: string
          status?: string
          teacher_name: string
          time_per_question?: number
        }
        Update: {
          created_at?: string
          current_question_index?: number
          finished_at?: string | null
          id?: string
          join_code?: string
          question_set?: string
          status?: string
          teacher_name?: string
          time_per_question?: number
        }
        Relationships: []
      }
      ngee_bookings: {
        Row: {
          attended: boolean
          booked_at: string
          cancelled_at: string | null
          check_in_code: string
          checked_in_at: string | null
          checked_in_by: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
          seat_number: number
          session_id: string
        }
        Insert: {
          attended?: boolean
          booked_at?: string
          cancelled_at?: string | null
          check_in_code: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          first_name: string
          id?: string
          last_name: string
          phone: string
          seat_number: number
          session_id: string
        }
        Update: {
          attended?: boolean
          booked_at?: string
          cancelled_at?: string | null
          check_in_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          seat_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ngee_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ngee_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ngee_courses: {
        Row: {
          booking_closes_hours_before: number
          booking_opens_hour: number
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          room: string | null
          start_date: string
          start_time: string
          total_seats: number
          weekdays: number[]
        }
        Insert: {
          booking_closes_hours_before?: number
          booking_opens_hour?: number
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name: string
          room?: string | null
          start_date?: string
          start_time?: string
          total_seats?: number
          weekdays?: number[]
        }
        Update: {
          booking_closes_hours_before?: number
          booking_opens_hour?: number
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          room?: string | null
          start_date?: string
          start_time?: string
          total_seats?: number
          weekdays?: number[]
        }
        Relationships: []
      }
      ngee_sessions: {
        Row: {
          booking_closes_at: string
          booking_opens_at: string
          course_id: string
          created_at: string
          id: string
          is_cancelled: boolean
          session_date: string
          session_end_date: string
          total_seats: number
        }
        Insert: {
          booking_closes_at: string
          booking_opens_at: string
          course_id: string
          created_at?: string
          id?: string
          is_cancelled?: boolean
          session_date: string
          session_end_date: string
          total_seats?: number
        }
        Update: {
          booking_closes_at?: string
          booking_opens_at?: string
          course_id?: string
          created_at?: string
          id?: string
          is_cancelled?: boolean
          session_date?: string
          session_end_date?: string
          total_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "ngee_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ngee_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          category: string
          created_at: string
          id: string
          metadata: Json | null
          points: number
          sprint_id: string | null
          student_account_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points: number
          sprint_id?: string | null
          student_account_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          sprint_id?: string | null
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
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
      question_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      question_flags: {
        Row: {
          admin_reviewed: boolean
          flag_reason: string | null
          flagged_at: string
          id: string
          question_id: string
          reviewed_at: string | null
          student_account_id: string
        }
        Insert: {
          admin_reviewed?: boolean
          flag_reason?: string | null
          flagged_at?: string
          id?: string
          question_id: string
          reviewed_at?: string | null
          student_account_id: string
        }
        Update: {
          admin_reviewed?: boolean
          flag_reason?: string | null
          flagged_at?: string
          id?: string
          question_id?: string
          reviewed_at?: string | null
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_flags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_flags_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          alternate_answers: string[] | null
          answer: string
          category_id: string | null
          choice_images: Json | null
          created_at: string
          difficulty_level: string | null
          figure_description: string | null
          figure_svg: string | null
          figure_type: string | null
          has_figure: boolean | null
          id: string
          is_active: boolean
          is_original: boolean
          multiple_choice_options: Json | null
          original_cb_id: string | null
          parent_question_id: string | null
          passage_text: string | null
          question_id: string
          question_image_url: string | null
          question_set: string | null
          question_text: string
          question_type: string
          rationale: string | null
          skill: string | null
          subject: string | null
          subtopic: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          alternate_answers?: string[] | null
          answer: string
          category_id?: string | null
          choice_images?: Json | null
          created_at?: string
          difficulty_level?: string | null
          figure_description?: string | null
          figure_svg?: string | null
          figure_type?: string | null
          has_figure?: boolean | null
          id?: string
          is_active?: boolean
          is_original?: boolean
          multiple_choice_options?: Json | null
          original_cb_id?: string | null
          parent_question_id?: string | null
          passage_text?: string | null
          question_id: string
          question_image_url?: string | null
          question_set?: string | null
          question_text: string
          question_type: string
          rationale?: string | null
          skill?: string | null
          subject?: string | null
          subtopic?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          alternate_answers?: string[] | null
          answer?: string
          category_id?: string | null
          choice_images?: Json | null
          created_at?: string
          difficulty_level?: string | null
          figure_description?: string | null
          figure_svg?: string | null
          figure_type?: string | null
          has_figure?: boolean | null
          id?: string
          is_active?: boolean
          is_original?: boolean
          multiple_choice_options?: Json | null
          original_cb_id?: string | null
          parent_question_id?: string | null
          passage_text?: string | null
          question_id?: string
          question_image_url?: string | null
          question_set?: string | null
          question_text?: string
          question_type?: string
          rationale?: string | null
          skill?: string | null
          subject?: string | null
          subtopic?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_codes: {
        Row: {
          code: string
          created_at: string
          created_by_admin_id: string | null
          created_by_teacher_id: string | null
          expires_at: string
          id: string
          is_active: boolean
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by_admin_id?: string | null
          created_by_teacher_id?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by_admin_id?: string | null
          created_by_teacher_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_codes_created_by_teacher_id_fkey"
            columns: ["created_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          batch_id: string | null
          created_at: string
          full_name: string
          id: string
          parent_name: string | null
          phone_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          parent_name?: string | null
          phone_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          parent_name?: string | null
          phone_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      review_session_templates: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          room: string | null
          session_times: Json
          subject: string
          total_seats: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          room?: string | null
          session_times?: Json
          subject?: string
          total_seats?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          room?: string | null
          session_times?: Json
          subject?: string
          total_seats?: number
        }
        Relationships: []
      }
      review_sessions: {
        Row: {
          booking_closes_at: string
          created_at: string
          id: string
          is_active: boolean
          room: string | null
          session_date: string
          session_end_date: string | null
          subject: string
          template_id: string | null
          title: string
          total_seats: number
        }
        Insert: {
          booking_closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          room?: string | null
          session_date: string
          session_end_date?: string | null
          subject?: string
          template_id?: string | null
          title: string
          total_seats?: number
        }
        Update: {
          booking_closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          room?: string | null
          session_date?: string
          session_end_date?: string | null
          subject?: string
          template_id?: string | null
          title?: string
          total_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "review_session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean
          name: string
          schedule_data: Json
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          name: string
          schedule_data?: Json
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          name?: string
          schedule_data?: Json
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasonal_events: {
        Row: {
          badge_id: string
          created_at: string
          description: string | null
          end_date: string
          event_type: string
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          theme_color: string | null
        }
        Insert: {
          badge_id: string
          created_at?: string
          description?: string | null
          end_date: string
          event_type?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          theme_color?: string | null
        }
        Update: {
          badge_id?: string
          created_at?: string
          description?: string | null
          end_date?: string
          event_type?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          theme_color?: string | null
        }
        Relationships: []
      }
      seat_bookings: {
        Row: {
          attended: boolean | null
          booked_at: string
          cancelled_at: string | null
          check_in_code: string | null
          checked_in_at: string | null
          id: string
          review_session_id: string
          seat_number: number
          student_account_id: string
        }
        Insert: {
          attended?: boolean | null
          booked_at?: string
          cancelled_at?: string | null
          check_in_code?: string | null
          checked_in_at?: string | null
          id?: string
          review_session_id: string
          seat_number: number
          student_account_id: string
        }
        Update: {
          attended?: boolean | null
          booked_at?: string
          cancelled_at?: string | null
          check_in_code?: string | null
          checked_in_at?: string | null
          id?: string
          review_session_id?: string
          seat_number?: number
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_bookings_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          metadata: Json | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          student_account_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          student_account_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_topics: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          order_index: number
          resources: Json | null
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          resources?: Json | null
          session_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          resources?: Json | null
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "curriculum_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          batch_id: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          error: string | null
          from_phone: string | null
          id: string
          kind: string
          recipient_role: string
          session_number: number | null
          status: string | null
          student_id: string | null
          to_phone: string
          twilio_sid: string | null
          twilio_status: string
        }
        Insert: {
          batch_id?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          from_phone?: string | null
          id?: string
          kind: string
          recipient_role: string
          session_number?: number | null
          status?: string | null
          student_id?: string | null
          to_phone: string
          twilio_sid?: string | null
          twilio_status?: string
        }
        Update: {
          batch_id?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          from_phone?: string | null
          id?: string
          kind?: string
          recipient_role?: string
          session_number?: number | null
          status?: string | null
          student_id?: string | null
          to_phone?: string
          twilio_sid?: string | null
          twilio_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          season_number: number
          sprint_number: number
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          season_number: number
          sprint_number: number
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          season_number?: number
          sprint_number?: number
          start_date?: string
        }
        Relationships: []
      }
      student_accounts: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          device_fingerprint: string | null
          device_registered_at: string | null
          id: string
          is_active: boolean
          is_blocked: boolean | null
          is_dev_account: boolean | null
          last_login: string | null
          linked_student_id: string | null
          onboarding_completed: boolean | null
          password_hash: string | null
          password_set_at: string | null
          phone_number: string
          registered_device_id: string | null
          share_token: string | null
          share_token_created_at: string | null
          target_score: number | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_registered_at?: string | null
          id?: string
          is_active?: boolean
          is_blocked?: boolean | null
          is_dev_account?: boolean | null
          last_login?: string | null
          linked_student_id?: string | null
          onboarding_completed?: boolean | null
          password_hash?: string | null
          password_set_at?: string | null
          phone_number: string
          registered_device_id?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          target_score?: number | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_registered_at?: string | null
          id?: string
          is_active?: boolean
          is_blocked?: boolean | null
          is_dev_account?: boolean | null
          last_login?: string | null
          linked_student_id?: string | null
          onboarding_completed?: boolean | null
          password_hash?: string | null
          password_set_at?: string | null
          phone_number?: string
          registered_device_id?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
          target_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_accounts_linked_student_id_fkey"
            columns: ["linked_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          session_id: string | null
          student_account_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          student_account_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          student_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activity_logs_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attempts: {
        Row: {
          answer_submitted: string
          attempt_number: number
          attempted_at: string
          id: string
          is_correct: boolean
          question_id: string
          student_account_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          answer_submitted: string
          attempt_number: number
          attempted_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          student_account_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          answer_submitted?: string
          attempt_number?: number
          attempted_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          student_account_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attempts_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          is_unlocked: boolean
          progress: number
          requirements_progress: Json | null
          student_account_id: string
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          requirements_progress?: Json | null
          student_account_id: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          requirements_progress?: Json | null
          student_account_id?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          batch_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_nudges: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          message: string | null
          nudge_type: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          message?: string | null
          nudge_type: string
          student_id: string
          teacher_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          message?: string | null
          nudge_type?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_nudges_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_nudges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_nudges_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          created_at: string
          id: string
          question_id: string
          student_account_id: string
          updated_at: string
          video_watched: boolean
          video_watched_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          student_account_id: string
          updated_at?: string
          video_watched?: boolean
          video_watched_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          student_account_id?: string
          updated_at?: string
          video_watched?: boolean
          video_watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_question_notes: {
        Row: {
          content: string
          created_at: string
          drawing_data: string | null
          id: string
          question_id: string
          student_account_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          drawing_data?: string | null
          id?: string
          question_id: string
          student_account_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          drawing_data?: string | null
          id?: string
          question_id?: string
          student_account_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_review_queue: {
        Row: {
          created_at: string
          ease_factor: number | null
          id: string
          interval_days: number | null
          next_review_at: string
          question_id: string
          review_count: number | null
          student_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          next_review_at?: string
          question_id: string
          review_count?: number | null
          student_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          next_review_at?: string
          question_id?: string
          review_count?: number | null
          student_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_review_queue_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_review_queue_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          device_id: string
          expires_at: string
          id: string
          is_active: boolean
          login_timestamp: string
          student_account_id: string
          user_agent: string | null
        }
        Insert: {
          device_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          login_timestamp?: string
          student_account_id: string
          user_agent?: string | null
        }
        Update: {
          device_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          login_timestamp?: string
          student_account_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sprint_rankings: {
        Row: {
          created_at: string
          current_tier: string
          final_rank: number | null
          group_number: number | null
          id: string
          is_top_1: boolean
          reserved_next_tier: string | null
          sprint_id: string
          student_account_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_tier?: string
          final_rank?: number | null
          group_number?: number | null
          id?: string
          is_top_1?: boolean
          reserved_next_tier?: string | null
          sprint_id: string
          student_account_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_tier?: string
          final_rank?: number | null
          group_number?: number | null
          id?: string
          is_top_1?: boolean
          reserved_next_tier?: string | null
          sprint_id?: string
          student_account_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sprint_rankings_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sprint_rankings_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_100_achieved: boolean
          streak_30_achieved: boolean
          streak_7_achieved: boolean
          streak_start_date: string | null
          student_account_id: string
          total_practice_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_100_achieved?: boolean
          streak_30_achieved?: boolean
          streak_7_achieved?: boolean
          streak_start_date?: string | null
          student_account_id: string
          total_practice_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_100_achieved?: boolean
          streak_30_achieved?: boolean
          streak_7_achieved?: boolean
          streak_start_date?: string | null
          student_account_id?: string
          total_practice_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_streaks_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: true
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_vocabulary_progress: {
        Row: {
          confidence_level: number
          created_at: string
          id: string
          last_reviewed_at: string | null
          learned_at: string
          review_count: number
          student_account_id: string
          updated_at: string
          word_id: string
        }
        Insert: {
          confidence_level?: number
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          learned_at?: string
          review_count?: number
          student_account_id: string
          updated_at?: string
          word_id: string
        }
        Update: {
          confidence_level?: number
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          learned_at?: string
          review_count?: number
          student_account_id?: string
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_vocabulary_progress_student_account_id_fkey"
            columns: ["student_account_id"]
            isOneToOne: false
            referencedRelation: "student_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_vocabulary_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          accessed: boolean
          accessed_at: string | null
          batch_id: string | null
          created_at: string
          english_level: string | null
          first_name: string
          first_session_completed: boolean | null
          grade: string | null
          has_taken_sat: boolean | null
          id: string
          is_review_student: boolean | null
          last_name: string | null
          math_level: string | null
          name: string
          parent_phone: string | null
          phone: string
          previous_sat_score: number | null
          review_teacher: string | null
          sat_test_month: string | null
          school_name: string | null
          switched_acknowledged: boolean
          unique_link_id: string
        }
        Insert: {
          accessed?: boolean
          accessed_at?: string | null
          batch_id?: string | null
          created_at?: string
          english_level?: string | null
          first_name?: string
          first_session_completed?: boolean | null
          grade?: string | null
          has_taken_sat?: boolean | null
          id?: string
          is_review_student?: boolean | null
          last_name?: string | null
          math_level?: string | null
          name: string
          parent_phone?: string | null
          phone: string
          previous_sat_score?: number | null
          review_teacher?: string | null
          sat_test_month?: string | null
          school_name?: string | null
          switched_acknowledged?: boolean
          unique_link_id: string
        }
        Update: {
          accessed?: boolean
          accessed_at?: string | null
          batch_id?: string | null
          created_at?: string
          english_level?: string | null
          first_name?: string
          first_session_completed?: boolean | null
          grade?: string | null
          has_taken_sat?: boolean | null
          id?: string
          is_review_student?: boolean | null
          last_name?: string | null
          math_level?: string | null
          name?: string
          parent_phone?: string | null
          phone?: string
          previous_sat_score?: number | null
          review_teacher?: string | null
          sat_test_month?: string | null
          school_name?: string | null
          switched_acknowledged?: boolean
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
      vocabulary_words: {
        Row: {
          created_at: string
          english: string
          id: string
          is_active: boolean
          mongolian: string
          subject: string
          word_number: number
        }
        Insert: {
          created_at?: string
          english: string
          id?: string
          is_active?: boolean
          mongolian: string
          subject?: string
          word_number: number
        }
        Update: {
          created_at?: string
          english?: string
          id?: string
          is_active?: boolean
          mongolian?: string
          subject?: string
          word_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      ngee_session_taken_seats: {
        Row: {
          seat_number: number | null
          session_id: string | null
        }
        Insert: {
          seat_number?: number | null
          session_id?: string | null
        }
        Update: {
          seat_number?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ngee_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ngee_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _post_edge_function: {
        Args: { fn_name: string; payload: Json }
        Returns: undefined
      }
      generate_ngee_sessions: {
        Args: { p_course_id: string; p_weeks_ahead?: number }
        Returns: number
      }
      generate_share_token: { Args: never; Returns: string }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_batch_completion_status: {
        Args: { teacher_name?: string }
        Returns: {
          batch_id: string
          is_completed: boolean
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
      hash_student_password: { Args: { password: string }; Returns: string }
      ngee_cancel_booking: {
        Args: { p_phone: string; p_session_id: string }
        Returns: boolean
      }
      ngee_check_in_by_code: {
        Args: { p_code: string; p_session_id: string }
        Returns: {
          already_checked: boolean
          checked_in_at: string
          first_name: string
          id: string
          last_name: string
          seat_number: number
        }[]
      }
      ngee_lookup_booking: {
        Args: { p_phone: string; p_session_id: string }
        Returns: {
          attended: boolean
          cancelled_at: string
          check_in_code: string
          first_name: string
          id: string
          last_name: string
          seat_number: number
        }[]
      }
      ngee_undo_check_in: { Args: { p_booking_id: string }; Returns: boolean }
      student_owns_record: {
        Args: { phone: string; student_id: string }
        Returns: boolean
      }
      verify_student_password: {
        Args: { input_password: string; stored_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "teacher" | "student"
      attendance_status: "present" | "absent" | "sick" | "late" | "excused"
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
      app_role: ["admin", "user", "teacher", "student"],
      attendance_status: ["present", "absent", "sick", "late", "excused"],
      course_type: ["SAT", "IELTS"],
      room_number: ["1105", "905"],
      teacher_name: ["Saran-Ochir", "Altan-Erdene", "Manlai"],
    },
  },
} as const
