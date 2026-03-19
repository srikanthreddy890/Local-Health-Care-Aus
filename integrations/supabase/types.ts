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
      aphra_submission_requests: {
        Row: {
          clinic_id: string
          created_at: string | null
          doctor_id: string
          id: string
          registration_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
          registration_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          registration_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aphra_submission_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aphra_submission_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aphra_submission_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aphra_submission_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      aphra_verification_logs: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          registration_number: string
          verification_response: Json | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          registration_number: string
          verification_response?: Json | null
          verification_status: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          registration_number?: string
          verification_response?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aphra_verification_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aphra_verification_logs_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configurations: {
        Row: {
          api_key_encrypted: string | null
          api_version: string | null
          auth_method: string
          auto_sync_enabled: boolean | null
          booking_response_config: Json | null
          clinic_id: string
          config_name: string
          conflict_resolution_strategy: string | null
          created_at: string | null
          created_by: string | null
          custom_auth_headers: Json | null
          custom_settings: Json | null
          endpoint_config: Json | null
          environment: string
          field_mappings: Json | null
          id: string
          integration_type: string
          is_active: boolean | null
          is_primary: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          last_tested_at: string | null
          next_scheduled_sync: string | null
          oauth_client_id: string | null
          oauth_client_secret_encrypted: string | null
          practice_id: string
          rate_limit_requests: number | null
          rate_limit_window_seconds: number | null
          region: string | null
          response_format: string | null
          retry_attempts: number | null
          retry_delay_ms: number | null
          sync_schedule: string | null
          test_status: string | null
          timeout_ms: number | null
          updated_at: string | null
          webhook_events: Json | null
          webhook_secret_encrypted: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_version?: string | null
          auth_method?: string
          auto_sync_enabled?: boolean | null
          booking_response_config?: Json | null
          clinic_id: string
          config_name: string
          conflict_resolution_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_auth_headers?: Json | null
          custom_settings?: Json | null
          endpoint_config?: Json | null
          environment?: string
          field_mappings?: Json | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_tested_at?: string | null
          next_scheduled_sync?: string | null
          oauth_client_id?: string | null
          oauth_client_secret_encrypted?: string | null
          practice_id: string
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          region?: string | null
          response_format?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          sync_schedule?: string | null
          test_status?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_events?: Json | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_version?: string | null
          auth_method?: string
          auto_sync_enabled?: boolean | null
          booking_response_config?: Json | null
          clinic_id?: string
          config_name?: string
          conflict_resolution_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_auth_headers?: Json | null
          custom_settings?: Json | null
          endpoint_config?: Json | null
          environment?: string
          field_mappings?: Json | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_tested_at?: string | null
          next_scheduled_sync?: string | null
          oauth_client_id?: string | null
          oauth_client_secret_encrypted?: string | null
          practice_id?: string
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          region?: string | null
          response_format?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          sync_schedule?: string | null
          test_status?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_events?: Json | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      api_wizard_drafts: {
        Row: {
          clinic_id: string
          created_at: string | null
          current_step: number
          id: string
          integration_type: string
          sequential_state: Json | null
          updated_at: string | null
          wizard_data: Json
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          current_step?: number
          id?: string
          integration_type: string
          sequential_state?: Json | null
          updated_at?: string | null
          wizard_data?: Json
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          current_step?: number
          id?: string
          integration_type?: string
          sequential_state?: Json | null
          updated_at?: string | null
          wizard_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "api_wizard_drafts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_wizard_drafts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      apify_clinics: {
        Row: {
          accepts_credit_cards: boolean | null
          additional_info: Json | null
          address: string | null
          amenities: Json | null
          appointments_recommended: boolean | null
          categories: Json | null
          city: string | null
          claimed_by: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          google_maps_url: string | null
          google_place_id: string
          id: string
          image_url: string | null
          images_count: number | null
          is_claimed: boolean | null
          last_synced_at: string | null
          location: Json | null
          name: string
          opening_hours_detailed: Json | null
          operating_hours: Json | null
          parking_available: boolean | null
          permanently_closed: boolean | null
          phone: string | null
          rating: number | null
          registered_clinic_id: string | null
          reviews_count: number | null
          specializations: Json | null
          state: string | null
          temporarily_closed: boolean | null
          updated_at: string | null
          website: string | null
          wheelchair_accessible: boolean | null
          zip_code: string | null
        }
        Insert: {
          accepts_credit_cards?: boolean | null
          additional_info?: Json | null
          address?: string | null
          amenities?: Json | null
          appointments_recommended?: boolean | null
          categories?: Json | null
          city?: string | null
          claimed_by?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          google_place_id: string
          id?: string
          image_url?: string | null
          images_count?: number | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          location?: Json | null
          name: string
          opening_hours_detailed?: Json | null
          operating_hours?: Json | null
          parking_available?: boolean | null
          permanently_closed?: boolean | null
          phone?: string | null
          rating?: number | null
          registered_clinic_id?: string | null
          reviews_count?: number | null
          specializations?: Json | null
          state?: string | null
          temporarily_closed?: boolean | null
          updated_at?: string | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Update: {
          accepts_credit_cards?: boolean | null
          additional_info?: Json | null
          address?: string | null
          amenities?: Json | null
          appointments_recommended?: boolean | null
          categories?: Json | null
          city?: string | null
          claimed_by?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          google_place_id?: string
          id?: string
          image_url?: string | null
          images_count?: number | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          location?: Json | null
          name?: string
          opening_hours_detailed?: Json | null
          operating_hours?: Json | null
          parking_available?: boolean | null
          permanently_closed?: boolean | null
          phone?: string | null
          rating?: number | null
          registered_clinic_id?: string | null
          reviews_count?: number | null
          specializations?: Json | null
          state?: string | null
          temporarily_closed?: boolean | null
          updated_at?: string | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apify_clinics_registered_clinic_id_fkey"
            columns: ["registered_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apify_clinics_registered_clinic_id_fkey"
            columns: ["registered_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      apify_import_jobs: {
        Row: {
          apify_run_id: string
          clinics_imported: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          apify_run_id: string
          clinics_imported?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          apify_run_id?: string
          clinics_imported?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appointment_generation_log: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          doctor_id: string
          end_date: string
          generation_date: string
          id: string
          slots_created: number
          start_date: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          end_date: string
          generation_date: string
          id?: string
          slots_created: number
          start_date: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          end_date?: string
          generation_date?: string
          id?: string
          slots_created?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_generation_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_generation_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_generation_log_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_generation_log_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_preferences: {
        Row: {
          centaur_doctor_id: number | null
          check_centaur_appointments: boolean | null
          check_custom_api_appointments: boolean | null
          check_database_appointments: boolean | null
          clinic_id: string | null
          consecutive_errors: number | null
          created_at: string | null
          custom_api_config_id: string | null
          custom_api_doctor_id: string | null
          daily_notification_limit: number | null
          doctor_id: string | null
          id: string
          is_active: boolean | null
          last_check_error: string | null
          last_check_error_at: string | null
          last_checked_at: string | null
          last_notification_at: string | null
          last_notification_date: string | null
          notes: string | null
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          notifications_sent_count: number | null
          notifications_sent_today: number | null
          patient_id: string
          preferred_date: string
          preferred_time: string
          status: Database["public"]["Enums"]["appointment_preference_status"]
          total_notification_limit: number | null
          updated_at: string | null
        }
        Insert: {
          centaur_doctor_id?: number | null
          check_centaur_appointments?: boolean | null
          check_custom_api_appointments?: boolean | null
          check_database_appointments?: boolean | null
          clinic_id?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          custom_api_config_id?: string | null
          custom_api_doctor_id?: string | null
          daily_notification_limit?: number | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          last_check_error?: string | null
          last_check_error_at?: string | null
          last_checked_at?: string | null
          last_notification_at?: string | null
          last_notification_date?: string | null
          notes?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          notifications_sent_count?: number | null
          notifications_sent_today?: number | null
          patient_id: string
          preferred_date: string
          preferred_time: string
          status?: Database["public"]["Enums"]["appointment_preference_status"]
          total_notification_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          centaur_doctor_id?: number | null
          check_centaur_appointments?: boolean | null
          check_custom_api_appointments?: boolean | null
          check_database_appointments?: boolean | null
          clinic_id?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          custom_api_config_id?: string | null
          custom_api_doctor_id?: string | null
          daily_notification_limit?: number | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          last_check_error?: string | null
          last_check_error_at?: string | null
          last_checked_at?: string | null
          last_notification_at?: string | null
          last_notification_date?: string | null
          notes?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          notifications_sent_count?: number | null
          notifications_sent_today?: number | null
          patient_id?: string
          preferred_date?: string
          preferred_time?: string
          status?: Database["public"]["Enums"]["appointment_preference_status"]
          total_notification_limit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_preferences_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_preferences_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_date: string
          appointment_time: string
          booking_id: string
          booking_type: string
          clinic_address: string | null
          clinic_id: string | null
          clinic_name: string | null
          clinic_phone: string | null
          clinic_timezone: string | null
          created_at: string | null
          doctor_name: string | null
          id: string
          patient_email: string | null
          patient_id: string
          patient_name: string | null
          patient_phone: string | null
          reminder_1day_email_sent: boolean | null
          reminder_1day_scheduled_at: string | null
          reminder_1day_sent: boolean | null
          reminder_1day_sent_at: string | null
          reminder_1day_sms_sent: boolean | null
          reminder_1hour_email_sent: boolean | null
          reminder_1hour_scheduled_at: string | null
          reminder_1hour_sent: boolean | null
          reminder_1hour_sent_at: string | null
          reminder_1hour_sms_sent: boolean | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          booking_id: string
          booking_type: string
          clinic_address?: string | null
          clinic_id?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          clinic_timezone?: string | null
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          patient_email?: string | null
          patient_id: string
          patient_name?: string | null
          patient_phone?: string | null
          reminder_1day_email_sent?: boolean | null
          reminder_1day_scheduled_at?: string | null
          reminder_1day_sent?: boolean | null
          reminder_1day_sent_at?: string | null
          reminder_1day_sms_sent?: boolean | null
          reminder_1hour_email_sent?: boolean | null
          reminder_1hour_scheduled_at?: string | null
          reminder_1hour_sent?: boolean | null
          reminder_1hour_sent_at?: string | null
          reminder_1hour_sms_sent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          booking_id?: string
          booking_type?: string
          clinic_address?: string | null
          clinic_id?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          clinic_timezone?: string | null
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          patient_email?: string | null
          patient_id?: string
          patient_name?: string | null
          patient_phone?: string | null
          reminder_1day_email_sent?: boolean | null
          reminder_1day_scheduled_at?: string | null
          reminder_1day_sent?: boolean | null
          reminder_1day_sent_at?: string | null
          reminder_1day_sms_sent?: boolean | null
          reminder_1hour_email_sent?: boolean | null
          reminder_1hour_scheduled_at?: string | null
          reminder_1hour_sent?: boolean | null
          reminder_1hour_sent_at?: string | null
          reminder_1hour_sms_sent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          clinic_id: string | null
          created_at: string | null
          current_bookings: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          doctor_id: string | null
          emergency_slot_priority: number | null
          end_time: string
          id: string
          is_emergency_slot: boolean | null
          is_online: boolean | null
          max_bookings: number | null
          notes: string | null
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          clinic_id?: string | null
          created_at?: string | null
          current_bookings?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          doctor_id?: string | null
          emergency_slot_priority?: number | null
          end_time: string
          id?: string
          is_emergency_slot?: boolean | null
          is_online?: boolean | null
          max_bookings?: number | null
          notes?: string | null
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          clinic_id?: string | null
          created_at?: string | null
          current_bookings?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          doctor_id?: string | null
          emergency_slot_priority?: number | null
          end_time?: string
          id?: string
          is_emergency_slot?: boolean | null
          is_online?: boolean | null
          max_bookings?: number | null
          notes?: string | null
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      availability_alerts: {
        Row: {
          alert_sent_at: string | null
          appointment_id: string
          created_at: string | null
          email_delivered: boolean | null
          email_delivered_at: string | null
          email_error: string | null
          expires_at: string | null
          id: string
          is_booking_completed: boolean | null
          last_delivery_attempt: string | null
          notification_types: Json | null
          patient_id: string
          preference_id: string
          sms_delivered: boolean | null
          sms_delivered_at: string | null
          sms_error: string | null
        }
        Insert: {
          alert_sent_at?: string | null
          appointment_id: string
          created_at?: string | null
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          email_error?: string | null
          expires_at?: string | null
          id?: string
          is_booking_completed?: boolean | null
          last_delivery_attempt?: string | null
          notification_types?: Json | null
          patient_id: string
          preference_id: string
          sms_delivered?: boolean | null
          sms_delivered_at?: string | null
          sms_error?: string | null
        }
        Update: {
          alert_sent_at?: string | null
          appointment_id?: string
          created_at?: string | null
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          email_error?: string | null
          expires_at?: string | null
          id?: string
          is_booking_completed?: boolean | null
          last_delivery_attempt?: string | null
          notification_types?: Json | null
          patient_id?: string
          preference_id?: string
          sms_delivered?: boolean | null
          sms_delivered_at?: string | null
          sms_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_alerts_preference_id_fkey"
            columns: ["preference_id"]
            isOneToOne: false
            referencedRelation: "appointment_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_type: string
          category: string | null
          clinic_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          rejection_reason: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          author_type?: string
          category?: string | null
          clinic_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          rejection_reason?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_type?: string
          category?: string | null
          clinic_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          rejection_reason?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_date: string | null
          appointment_id: string | null
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_status: string | null
          booked_by_admin_id: string | null
          booking_reference: string
          cancellation_reason: string | null
          clinic_id: string | null
          clinic_notes: string | null
          created_at: string | null
          discount_applied: number | null
          doctor_name: string | null
          end_time: string | null
          family_member_id: string | null
          id: string
          is_first_portal_booking: boolean | null
          last_reminder_sent_at: string | null
          loyalty_points_earned: number | null
          paid_amount: number | null
          patient_email: string | null
          patient_first_name: string | null
          patient_id: string | null
          patient_last_name: string | null
          patient_mobile: string | null
          patient_notes: string | null
          points_redeemed: number | null
          reminder_1day_sent: boolean | null
          reminder_1hour_sent: boolean | null
          reminder_sent: boolean | null
          service_name: string | null
          share_email: boolean | null
          share_mobile: boolean | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_id?: string | null
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booked_by_admin_id?: string | null
          booking_reference: string
          cancellation_reason?: string | null
          clinic_id?: string | null
          clinic_notes?: string | null
          created_at?: string | null
          discount_applied?: number | null
          doctor_name?: string | null
          end_time?: string | null
          family_member_id?: string | null
          id?: string
          is_first_portal_booking?: boolean | null
          last_reminder_sent_at?: string | null
          loyalty_points_earned?: number | null
          paid_amount?: number | null
          patient_email?: string | null
          patient_first_name?: string | null
          patient_id?: string | null
          patient_last_name?: string | null
          patient_mobile?: string | null
          patient_notes?: string | null
          points_redeemed?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          reminder_sent?: boolean | null
          service_name?: string | null
          share_email?: boolean | null
          share_mobile?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_id?: string | null
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booked_by_admin_id?: string | null
          booking_reference?: string
          cancellation_reason?: string | null
          clinic_id?: string | null
          clinic_notes?: string | null
          created_at?: string | null
          discount_applied?: number | null
          doctor_name?: string | null
          end_time?: string | null
          family_member_id?: string | null
          id?: string
          is_first_portal_booking?: boolean | null
          last_reminder_sent_at?: string | null
          loyalty_points_earned?: number | null
          paid_amount?: number | null
          patient_email?: string | null
          patient_first_name?: string | null
          patient_id?: string | null
          patient_last_name?: string | null
          patient_mobile?: string | null
          patient_notes?: string | null
          points_redeemed?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          reminder_sent?: boolean | null
          service_name?: string | null
          share_email?: boolean | null
          share_mobile?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      centaur_booking_mapping: {
        Row: {
          attendance_status: string | null
          centaur_booking_id: number
          clinic_id: string
          created_at: string
          discount_applied: number | null
          id: string
          last_synced_at: string | null
          local_booking_id: string
          points_awarded: boolean | null
          points_awarded_at: string | null
          points_redeemed: number | null
          service_performed: string | null
          service_points: number | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          attendance_status?: string | null
          centaur_booking_id: number
          clinic_id: string
          created_at?: string
          discount_applied?: number | null
          id?: string
          last_synced_at?: string | null
          local_booking_id: string
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          attendance_status?: string | null
          centaur_booking_id?: number
          clinic_id?: string
          created_at?: string
          discount_applied?: number | null
          id?: string
          last_synced_at?: string | null
          local_booking_id?: string
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      centaur_bookings: {
        Row: {
          appointment_date: string
          appointment_time: string
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_status: string | null
          booking_notes: string | null
          booking_status: Database["public"]["Enums"]["centaur_booking_status"]
          centaur_booking_id: number
          centaur_doctor_id: number
          centaur_response_data: Json | null
          centaur_slot_id: number
          clinic_id: string
          created_at: string
          family_member_id: string | null
          id: string
          last_reminder_sent_at: string | null
          local_patient_id: string
          patient_dob: string | null
          patient_email: string
          patient_first_name: string
          patient_last_name: string
          patient_mobile: string
          points_earned: number | null
          reminder_1day_sent: boolean | null
          reminder_1hour_sent: boolean | null
          service_performed: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booking_notes?: string | null
          booking_status?: Database["public"]["Enums"]["centaur_booking_status"]
          centaur_booking_id: number
          centaur_doctor_id: number
          centaur_response_data?: Json | null
          centaur_slot_id: number
          clinic_id: string
          created_at?: string
          family_member_id?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          local_patient_id: string
          patient_dob?: string | null
          patient_email: string
          patient_first_name: string
          patient_last_name: string
          patient_mobile: string
          points_earned?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          service_performed?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booking_notes?: string | null
          booking_status?: Database["public"]["Enums"]["centaur_booking_status"]
          centaur_booking_id?: number
          centaur_doctor_id?: number
          centaur_response_data?: Json | null
          centaur_slot_id?: number
          clinic_id?: string
          created_at?: string
          family_member_id?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          local_patient_id?: string
          patient_dob?: string | null
          patient_email?: string
          patient_first_name?: string
          patient_last_name?: string
          patient_mobile?: string
          points_earned?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          service_performed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centaur_bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centaur_bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centaur_bookings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centaur_bookings_local_patient_id_fkey"
            columns: ["local_patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      centaur_doctor_mapping: {
        Row: {
          centaur_doctor_id: number
          clinic_id: string
          created_at: string
          id: string
          local_doctor_id: string
          updated_at: string
        }
        Insert: {
          centaur_doctor_id: number
          clinic_id: string
          created_at?: string
          id?: string
          local_doctor_id: string
          updated_at?: string
        }
        Update: {
          centaur_doctor_id?: number
          clinic_id?: string
          created_at?: string
          id?: string
          local_doctor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      centaur_integration_logs: {
        Row: {
          action_type: string
          clinic_id: string
          created_at: string | null
          error_message: string | null
          id: string
          request_data: Json | null
          response_data: Json | null
          success: boolean | null
        }
        Insert: {
          action_type: string
          clinic_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
        }
        Update: {
          action_type?: string
          clinic_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
        }
        Relationships: []
      }
      centaur_patient_mapping: {
        Row: {
          centaur_patient_id: number
          clinic_id: string
          created_at: string
          id: string
          local_patient_id: string
          updated_at: string
        }
        Insert: {
          centaur_patient_id: number
          clinic_id: string
          created_at?: string
          id?: string
          local_patient_id: string
          updated_at?: string
        }
        Update: {
          centaur_patient_id?: number
          clinic_id?: string
          created_at?: string
          id?: string
          local_patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      centaur_reason_mapping: {
        Row: {
          centaur_reason_id: number
          centaur_reason_name: string
          clinic_id: string
          created_at: string
          id: string
          local_service_id: string
          updated_at: string
        }
        Insert: {
          centaur_reason_id: number
          centaur_reason_name: string
          clinic_id: string
          created_at?: string
          id?: string
          local_service_id: string
          updated_at?: string
        }
        Update: {
          centaur_reason_id?: number
          centaur_reason_name?: string
          clinic_id?: string
          created_at?: string
          id?: string
          local_service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      centaur_slot_notifications: {
        Row: {
          centaur_slot_id: number
          clinic_id: string | null
          created_at: string | null
          doctor_id: number
          email_delivered: boolean | null
          email_delivered_at: string | null
          email_error: string | null
          id: string
          last_delivery_attempt: string | null
          notified_at: string | null
          patient_id: string
          preference_id: string | null
          slot_date: string
          slot_time: string
          sms_delivered: boolean | null
          sms_delivered_at: string | null
          sms_error: string | null
        }
        Insert: {
          centaur_slot_id: number
          clinic_id?: string | null
          created_at?: string | null
          doctor_id: number
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          email_error?: string | null
          id?: string
          last_delivery_attempt?: string | null
          notified_at?: string | null
          patient_id: string
          preference_id?: string | null
          slot_date: string
          slot_time: string
          sms_delivered?: boolean | null
          sms_delivered_at?: string | null
          sms_error?: string | null
        }
        Update: {
          centaur_slot_id?: number
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: number
          email_delivered?: boolean | null
          email_delivered_at?: string | null
          email_error?: string | null
          id?: string
          last_delivery_attempt?: string | null
          notified_at?: string | null
          patient_id?: string
          preference_id?: string | null
          slot_date?: string
          slot_time?: string
          sms_delivered?: boolean | null
          sms_delivered_at?: string | null
          sms_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centaur_slot_notifications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centaur_slot_notifications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centaur_slot_notifications_preference_id_fkey"
            columns: ["preference_id"]
            isOneToOne: false
            referencedRelation: "appointment_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_archived_by_clinic: boolean | null
          is_archived_by_patient: boolean | null
          last_message_at: string | null
          last_message_preview_encrypted: string | null
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_archived_by_clinic?: boolean | null
          is_archived_by_patient?: boolean | null
          last_message_at?: string | null
          last_message_preview_encrypted?: string | null
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_archived_by_clinic?: boolean | null
          is_archived_by_patient?: boolean | null
          last_message_at?: string | null
          last_message_preview_encrypted?: string | null
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_encryption_keys: {
        Row: {
          conversation_id: string
          created_at: string | null
          encrypted_key: string
          id: string
          key_version: number | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          encrypted_key: string
          id?: string
          key_version?: number | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          encrypted_key?: string
          id?: string
          key_version?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_encryption_keys_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content_encrypted: string
          content_iv: string
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content_encrypted: string
          content_iv: string
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content_encrypted?: string
          content_iv?: string
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_staff_access: {
        Row: {
          can_send_messages: boolean | null
          can_view_chat: boolean | null
          clinic_id: string
          created_at: string | null
          granted_by: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_send_messages?: boolean | null
          can_view_chat?: boolean | null
          clinic_id: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_send_messages?: boolean | null
          can_view_chat?: boolean | null
          clinic_id?: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_staff_access_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_staff_access_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_billing: {
        Row: {
          billing_cycle: string
          clinic_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          effective_from: string | null
          free_appointments_per_month: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          price_per_appointment: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          billing_cycle?: string
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_from?: string | null
          free_appointments_per_month?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          price_per_appointment?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          billing_cycle?: string
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_from?: string | null
          free_appointments_per_month?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          price_per_appointment?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_billing_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_billing_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_billing_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          clinic_billing_id: string | null
          clinic_id: string
          created_at: string | null
          id: string
          new_free_appointments: number | null
          new_price: number
          previous_free_appointments: number | null
          previous_price: number | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          clinic_billing_id?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          new_free_appointments?: number | null
          new_price: number
          previous_free_appointments?: number | null
          previous_price?: number | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          clinic_billing_id?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          new_free_appointments?: number | null
          new_price?: number
          previous_free_appointments?: number | null
          previous_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_billing_history_clinic_billing_id_fkey"
            columns: ["clinic_billing_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_billing_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_billing_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_deletion_logs: {
        Row: {
          backup_snapshot: Json | null
          clinic_id: string
          clinic_name: string
          deleted_at: string
          deleted_by: string
          deletion_summary: Json | null
          id: string
          reason: string | null
        }
        Insert: {
          backup_snapshot?: Json | null
          clinic_id: string
          clinic_name: string
          deleted_at?: string
          deleted_by: string
          deletion_summary?: Json | null
          id?: string
          reason?: string | null
        }
        Update: {
          backup_snapshot?: Json | null
          clinic_id?: string
          clinic_name?: string
          deleted_at?: string
          deleted_by?: string
          deletion_summary?: Json | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      clinic_document_shares: {
        Row: {
          access_revoked: boolean | null
          clinic_id: string
          created_at: string | null
          document_id: string
          download_password_hash: string | null
          downloaded_at: string | null
          downloaded_by: string | null
          expires_at: string | null
          id: string
          is_downloaded: boolean | null
          max_password_attempts: number | null
          notes: string | null
          password_attempts: number | null
          patient_id: string
          revoked_at: string | null
          shared_at: string | null
          shared_by: string | null
          updated_at: string | null
        }
        Insert: {
          access_revoked?: boolean | null
          clinic_id: string
          created_at?: string | null
          document_id: string
          download_password_hash?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          notes?: string | null
          password_attempts?: number | null
          patient_id: string
          revoked_at?: string | null
          shared_at?: string | null
          shared_by?: string | null
          updated_at?: string | null
        }
        Update: {
          access_revoked?: boolean | null
          clinic_id?: string
          created_at?: string | null
          document_id?: string
          download_password_hash?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          notes?: string | null
          password_attempts?: number | null
          patient_id?: string
          revoked_at?: string | null
          shared_at?: string | null
          shared_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_document_shares_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_document_shares_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clinic_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_document_shares_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_documents: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          tags: Json | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_images: {
        Row: {
          alt_text: string | null
          clinic_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_type: string
          image_url: string
          is_primary: boolean | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          clinic_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type: string
          image_url: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          clinic_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: string
          image_url?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_images_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_images_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invitations: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          accepted_by: string | null
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invite_token: string
          invited_by: string
          last_name: string | null
          permissions: Json
          role: Database["public"]["Enums"]["clinic_user_role"]
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          clinic_id: string
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invite_token?: string
          invited_by: string
          last_name?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["clinic_user_role"]
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          last_name?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["clinic_user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_migrations: {
        Row: {
          backup_data: Json
          clinic_id: string
          completed_at: string | null
          created_at: string
          from_type: string
          id: string
          migration_results: Json | null
          migration_strategy: string
          started_by: string | null
          status: string
          to_type: string
        }
        Insert: {
          backup_data: Json
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          from_type?: string
          id?: string
          migration_results?: Json | null
          migration_strategy: string
          started_by?: string | null
          status: string
          to_type: string
        }
        Update: {
          backup_data?: Json
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          from_type?: string
          id?: string
          migration_results?: Json | null
          migration_strategy?: string
          started_by?: string | null
          status?: string
          to_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_migrations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_migrations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_module_subscriptions: {
        Row: {
          activated_at: string | null
          clinic_id: string
          created_at: string | null
          deactivated_at: string | null
          id: string
          is_active: boolean
          module_key: string
          price_per_month: number
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          clinic_id: string
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_key: string
          price_per_month?: number
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          clinic_id?: string
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          price_per_month?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_module_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_module_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_profile_claims: {
        Row: {
          account_created: boolean | null
          approved_at: string | null
          approved_by: string | null
          claim_notes: string | null
          claim_status: string
          clinic_id: string | null
          created_at: string | null
          document_urls: Json | null
          email: string | null
          email_verified_at: string | null
          id: string
          password_hash: string | null
          rejected_at: string | null
          rejection_reason: string | null
          submitted_at: string | null
          terms_accepted: boolean | null
          updated_at: string | null
          user_id: string | null
          verification_code: string | null
          verification_documents: Json | null
        }
        Insert: {
          account_created?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          claim_notes?: string | null
          claim_status?: string
          clinic_id?: string | null
          created_at?: string | null
          document_urls?: Json | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          password_hash?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          submitted_at?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          verification_code?: string | null
          verification_documents?: Json | null
        }
        Update: {
          account_created?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          claim_notes?: string | null
          claim_status?: string
          clinic_id?: string | null
          created_at?: string | null
          document_urls?: Json | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          password_hash?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          submitted_at?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          verification_code?: string | null
          verification_documents?: Json | null
        }
        Relationships: []
      }
      clinic_referrals: {
        Row: {
          access_revoked: boolean | null
          created_at: string | null
          created_by: string | null
          document_id: string
          download_password_hash: string
          downloaded_at: string | null
          downloaded_by: string | null
          expires_at: string | null
          id: string
          is_downloaded: boolean | null
          max_password_attempts: number | null
          password_attempts: number | null
          patient_name: string | null
          referral_notes: string | null
          revoked_at: string | null
          source_clinic_id: string
          target_clinic_id: string
          updated_at: string | null
        }
        Insert: {
          access_revoked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          download_password_hash: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          password_attempts?: number | null
          patient_name?: string | null
          referral_notes?: string | null
          revoked_at?: string | null
          source_clinic_id: string
          target_clinic_id: string
          updated_at?: string | null
        }
        Update: {
          access_revoked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          download_password_hash?: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          password_attempts?: number | null
          patient_name?: string | null
          referral_notes?: string | null
          revoked_at?: string | null
          source_clinic_id?: string
          target_clinic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_referrals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clinic_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_referrals_source_clinic_id_fkey"
            columns: ["source_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_referrals_source_clinic_id_fkey"
            columns: ["source_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_referrals_target_clinic_id_fkey"
            columns: ["target_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_referrals_target_clinic_id_fkey"
            columns: ["target_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_reviews: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          patient_id: string | null
          rating: number
          review_text: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          patient_id?: string | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          patient_id?: string | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_staff: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clinic_id: string | null
          created_at: string | null
          department: string | null
          display_order: number | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          languages: Json | null
          last_name: string
          phone: string | null
          qualifications: Json | null
          role: string
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id?: string | null
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          languages?: Json | null
          last_name: string
          phone?: string | null
          qualifications?: Json | null
          role: string
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id?: string | null
          created_at?: string | null
          department?: string | null
          display_order?: number | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string
          phone?: string | null
          qualifications?: Json | null
          role?: string
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_users: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          permissions: Json
          role: Database["public"]["Enums"]["clinic_user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          permissions?: Json
          role?: Database["public"]["Enums"]["clinic_user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          permissions?: Json
          role?: Database["public"]["Enums"]["clinic_user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          amenities: Json | null
          auto_sync_enabled: boolean | null
          bio: string | null
          bulk_billing_available: boolean | null
          bulk_import_enabled: boolean | null
          centaur_api_enabled: boolean | null
          centaur_api_key_encrypted: string | null
          centaur_last_synced_at: string | null
          centaur_practice_id: string | null
          centaur_sync_status: string | null
          chat_enabled: boolean | null
          city: string | null
          claim_verification_status: string | null
          clinic_type: string | null
          country: string | null
          created_at: string | null
          custom_api_config_id: string | null
          custom_api_enabled: boolean | null
          d4w_api_enabled: boolean | null
          d4w_api_key_encrypted: string | null
          d4w_practice_id: string | null
          description: string | null
          email: string | null
          emergency_services: boolean | null
          emergency_slots_enabled: boolean | null
          emergency_slots_per_day: number | null
          established_year: number | null
          external_id: string | null
          external_source: string | null
          facilities: Json | null
          google_maps_url: string | null
          health_fund_cards_accepted: Json | null
          health_funds_accepted: Json | null
          id: string
          initial_sync_completed: boolean | null
          initial_sync_completed_at: string | null
          integration_errors: Json | null
          is_active: boolean | null
          is_verified: boolean | null
          languages_spoken: Json | null
          last_sync_at: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          migration_completed_at: string | null
          migration_eligible: boolean | null
          migration_started_at: string | null
          migration_status: string | null
          mission_statement: string | null
          name: string
          next_scheduled_sync: string | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          operating_hours: Json | null
          operating_hours_detailed: Json | null
          parking_available: boolean | null
          patient_documents_enabled: boolean
          phone: string | null
          pre_migration_backup: Json | null
          profile_claimed: boolean | null
          quotes_enabled: boolean | null
          rating: number | null
          referrals_enabled: boolean
          revenue_analytics: Json | null
          reviews_count: number | null
          selected_integration_type: string | null
          services: Json | null
          specializations: Json | null
          state: string | null
          sub_type: string | null
          sync_schedule: string | null
          sync_statistics: Json | null
          telehealth_available: boolean | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          wheelchair_accessible: boolean | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          amenities?: Json | null
          auto_sync_enabled?: boolean | null
          bio?: string | null
          bulk_billing_available?: boolean | null
          bulk_import_enabled?: boolean | null
          centaur_api_enabled?: boolean | null
          centaur_api_key_encrypted?: string | null
          centaur_last_synced_at?: string | null
          centaur_practice_id?: string | null
          centaur_sync_status?: string | null
          chat_enabled?: boolean | null
          city?: string | null
          claim_verification_status?: string | null
          clinic_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_api_config_id?: string | null
          custom_api_enabled?: boolean | null
          d4w_api_enabled?: boolean | null
          d4w_api_key_encrypted?: string | null
          d4w_practice_id?: string | null
          description?: string | null
          email?: string | null
          emergency_services?: boolean | null
          emergency_slots_enabled?: boolean | null
          emergency_slots_per_day?: number | null
          established_year?: number | null
          external_id?: string | null
          external_source?: string | null
          facilities?: Json | null
          google_maps_url?: string | null
          health_fund_cards_accepted?: Json | null
          health_funds_accepted?: Json | null
          id?: string
          initial_sync_completed?: boolean | null
          initial_sync_completed_at?: string | null
          integration_errors?: Json | null
          is_active?: boolean | null
          is_verified?: boolean | null
          languages_spoken?: Json | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          migration_completed_at?: string | null
          migration_eligible?: boolean | null
          migration_started_at?: string | null
          migration_status?: string | null
          mission_statement?: string | null
          name: string
          next_scheduled_sync?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          operating_hours?: Json | null
          operating_hours_detailed?: Json | null
          parking_available?: boolean | null
          patient_documents_enabled?: boolean
          phone?: string | null
          pre_migration_backup?: Json | null
          profile_claimed?: boolean | null
          quotes_enabled?: boolean | null
          rating?: number | null
          referrals_enabled?: boolean
          revenue_analytics?: Json | null
          reviews_count?: number | null
          selected_integration_type?: string | null
          services?: Json | null
          specializations?: Json | null
          state?: string | null
          sub_type?: string | null
          sync_schedule?: string | null
          sync_statistics?: Json | null
          telehealth_available?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          amenities?: Json | null
          auto_sync_enabled?: boolean | null
          bio?: string | null
          bulk_billing_available?: boolean | null
          bulk_import_enabled?: boolean | null
          centaur_api_enabled?: boolean | null
          centaur_api_key_encrypted?: string | null
          centaur_last_synced_at?: string | null
          centaur_practice_id?: string | null
          centaur_sync_status?: string | null
          chat_enabled?: boolean | null
          city?: string | null
          claim_verification_status?: string | null
          clinic_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_api_config_id?: string | null
          custom_api_enabled?: boolean | null
          d4w_api_enabled?: boolean | null
          d4w_api_key_encrypted?: string | null
          d4w_practice_id?: string | null
          description?: string | null
          email?: string | null
          emergency_services?: boolean | null
          emergency_slots_enabled?: boolean | null
          emergency_slots_per_day?: number | null
          established_year?: number | null
          external_id?: string | null
          external_source?: string | null
          facilities?: Json | null
          google_maps_url?: string | null
          health_fund_cards_accepted?: Json | null
          health_funds_accepted?: Json | null
          id?: string
          initial_sync_completed?: boolean | null
          initial_sync_completed_at?: string | null
          integration_errors?: Json | null
          is_active?: boolean | null
          is_verified?: boolean | null
          languages_spoken?: Json | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          migration_completed_at?: string | null
          migration_eligible?: boolean | null
          migration_started_at?: string | null
          migration_status?: string | null
          mission_statement?: string | null
          name?: string
          next_scheduled_sync?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          operating_hours?: Json | null
          operating_hours_detailed?: Json | null
          parking_available?: boolean | null
          patient_documents_enabled?: boolean
          phone?: string | null
          pre_migration_backup?: Json | null
          profile_claimed?: boolean | null
          quotes_enabled?: boolean | null
          rating?: number | null
          referrals_enabled?: boolean
          revenue_analytics?: Json | null
          reviews_count?: number | null
          selected_integration_type?: string | null
          services?: Json | null
          specializations?: Json | null
          state?: string | null
          sub_type?: string | null
          sync_schedule?: string | null
          sync_statistics?: Json | null
          telehealth_available?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_execution_logs: {
        Row: {
          created_at: string
          details: Json | null
          execution_time: string
          id: string
          job_name: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          execution_time?: string
          id?: string
          job_name: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          execution_time?: string
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      custom_api_bookings: {
        Row: {
          api_response_data: Json | null
          appointment_date: string
          appointment_time: string
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_status: string | null
          booking_notes: string | null
          booking_status: string | null
          clinic_id: string
          config_id: string
          created_at: string | null
          discount_applied: number | null
          doctor_name: string | null
          duration_minutes: number | null
          external_booking_id: string
          external_doctor_id: string
          external_slot_id: string | null
          family_member_id: string | null
          id: string
          last_reminder_sent_at: string | null
          local_booking_id: string | null
          patient_dob: string | null
          patient_email: string | null
          patient_first_name: string
          patient_id: string | null
          patient_last_name: string
          patient_mobile: string | null
          points_awarded: boolean | null
          points_awarded_at: string | null
          points_redeemed: number | null
          reminder_1day_sent: boolean | null
          reminder_1hour_sent: boolean | null
          service_name: string | null
          service_performed: string | null
          service_points: number | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          api_response_data?: Json | null
          appointment_date: string
          appointment_time: string
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booking_notes?: string | null
          booking_status?: string | null
          clinic_id: string
          config_id: string
          created_at?: string | null
          discount_applied?: number | null
          doctor_name?: string | null
          duration_minutes?: number | null
          external_booking_id: string
          external_doctor_id: string
          external_slot_id?: string | null
          family_member_id?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          local_booking_id?: string | null
          patient_dob?: string | null
          patient_email?: string | null
          patient_first_name: string
          patient_id?: string | null
          patient_last_name: string
          patient_mobile?: string | null
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          service_name?: string | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_response_data?: Json | null
          appointment_date?: string
          appointment_time?: string
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          booking_notes?: string | null
          booking_status?: string | null
          clinic_id?: string
          config_id?: string
          created_at?: string | null
          discount_applied?: number | null
          doctor_name?: string | null
          duration_minutes?: number | null
          external_booking_id?: string
          external_doctor_id?: string
          external_slot_id?: string | null
          family_member_id?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          local_booking_id?: string | null
          patient_dob?: string | null
          patient_email?: string | null
          patient_first_name?: string
          patient_id?: string | null
          patient_last_name?: string
          patient_mobile?: string | null
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          reminder_1day_sent?: boolean | null
          reminder_1hour_sent?: boolean | null
          service_name?: string | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_api_bookings_attendance_marked_by_fkey"
            columns: ["attendance_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_local_booking_id_fkey"
            columns: ["local_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_api_doctors: {
        Row: {
          bio: string | null
          clinic_id: string
          config_id: string
          created_at: string | null
          doctor_name: string
          external_data: Json | null
          external_doctor_id: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          local_doctor_id: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          clinic_id: string
          config_id: string
          created_at?: string | null
          doctor_name: string
          external_data?: Json | null
          external_doctor_id: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          local_doctor_id?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          clinic_id?: string
          config_id?: string
          created_at?: string | null
          doctor_name?: string
          external_data?: Json | null
          external_doctor_id?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          local_doctor_id?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_api_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_doctors_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_doctors_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_doctors_local_doctor_id_fkey"
            columns: ["local_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_doctors_local_doctor_id_fkey"
            columns: ["local_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      d4w_booking_mapping: {
        Row: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_status: string | null
          clinic_id: string
          created_at: string | null
          d4w_booking_id: string
          discount_applied: number | null
          id: string
          local_booking_id: string
          points_awarded: boolean | null
          points_awarded_at: string | null
          points_redeemed: number | null
          service_performed: string | null
          service_points: number | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          clinic_id: string
          created_at?: string | null
          d4w_booking_id: string
          discount_applied?: number | null
          id?: string
          local_booking_id: string
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string | null
          clinic_id?: string
          created_at?: string | null
          d4w_booking_id?: string
          discount_applied?: number | null
          id?: string
          local_booking_id?: string
          points_awarded?: boolean | null
          points_awarded_at?: string | null
          points_redeemed?: number | null
          service_performed?: string | null
          service_points?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "d4w_booking_mapping_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_booking_mapping_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_booking_mapping_local_booking_id_fkey"
            columns: ["local_booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      d4w_integration_logs: {
        Row: {
          action_type: string
          clinic_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          request_data: Json | null
          response_data: Json | null
          success: boolean | null
        }
        Insert: {
          action_type: string
          clinic_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
        }
        Update: {
          action_type?: string
          clinic_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "d4w_integration_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_integration_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      d4w_service_mapping: {
        Row: {
          clinic_id: string
          created_at: string | null
          d4w_service_id: string
          d4w_service_name: string | null
          id: string
          local_service_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          d4w_service_id: string
          d4w_service_name?: string | null
          id?: string
          local_service_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          d4w_service_id?: string
          d4w_service_name?: string | null
          id?: string
          local_service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "d4w_service_mapping_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_service_mapping_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_service_mapping_local_service_id_fkey"
            columns: ["local_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "d4w_service_mapping_local_service_id_fkey"
            columns: ["local_service_id"]
            isOneToOne: false
            referencedRelation: "services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_services: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          is_active: boolean | null
          points_awarded: number | null
          service_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          is_active?: boolean | null
          points_awarded?: number | null
          service_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          points_awarded?: number | null
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_services_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_services_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_unavailability: {
        Row: {
          created_at: string | null
          created_by: string | null
          doctor_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          unavailability_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          unavailability_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          unavailability_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_unavailability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_unavailability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          aphra_registration_number: string | null
          aphra_verification_data: Json | null
          aphra_verification_status: string | null
          aphra_verified_at: string | null
          areas_of_interest: string | null
          availability: Json | null
          avatar_url: string | null
          bio: string | null
          certifications: Json | null
          clinic_id: string | null
          consultation_fee: number | null
          created_at: string | null
          display_order: number | null
          education: string | null
          email: string | null
          emergency_time_slots: Json | null
          first_name: string
          id: string
          is_active: boolean | null
          languages: Json | null
          last_name: string
          license_number: string | null
          phone: string | null
          practice_restrictions: string | null
          prescriber_number: string | null
          prescriber_number_verified_at: string | null
          prescriber_number_verified_by: string | null
          professional_registration_expiry: string | null
          provider_number: string | null
          provider_number_verified_at: string | null
          provider_number_verified_by: string | null
          qualifications: Json | null
          registration_type: string | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          aphra_registration_number?: string | null
          aphra_verification_data?: Json | null
          aphra_verification_status?: string | null
          aphra_verified_at?: string | null
          areas_of_interest?: string | null
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          clinic_id?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          display_order?: number | null
          education?: string | null
          email?: string | null
          emergency_time_slots?: Json | null
          first_name: string
          id?: string
          is_active?: boolean | null
          languages?: Json | null
          last_name: string
          license_number?: string | null
          phone?: string | null
          practice_restrictions?: string | null
          prescriber_number?: string | null
          prescriber_number_verified_at?: string | null
          prescriber_number_verified_by?: string | null
          professional_registration_expiry?: string | null
          provider_number?: string | null
          provider_number_verified_at?: string | null
          provider_number_verified_by?: string | null
          qualifications?: Json | null
          registration_type?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          aphra_registration_number?: string | null
          aphra_verification_data?: Json | null
          aphra_verification_status?: string | null
          aphra_verified_at?: string | null
          areas_of_interest?: string | null
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          clinic_id?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          display_order?: number | null
          education?: string | null
          email?: string | null
          emergency_time_slots?: Json | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string
          license_number?: string | null
          phone?: string | null
          practice_restrictions?: string | null
          prescriber_number?: string | null
          prescriber_number_verified_at?: string | null
          prescriber_number_verified_by?: string | null
          professional_registration_expiry?: string | null
          provider_number?: string | null
          provider_number_verified_at?: string | null
          provider_number_verified_by?: string | null
          qualifications?: Json | null
          registration_type?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          color: string
          created_at: string
          description: string | null
          folder_name: string
          folder_type: string
          icon: string | null
          id: string
          is_default: boolean
          patient_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          folder_name: string
          folder_type: string
          icon?: string | null
          id?: string
          is_default?: boolean
          patient_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          folder_name?: string
          folder_type?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sharing_logs: {
        Row: {
          document_id: string | null
          id: string
          message: string | null
          recipient_email: string
          sent_at: string | null
          service_id: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          document_id?: string | null
          id?: string
          message?: string | null
          recipient_email: string
          sent_at?: string | null
          service_id?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          document_id?: string | null
          id?: string
          message?: string | null
          recipient_email?: string
          sent_at?: string | null
          service_id?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sharing_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "patient_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sharing_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "nearby_services"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          last_name: string
          mobile: string | null
          notes: string | null
          postcode: string | null
          relationship: string
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          mobile?: string | null
          notes?: string | null
          postcode?: string | null
          relationship: string
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          mobile?: string | null
          notes?: string | null
          postcode?: string | null
          relationship?: string
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_device_connections: {
        Row: {
          api_key: string | null
          created_at: string | null
          device_name: string | null
          device_type: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_fund_cards: {
        Row: {
          back_image_path: string | null
          card_holder_name: string
          card_image_path: string | null
          created_at: string
          expiry_date: string | null
          hicaps_compatible: boolean | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          member_number: string
          patient_id: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          back_image_path?: string | null
          card_holder_name: string
          card_image_path?: string | null
          created_at?: string
          expiry_date?: string | null
          hicaps_compatible?: boolean | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          member_number: string
          patient_id: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          back_image_path?: string | null
          card_holder_name?: string
          card_image_path?: string | null
          created_at?: string
          expiry_date?: string | null
          hicaps_compatible?: boolean | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          member_number?: string
          patient_id?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_fund_cards_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          metric_type: string
          recorded_at: string
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          metric_type: string
          recorded_at: string
          unit: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          metric_type?: string
          recorded_at?: string
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "health_device_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      health_recommendations: {
        Row: {
          category: string
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          priority: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          api_config_id: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_details: Json | null
          id: string
          integration_type: string
          items_failed: number | null
          items_processed: number | null
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          api_config_id?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          integration_type: string
          items_failed?: number | null
          items_processed?: number | null
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          api_config_id?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          integration_type?: string
          items_failed?: number | null
          items_processed?: number | null
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number | null
          referral_code: string | null
          referred_by: string | null
          tier_level: string | null
          total_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          tier_level?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          tier_level?: string | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          booking_id: string | null
          clinic_id: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_expired: boolean | null
          points: number
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["loyalty_transaction_type"]
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          points: number
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["loyalty_transaction_type"]
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          points?: number
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["loyalty_transaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_services: {
        Row: {
          address: string
          created_at: string | null
          distance_km: number | null
          email: string | null
          google_place_id: string | null
          id: string
          is_favorite: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          service_type: string
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          distance_km?: number | null
          email?: string | null
          google_place_id?: string | null
          id?: string
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          service_type: string
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          distance_km?: number | null
          email?: string | null
          google_place_id?: string | null
          id?: string
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          service_type?: string
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          recipient: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          recipient: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          recipient?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinic_favorites: {
        Row: {
          clinic_id: string
          created_at: string | null
          custom_name: string | null
          id: string
          notes: string | null
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          custom_name?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          custom_name?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinic_favorites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinic_favorites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_doctor_favorites: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          custom_name: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          custom_name?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          custom_name?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_doctor_favorites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_doctor_favorites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_doctor_favorites_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_doctor_favorites_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_document_shares: {
        Row: {
          access_revoked: boolean | null
          clinic_id: string
          created_at: string | null
          document_id: string
          download_password_hash: string | null
          downloaded_at: string | null
          downloaded_by: string | null
          expires_at: string | null
          id: string
          is_downloaded: boolean | null
          max_password_attempts: number | null
          notes: string | null
          password_attempts: number | null
          patient_id: string
          revoked_at: string | null
          shared_at: string | null
          shared_by: string | null
          updated_at: string | null
        }
        Insert: {
          access_revoked?: boolean | null
          clinic_id: string
          created_at?: string | null
          document_id: string
          download_password_hash?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          notes?: string | null
          password_attempts?: number | null
          patient_id: string
          revoked_at?: string | null
          shared_at?: string | null
          shared_by?: string | null
          updated_at?: string | null
        }
        Update: {
          access_revoked?: boolean | null
          clinic_id?: string
          created_at?: string | null
          document_id?: string
          download_password_hash?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_at?: string | null
          id?: string
          is_downloaded?: boolean | null
          max_password_attempts?: number | null
          notes?: string | null
          password_attempts?: number | null
          patient_id?: string
          revoked_at?: string | null
          shared_at?: string | null
          shared_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_document_shares_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_document_shares_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "patient_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          patient_id: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          patient_id: string
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          patient_id?: string
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_pharmacy_shares: {
        Row: {
          access_revoked: boolean | null
          created_at: string | null
          dispensed_at: string | null
          id: string
          notes: string | null
          pharmacy_clinic_id: string
          prescription_id: string
          rejected_at: string | null
          response_notes: string | null
          revoked_at: string | null
          shared_at: string | null
          shared_by: string
          status: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          access_revoked?: boolean | null
          created_at?: string | null
          dispensed_at?: string | null
          id?: string
          notes?: string | null
          pharmacy_clinic_id: string
          prescription_id: string
          rejected_at?: string | null
          response_notes?: string | null
          revoked_at?: string | null
          shared_at?: string | null
          shared_by: string
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_revoked?: boolean | null
          created_at?: string | null
          dispensed_at?: string | null
          id?: string
          notes?: string | null
          pharmacy_clinic_id?: string
          prescription_id?: string
          rejected_at?: string | null
          response_notes?: string | null
          revoked_at?: string | null
          shared_at?: string | null
          shared_by?: string
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_pharmacy_shares_pharmacy_clinic_id_fkey"
            columns: ["pharmacy_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_pharmacy_shares_pharmacy_clinic_id_fkey"
            columns: ["pharmacy_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_pharmacy_shares_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_pharmacy_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          booking_id: string | null
          booking_reference: string | null
          booking_type: string
          centaur_booking_id: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          custom_api_booking_id: string | null
          description: string | null
          dispensed_at: string | null
          dispensed_by_pharmacy_id: string | null
          doctor_id: string | null
          doctor_name: string | null
          expires_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          medications: Json | null
          mime_type: string | null
          patient_id: string
          prescription_date: string
          prescription_text: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          booking_reference?: string | null
          booking_type: string
          centaur_booking_id?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          custom_api_booking_id?: string | null
          description?: string | null
          dispensed_at?: string | null
          dispensed_by_pharmacy_id?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          medications?: Json | null
          mime_type?: string | null
          patient_id: string
          prescription_date?: string
          prescription_text?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          booking_reference?: string | null
          booking_type?: string
          centaur_booking_id?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          custom_api_booking_id?: string | null
          description?: string | null
          dispensed_at?: string | null
          dispensed_by_pharmacy_id?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          medications?: Json | null
          mime_type?: string | null
          patient_id?: string
          prescription_date?: string
          prescription_text?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_centaur_booking_id_fkey"
            columns: ["centaur_booking_id"]
            isOneToOne: false
            referencedRelation: "centaur_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_custom_api_booking_id_fkey"
            columns: ["custom_api_booking_id"]
            isOneToOne: false
            referencedRelation: "custom_api_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_dispensed_by_pharmacy_id_fkey"
            columns: ["dispensed_by_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_dispensed_by_pharmacy_id_fkey"
            columns: ["dispensed_by_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          postcode: string | null
          share_email_with_clinics: boolean | null
          share_mobile_with_clinics: boolean | null
          state: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          postcode?: string | null
          share_email_with_clinics?: boolean | null
          share_mobile_with_clinics?: boolean | null
          state?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          postcode?: string | null
          share_email_with_clinics?: boolean | null
          share_mobile_with_clinics?: boolean | null
          state?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      provider_number_submission_requests: {
        Row: {
          clinic_id: string
          created_at: string | null
          doctor_id: string
          id: string
          number_type: string
          provider_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
          number_type?: string
          provider_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          number_type?: string
          provider_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_number_submission_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_number_submission_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          clinic_id: string
          clinic_notes: string | null
          created_at: string
          estimated_cost: number | null
          estimated_gap: number | null
          estimated_rebate: number | null
          id: string
          patient_id: string
          patient_notes: string | null
          payment_options: string | null
          preferred_date: string | null
          quote_batch_id: string | null
          request_type: string
          responded_at: string | null
          responded_by: string | null
          service_id: string | null
          service_name: string
          status: string
          updated_at: string
          urgency: string
          valid_until: string | null
        }
        Insert: {
          clinic_id: string
          clinic_notes?: string | null
          created_at?: string
          estimated_cost?: number | null
          estimated_gap?: number | null
          estimated_rebate?: number | null
          id?: string
          patient_id: string
          patient_notes?: string | null
          payment_options?: string | null
          preferred_date?: string | null
          quote_batch_id?: string | null
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          service_name: string
          status?: string
          updated_at?: string
          urgency?: string
          valid_until?: string | null
        }
        Update: {
          clinic_id?: string
          clinic_notes?: string | null
          created_at?: string
          estimated_cost?: number | null
          estimated_gap?: number | null
          estimated_rebate?: number | null
          id?: string
          patient_id?: string
          patient_notes?: string | null
          payment_options?: string | null
          preferred_date?: string | null
          quote_batch_id?: string | null
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          service_name?: string
          status?: string
          updated_at?: string
          urgency?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          referral_id: string
          sender_clinic_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          referral_id: string
          sender_clinic_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          referral_id?: string
          sender_clinic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_messages_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "clinic_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_messages_sender_clinic_id_fkey"
            columns: ["sender_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_messages_sender_clinic_id_fkey"
            columns: ["sender_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          default_points: number | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          is_online: boolean | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          default_points?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          default_points?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          api_config_id: string | null
          clinic_id: string
          conflict_type: string
          created_at: string
          external_data: Json | null
          external_id: string | null
          id: string
          integration_type: string
          local_data: Json | null
          local_id: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_type: string
        }
        Insert: {
          api_config_id?: string | null
          clinic_id: string
          conflict_type: string
          created_at?: string
          external_data?: Json | null
          external_id?: string | null
          id?: string
          integration_type: string
          local_data?: Json | null
          local_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_type: string
        }
        Update: {
          api_config_id?: string | null
          clinic_id?: string
          conflict_type?: string
          created_at?: string
          external_data?: Json | null
          external_id?: string | null
          id?: string
          integration_type?: string
          local_data?: Json | null
          local_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinic_id: string | null
          created_at: string
          description: string | null
          doctor_id: string | null
          document_path: string | null
          end_date: string | null
          id: string
          patient_id: string
          start_date: string | null
          status: string | null
          title: string
          treatment_notes: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          document_path?: string | null
          end_date?: string | null
          id?: string
          patient_id: string
          start_date?: string | null
          status?: string | null
          title: string
          treatment_notes?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          document_path?: string | null
          end_date?: string | null
          id?: string
          patient_id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          treatment_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      api_configurations_safe: {
        Row: {
          api_version: string | null
          auth_method: string | null
          auto_sync_enabled: boolean | null
          booking_response_config: Json | null
          clinic_id: string | null
          config_name: string | null
          conflict_resolution_strategy: string | null
          created_at: string | null
          created_by: string | null
          custom_settings: Json | null
          endpoint_config: Json | null
          environment: string | null
          field_mappings: Json | null
          id: string | null
          integration_type: string | null
          is_active: boolean | null
          is_primary: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          last_tested_at: string | null
          next_scheduled_sync: string | null
          practice_id: string | null
          rate_limit_requests: number | null
          rate_limit_window_seconds: number | null
          region: string | null
          response_format: string | null
          retry_attempts: number | null
          retry_delay_ms: number | null
          sync_schedule: string | null
          test_status: string | null
          timeout_ms: number | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_version?: string | null
          auth_method?: string | null
          auto_sync_enabled?: boolean | null
          booking_response_config?: Json | null
          clinic_id?: string | null
          config_name?: string | null
          conflict_resolution_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_settings?: Json | null
          endpoint_config?: never
          environment?: string | null
          field_mappings?: Json | null
          id?: string | null
          integration_type?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_tested_at?: string | null
          next_scheduled_sync?: string | null
          practice_id?: string | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          region?: string | null
          response_format?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          sync_schedule?: string | null
          test_status?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_version?: string | null
          auth_method?: string | null
          auto_sync_enabled?: boolean | null
          booking_response_config?: Json | null
          clinic_id?: string | null
          config_name?: string | null
          conflict_resolution_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_settings?: Json | null
          endpoint_config?: never
          environment?: string | null
          field_mappings?: Json | null
          id?: string | null
          integration_type?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_tested_at?: string | null
          next_scheduled_sync?: string | null
          practice_id?: string | null
          rate_limit_requests?: number | null
          rate_limit_window_seconds?: number | null
          region?: string | null
          response_format?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          sync_schedule?: string | null
          test_status?: string | null
          timeout_ms?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      apify_clinics_public: {
        Row: {
          accepts_credit_cards: boolean | null
          additional_info: Json | null
          address: string | null
          amenities: Json | null
          appointments_recommended: boolean | null
          categories: Json | null
          city: string | null
          country: string | null
          description: string | null
          email: string | null
          google_maps_url: string | null
          google_place_id: string | null
          id: string | null
          image_url: string | null
          images_count: number | null
          is_claimed: boolean | null
          last_synced_at: string | null
          location: Json | null
          name: string | null
          opening_hours_detailed: Json | null
          operating_hours: Json | null
          parking_available: boolean | null
          permanently_closed: boolean | null
          phone: string | null
          rating: number | null
          reviews_count: number | null
          specializations: Json | null
          state: string | null
          temporarily_closed: boolean | null
          website: string | null
          wheelchair_accessible: boolean | null
          zip_code: string | null
        }
        Insert: {
          accepts_credit_cards?: boolean | null
          additional_info?: Json | null
          address?: string | null
          amenities?: Json | null
          appointments_recommended?: boolean | null
          categories?: Json | null
          city?: string | null
          country?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string | null
          image_url?: string | null
          images_count?: number | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          location?: Json | null
          name?: string | null
          opening_hours_detailed?: Json | null
          operating_hours?: Json | null
          parking_available?: boolean | null
          permanently_closed?: boolean | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          specializations?: Json | null
          state?: string | null
          temporarily_closed?: boolean | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Update: {
          accepts_credit_cards?: boolean | null
          additional_info?: Json | null
          address?: string | null
          amenities?: Json | null
          appointments_recommended?: boolean | null
          categories?: Json | null
          city?: string | null
          country?: string | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string | null
          image_url?: string | null
          images_count?: number | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          location?: Json | null
          name?: string | null
          opening_hours_detailed?: Json | null
          operating_hours?: Json | null
          parking_available?: boolean | null
          permanently_closed?: boolean | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          specializations?: Json | null
          state?: string | null
          temporarily_closed?: boolean | null
          website?: string | null
          wheelchair_accessible?: boolean | null
          zip_code?: string | null
        }
        Relationships: []
      }
      appointment_reminder_stats: {
        Row: {
          active_reminders: number | null
          avg_notifications_per_reminder: number | null
          expired_active: number | null
          future_reminders: number | null
          inactive_reminders: number | null
          reminders_with_errors: number | null
          total_notifications_sent: number | null
          unique_patients: number | null
        }
        Relationships: []
      }
      appointments_public: {
        Row: {
          appointment_date: string | null
          clinic_id: string | null
          current_bookings: number | null
          doctor_id: string | null
          end_time: string | null
          id: string | null
          is_emergency_slot: boolean | null
          max_bookings: number | null
          service_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          appointment_date?: string | null
          clinic_id?: string | null
          current_bookings?: number | null
          doctor_id?: string | null
          end_time?: string | null
          id?: string | null
          is_emergency_slot?: boolean | null
          max_bookings?: number | null
          service_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          appointment_date?: string | null
          clinic_id?: string | null
          current_bookings?: number | null
          doctor_id?: string | null
          end_time?: string | null
          id?: string | null
          is_emergency_slot?: boolean | null
          max_bookings?: number | null
          service_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_staff_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clinic_id: string | null
          department: string | null
          display_order: number | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          languages: Json | null
          last_name: string | null
          qualifications: Json | null
          role: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id?: string | null
          department?: string | null
          display_order?: number | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string | null
          qualifications?: Json | null
          role?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          clinic_id?: string | null
          department?: string | null
          display_order?: number | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string | null
          qualifications?: Json | null
          role?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics_public: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          amenities: Json | null
          bio: string | null
          city: string | null
          clinic_type: string | null
          custom_api_config_id: string | null
          custom_api_enabled: boolean | null
          description: string | null
          email: string | null
          established_year: number | null
          facilities: Json | null
          health_funds_accepted: Json | null
          id: string | null
          is_verified: boolean | null
          languages_spoken: Json | null
          logo_url: string | null
          mission_statement: string | null
          name: string | null
          operating_hours_detailed: Json | null
          phone: string | null
          profile_claimed: boolean | null
          specializations: Json | null
          state: string | null
          sub_type: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          amenities?: Json | null
          bio?: string | null
          city?: string | null
          clinic_type?: string | null
          custom_api_config_id?: string | null
          custom_api_enabled?: boolean | null
          description?: string | null
          email?: string | null
          established_year?: number | null
          facilities?: Json | null
          health_funds_accepted?: Json | null
          id?: string | null
          is_verified?: boolean | null
          languages_spoken?: Json | null
          logo_url?: string | null
          mission_statement?: string | null
          name?: string | null
          operating_hours_detailed?: Json | null
          phone?: string | null
          profile_claimed?: boolean | null
          specializations?: Json | null
          state?: string | null
          sub_type?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          amenities?: Json | null
          bio?: string | null
          city?: string | null
          clinic_type?: string | null
          custom_api_config_id?: string | null
          custom_api_enabled?: boolean | null
          description?: string | null
          email?: string | null
          established_year?: number | null
          facilities?: Json | null
          health_funds_accepted?: Json | null
          id?: string | null
          is_verified?: boolean | null
          languages_spoken?: Json | null
          logo_url?: string | null
          mission_statement?: string | null
          name?: string | null
          operating_hours_detailed?: Json | null
          phone?: string | null
          profile_claimed?: boolean | null
          specializations?: Json | null
          state?: string | null
          sub_type?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_custom_api_config_id_fkey"
            columns: ["custom_api_config_id"]
            isOneToOne: false
            referencedRelation: "api_configurations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors_public: {
        Row: {
          areas_of_interest: string | null
          avatar_url: string | null
          bio: string | null
          certifications: Json | null
          clinic_id: string | null
          consultation_fee: number | null
          created_at: string | null
          display_order: number | null
          education: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          languages: Json | null
          last_name: string | null
          license_number: string | null
          qualifications: Json | null
          specialty: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          areas_of_interest?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          clinic_id?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          display_order?: number | null
          education?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string | null
          license_number?: string | null
          qualifications?: Json | null
          specialty?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          areas_of_interest?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          clinic_id?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          display_order?: number | null
          education?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          languages?: Json | null
          last_name?: string | null
          license_number?: string | null
          qualifications?: Json | null
          specialty?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_analytics: {
        Row: {
          date: string | null
          expirations_count: number | null
          points_earned_count: number | null
          redemptions_count: number | null
          total_points_earned: number | null
          total_points_expired: number | null
          total_points_redeemed: number | null
        }
        Relationships: []
      }
      services_public: {
        Row: {
          clinic_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          is_online: boolean | null
          name: string | null
          price: number | null
        }
        Insert: {
          clinic_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_online?: boolean | null
          name?: string | null
          price?: number | null
        }
        Update: {
          clinic_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_online?: boolean | null
          name?: string | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_update_clinic_modules:
        | {
            Args: {
              p_bulk_import_enabled: boolean
              p_chat_enabled: boolean
              p_clinic_id: string
              p_emergency_slots_enabled: boolean
              p_quotes_enabled: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              p_bulk_import_enabled: boolean
              p_chat_enabled: boolean
              p_clinic_id: string
              p_emergency_slots_enabled: boolean
              p_patient_documents_enabled: boolean
              p_quotes_enabled: boolean
              p_referrals_enabled: boolean
            }
            Returns: undefined
          }
      atomic_book_appointment: {
        Args: { p_appointment_id: string; p_patient_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      award_loyalty_points:
        | {
            Args: {
              p_booking_id?: string
              p_description?: string
              p_points: number
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_booking_id?: string
              p_clinic_id?: string
              p_description?: string
              p_points: number
              p_user_id: string
            }
            Returns: undefined
          }
      can_initiate_chat: {
        Args: { p_clinic_id: string; p_patient_id: string }
        Returns: boolean
      }
      can_send_chat_message: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      cancel_appointment_slot: {
        Args: { p_appointment_id: string; p_booking_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      cleanup_old_appointments: {
        Args: never
        Returns: {
          clinic_type: string
          deleted_count: number
        }[]
      }
      create_predefined_gp_services_for_clinic: {
        Args: { p_clinic_id: string }
        Returns: undefined
      }
      create_predefined_services_for_clinic: {
        Args: { p_clinic_id: string }
        Returns: undefined
      }
      deactivate_expired_preferences: { Args: never; Returns: undefined }
      delete_api_configuration: {
        Args: { p_config_id: string; p_user_id: string }
        Returns: Json
      }
      delete_conversation_completely: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      delete_expired_chat_messages: { Args: never; Returns: number }
      execute_appointment_check_cron: { Args: never; Returns: undefined }
      expire_loyalty_points: {
        Args: never
        Returns: {
          expired_count: number
          total_points_expired: number
        }[]
      }
      get_active_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_available_points_for_clinic: {
        Args: { p_clinic_id: string; p_user_id: string }
        Returns: {
          clinic_points: number
          total_available: number
          universal_points: number
        }[]
      }
      get_clinic_owner_id: { Args: { p_clinic_id: string }; Returns: string }
      get_clinic_patient_info: {
        Args: { p_patient_id: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_clinic_user_role: {
        Args: { p_clinic_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["clinic_user_role"]
      }
      get_default_role_permissions: {
        Args: { p_role: Database["public"]["Enums"]["clinic_user_role"] }
        Returns: Json
      }
      get_doctor_appointment_coverage: {
        Args: { p_doctor_id: string }
        Returns: {
          booked_slots: number
          days_coverage: number
          latest_appointment_date: string
          total_slots: number
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted: boolean
          clinic_id: string
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          permissions: Json
          role: Database["public"]["Enums"]["clinic_user_role"]
        }[]
      }
      get_shared_documents_for_clinic: {
        Args: { clinic_id_param: string }
        Returns: {
          access_revoked: boolean
          document_id: string
          document_title: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          notes: string
          patient_first_name: string
          patient_id: string
          patient_last_name: string
          shared_at: string
        }[]
      }
      get_shared_documents_for_patient: {
        Args: { patient_id_param: string }
        Returns: {
          clinic_id: string
          clinic_logo_url: string
          clinic_name: string
          document_description: string
          document_id: string
          document_title: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          notes: string
          shared_at: string
        }[]
      }
      get_unread_chat_count: { Args: { p_user_id: string }; Returns: number }
      has_chat_access: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view_count: {
        Args: { p_slug: string }
        Returns: undefined
      }
      is_clinic_admin: {
        Args: { p_clinic_id: string; p_user_id: string }
        Returns: boolean
      }
      is_clinic_owner:
        | { Args: { p_clinic_id: string }; Returns: boolean }
        | { Args: { p_clinic_id: string; p_user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_error_message?: string
          p_resource_id?: string
          p_resource_type: string
          p_status?: string
          p_user_id: string
        }
        Returns: string
      }
      redeem_loyalty_points:
        | {
            Args: {
              p_booking_id: string
              p_description?: string
              p_points_to_redeem: number
              p_user_id: string
            }
            Returns: {
              discount_amount: number
              error_message: string
              success: boolean
            }[]
          }
        | {
            Args: {
              p_booking_id: string
              p_clinic_id?: string
              p_description?: string
              p_points_to_redeem: number
              p_user_id: string
            }
            Returns: {
              discount_amount: number
              error_message: string
              success: boolean
            }[]
          }
      regenerate_conversation_keys: {
        Args: {
          p_clinic_key: string
          p_conversation_id: string
          p_patient_key: string
        }
        Returns: undefined
      }
      update_api_configuration: {
        Args: { p_config_id: string; p_update_data: Json; p_user_id: string }
        Returns: Json
      }
      validate_custom_api_config: {
        Args: { config_data: Json }
        Returns: boolean
      }
      validate_time_slot: {
        Args: { p_duration: number; p_end_time: string; p_start_time: string }
        Returns: {
          error_message: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "clinic" | "patient"
      appointment_preference_status:
        | "active"
        | "notified"
        | "completed"
        | "cancelled"
      appointment_status:
        | "available"
        | "booked"
        | "completed"
        | "cancelled"
        | "no_show"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      centaur_booking_status: "confirmed" | "cancelled" | "completed"
      clinic_user_role: "owner" | "manager" | "staff" | "receptionist"
      loyalty_transaction_type:
        | "earned"
        | "redeemed"
        | "bonus"
        | "referral"
        | "expired"
        | "refunded"
      notification_status: "pending" | "sent" | "delivered" | "failed"
      notification_type: "email" | "sms" | "push"
      user_type: "patient" | "clinic" | "admin"
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
      app_role: ["admin", "clinic", "patient"],
      appointment_preference_status: [
        "active",
        "notified",
        "completed",
        "cancelled",
      ],
      appointment_status: [
        "available",
        "booked",
        "completed",
        "cancelled",
        "no_show",
      ],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      centaur_booking_status: ["confirmed", "cancelled", "completed"],
      clinic_user_role: ["owner", "manager", "staff", "receptionist"],
      loyalty_transaction_type: [
        "earned",
        "redeemed",
        "bonus",
        "referral",
        "expired",
        "refunded",
      ],
      notification_status: ["pending", "sent", "delivered", "failed"],
      notification_type: ["email", "sms", "push"],
      user_type: ["patient", "clinic", "admin"],
    },
  },
} as const

