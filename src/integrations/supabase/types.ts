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
          answer: string
          category_id: string | null
          created_at: string
          difficulty_level: string | null
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
          subject: string | null
          subtopic: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          answer: string
          category_id?: string | null
          created_at?: string
          difficulty_level?: string | null
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
          subject?: string | null
          subtopic?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          answer?: string
          category_id?: string | null
          created_at?: string
          difficulty_level?: string | null
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
          device_registered_at: string | null
          id: string
          is_active: boolean
          is_blocked: boolean | null
          is_dev_account: boolean | null
          last_login: string | null
          linked_student_id: string | null
          phone_number: string
          registered_device_id: string | null
          share_token: string | null
          share_token_created_at: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_registered_at?: string | null
          id?: string
          is_active?: boolean
          is_blocked?: boolean | null
          is_dev_account?: boolean | null
          last_login?: string | null
          linked_student_id?: string | null
          phone_number: string
          registered_device_id?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          device_registered_at?: string | null
          id?: string
          is_active?: boolean
          is_blocked?: boolean | null
          is_dev_account?: boolean | null
          last_login?: string | null
          linked_student_id?: string | null
          phone_number?: string
          registered_device_id?: string | null
          share_token?: string | null
          share_token_created_at?: string | null
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
          id: string
          is_review_student: boolean | null
          last_name: string | null
          math_level: string | null
          name: string
          parent_phone: string | null
          phone: string
          review_teacher: string | null
          sat_test_month: string | null
          school_name: string | null
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
          id?: string
          is_review_student?: boolean | null
          last_name?: string | null
          math_level?: string | null
          name: string
          parent_phone?: string | null
          phone: string
          review_teacher?: string | null
          sat_test_month?: string | null
          school_name?: string | null
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
          id?: string
          is_review_student?: boolean | null
          last_name?: string | null
          math_level?: string | null
          name?: string
          parent_phone?: string | null
          phone?: string
          review_teacher?: string | null
          sat_test_month?: string | null
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
      [_ in never]: never
    }
    Functions: {
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
