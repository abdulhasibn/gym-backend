export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      attendances: {
        Row: {
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          occurred_at: string;
          recorded_by: Database['public']['Enums']['attendance_recorder'];
          recorder_user_id: string;
        };
        Insert: {
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          occurred_at?: string;
          recorded_by: Database['public']['Enums']['attendance_recorder'];
          recorder_user_id: string;
        };
        Update: {
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          occurred_at?: string;
          recorded_by?: Database['public']['Enums']['attendance_recorder'];
          recorder_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendances_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendances_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendances_recorder_user_id_fkey';
            columns: ['recorder_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string;
          created_at: string;
          gym_org_id: string | null;
          id: string;
          metadata: Json | null;
          target_id: string;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          created_at?: string;
          gym_org_id?: string | null;
          id?: string;
          metadata?: Json | null;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          created_at?: string;
          gym_org_id?: string | null;
          id?: string;
          metadata?: Json | null;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey';
            columns: ['actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      calorie_log_entries: {
        Row: {
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          log_date: string;
          total_calories: number;
          total_carbs_g: number;
          total_fat_g: number;
          total_protein_g: number;
        };
        Insert: {
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          log_date: string;
          total_calories?: number;
          total_carbs_g?: number;
          total_fat_g?: number;
          total_protein_g?: number;
        };
        Update: {
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          log_date?: string;
          total_calories?: number;
          total_carbs_g?: number;
          total_fat_g?: number;
          total_protein_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'calorie_log_entries_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      calorie_log_items: {
        Row: {
          calorie_log_entry_id: string;
          calories: number;
          carbs_g: number | null;
          deleted_at: string | null;
          diet_plan_meal_item_id: string | null;
          fat_g: number | null;
          food_item_id: string;
          id: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          protein_g: number | null;
          quantity: number;
          serving_id: string;
        };
        Insert: {
          calorie_log_entry_id: string;
          calories: number;
          carbs_g?: number | null;
          deleted_at?: string | null;
          diet_plan_meal_item_id?: string | null;
          fat_g?: number | null;
          food_item_id: string;
          id?: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          protein_g?: number | null;
          quantity: number;
          serving_id: string;
        };
        Update: {
          calorie_log_entry_id?: string;
          calories?: number;
          carbs_g?: number | null;
          deleted_at?: string | null;
          diet_plan_meal_item_id?: string | null;
          fat_g?: number | null;
          food_item_id?: string;
          id?: string;
          meal_slot?: Database['public']['Enums']['meal_slot'];
          protein_g?: number | null;
          quantity?: number;
          serving_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calorie_log_items_calorie_log_entry_id_fkey';
            columns: ['calorie_log_entry_id'];
            isOneToOne: false;
            referencedRelation: 'calorie_log_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calorie_log_items_diet_plan_meal_item_id_fkey';
            columns: ['diet_plan_meal_item_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_meal_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calorie_log_items_food_item_id_fkey';
            columns: ['food_item_id'];
            isOneToOne: false;
            referencedRelation: 'food_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calorie_log_items_serving_id_fkey';
            columns: ['serving_id'];
            isOneToOne: false;
            referencedRelation: 'food_item_servings';
            referencedColumns: ['id'];
          },
        ];
      };
      client_memberships: {
        Row: {
          assigned_trainer_id: string | null;
          check_in_blocked: boolean;
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          source_invite_id: string | null;
          status: Database['public']['Enums']['membership_status'];
          updated_at: string;
        };
        Insert: {
          assigned_trainer_id?: string | null;
          check_in_blocked?: boolean;
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          joined_at: string;
          left_at?: string | null;
          source_invite_id?: string | null;
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
        };
        Update: {
          assigned_trainer_id?: string | null;
          check_in_blocked?: boolean;
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          source_invite_id?: string | null;
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_memberships_assigned_trainer_id_fkey';
            columns: ['assigned_trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainer_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_memberships_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_memberships_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_memberships_source_invite_id_fkey';
            columns: ['source_invite_id'];
            isOneToOne: false;
            referencedRelation: 'membership_invites';
            referencedColumns: ['id'];
          },
        ];
      };
      client_profiles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          dob: string | null;
          gender: Database['public']['Enums']['gender'] | null;
          height_cm: number | null;
          medical_notes: string | null;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          dob?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          height_cm?: number | null;
          medical_notes?: string | null;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          dob?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          height_cm?: number | null;
          medical_notes?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      data_grants: {
        Row: {
          class: Database['public']['Enums']['data_grant_class'];
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
        };
        Insert: {
          class: Database['public']['Enums']['data_grant_class'];
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
        };
        Update: {
          class?: Database['public']['Enums']['data_grant_class'];
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'data_grants_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_grants_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plan_meal_items: {
        Row: {
          deleted_at: string | null;
          diet_plan_meal_id: string;
          food_item_id: string;
          id: string;
          quantity: number;
          serving_id: string;
        };
        Insert: {
          deleted_at?: string | null;
          diet_plan_meal_id: string;
          food_item_id: string;
          id?: string;
          quantity: number;
          serving_id: string;
        };
        Update: {
          deleted_at?: string | null;
          diet_plan_meal_id?: string;
          food_item_id?: string;
          id?: string;
          quantity?: number;
          serving_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plan_meal_items_diet_plan_meal_id_fkey';
            columns: ['diet_plan_meal_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_meals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_meal_items_food_item_id_fkey';
            columns: ['food_item_id'];
            isOneToOne: false;
            referencedRelation: 'food_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_meal_items_serving_id_fkey';
            columns: ['serving_id'];
            isOneToOne: false;
            referencedRelation: 'food_item_servings';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plan_meals: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          diet_plan_id: string;
          id: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          sort_order: number;
          target_calories: number | null;
          target_carbs_g: number | null;
          target_fat_g: number | null;
          target_protein_g: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          diet_plan_id: string;
          id?: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          sort_order?: number;
          target_calories?: number | null;
          target_carbs_g?: number | null;
          target_fat_g?: number | null;
          target_protein_g?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          diet_plan_id?: string;
          id?: string;
          meal_slot?: Database['public']['Enums']['meal_slot'];
          sort_order?: number;
          target_calories?: number | null;
          target_carbs_g?: number | null;
          target_fat_g?: number | null;
          target_protein_g?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plan_meals_diet_plan_id_fkey';
            columns: ['diet_plan_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plan_template_meal_items: {
        Row: {
          deleted_at: string | null;
          diet_plan_template_meal_id: string;
          food_item_id: string;
          id: string;
          quantity: number;
          serving_id: string;
        };
        Insert: {
          deleted_at?: string | null;
          diet_plan_template_meal_id: string;
          food_item_id: string;
          id?: string;
          quantity: number;
          serving_id: string;
        };
        Update: {
          deleted_at?: string | null;
          diet_plan_template_meal_id?: string;
          food_item_id?: string;
          id?: string;
          quantity?: number;
          serving_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plan_template_meal_items_diet_plan_template_meal_id_fkey';
            columns: ['diet_plan_template_meal_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_template_meals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_template_meal_items_food_item_id_fkey';
            columns: ['food_item_id'];
            isOneToOne: false;
            referencedRelation: 'food_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_template_meal_items_serving_id_fkey';
            columns: ['serving_id'];
            isOneToOne: false;
            referencedRelation: 'food_item_servings';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plan_template_meals: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          diet_plan_template_id: string;
          id: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          diet_plan_template_id: string;
          id?: string;
          meal_slot: Database['public']['Enums']['meal_slot'];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          diet_plan_template_id?: string;
          id?: string;
          meal_slot?: Database['public']['Enums']['meal_slot'];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plan_template_meals_diet_plan_template_id_fkey';
            columns: ['diet_plan_template_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plan_templates: {
        Row: {
          cloned_from_id: string | null;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          notes: string | null;
          title: string;
          trainer_id: string;
          updated_at: string;
        };
        Insert: {
          cloned_from_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          notes?: string | null;
          title: string;
          trainer_id: string;
          updated_at?: string;
        };
        Update: {
          cloned_from_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          notes?: string | null;
          title?: string;
          trainer_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plan_templates_cloned_from_id_fkey';
            columns: ['cloned_from_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_templates_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plan_templates_trainer_id_fkey';
            columns: ['trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_plans: {
        Row: {
          client_user_id: string;
          cloned_from_id: string | null;
          cloned_from_template_id: string | null;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          notes: string | null;
          status: Database['public']['Enums']['coaching_plan_status'];
          title: string;
          trainer_id: string;
          updated_at: string;
        };
        Insert: {
          client_user_id: string;
          cloned_from_id?: string | null;
          cloned_from_template_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['coaching_plan_status'];
          title: string;
          trainer_id: string;
          updated_at?: string;
        };
        Update: {
          client_user_id?: string;
          cloned_from_id?: string | null;
          cloned_from_template_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['coaching_plan_status'];
          title?: string;
          trainer_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diet_plans_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plans_cloned_from_id_fkey';
            columns: ['cloned_from_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plans_cloned_from_template_id_fkey';
            columns: ['cloned_from_template_id'];
            isOneToOne: false;
            referencedRelation: 'diet_plan_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plans_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diet_plans_trainer_id_fkey';
            columns: ['trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_items: {
        Row: {
          active: boolean;
          aliases: string[] | null;
          created_at: string;
          created_by_user_id: string | null;
          deleted_at: string | null;
          equipment: Database['public']['Enums']['exercise_equipment'];
          gym_org_id: string | null;
          id: string;
          measurement: Database['public']['Enums']['exercise_measurement'];
          name: string;
          primary_muscle: Database['public']['Enums']['exercise_muscle'];
          source: Database['public']['Enums']['exercise_source'];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          aliases?: string[] | null;
          created_at?: string;
          created_by_user_id?: string | null;
          deleted_at?: string | null;
          equipment: Database['public']['Enums']['exercise_equipment'];
          gym_org_id?: string | null;
          id?: string;
          measurement: Database['public']['Enums']['exercise_measurement'];
          name: string;
          primary_muscle: Database['public']['Enums']['exercise_muscle'];
          source?: Database['public']['Enums']['exercise_source'];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          aliases?: string[] | null;
          created_at?: string;
          created_by_user_id?: string | null;
          deleted_at?: string | null;
          equipment?: Database['public']['Enums']['exercise_equipment'];
          gym_org_id?: string | null;
          id?: string;
          measurement?: Database['public']['Enums']['exercise_measurement'];
          name?: string;
          primary_muscle?: Database['public']['Enums']['exercise_muscle'];
          source?: Database['public']['Enums']['exercise_source'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_items_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercise_items_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      food_item_servings: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          food_item_id: string;
          grams: number;
          id: string;
          is_default: boolean;
          label: string;
          sort_order: number;
          unit: Database['public']['Enums']['food_serving_unit'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          food_item_id: string;
          grams: number;
          id?: string;
          is_default?: boolean;
          label: string;
          sort_order?: number;
          unit: Database['public']['Enums']['food_serving_unit'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          food_item_id?: string;
          grams?: number;
          id?: string;
          is_default?: boolean;
          label?: string;
          sort_order?: number;
          unit?: Database['public']['Enums']['food_serving_unit'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_item_servings_food_item_id_fkey';
            columns: ['food_item_id'];
            isOneToOne: false;
            referencedRelation: 'food_items';
            referencedColumns: ['id'];
          },
        ];
      };
      food_items: {
        Row: {
          active: boolean;
          aliases: string[] | null;
          calories: number;
          carbs_g: number | null;
          created_at: string;
          created_by_user_id: string | null;
          deleted_at: string | null;
          fat_g: number | null;
          gym_org_id: string | null;
          id: string;
          name: string;
          protein_g: number | null;
          source: Database['public']['Enums']['food_source'];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          aliases?: string[] | null;
          calories: number;
          carbs_g?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          deleted_at?: string | null;
          fat_g?: number | null;
          gym_org_id?: string | null;
          id?: string;
          name: string;
          protein_g?: number | null;
          source?: Database['public']['Enums']['food_source'];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          aliases?: string[] | null;
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          deleted_at?: string | null;
          fat_g?: number | null;
          gym_org_id?: string | null;
          id?: string;
          name?: string;
          protein_g?: number | null;
          source?: Database['public']['Enums']['food_source'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_items_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_items_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      gym_admins: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          is_owner: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          is_owner?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          is_owner?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gym_admins_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gym_admins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      gym_orgs: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          owner_user_id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_user_id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_user_id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gym_orgs_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          converted_membership_invite_id: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          email: string | null;
          follow_up_date: string | null;
          gym_org_id: string;
          id: string;
          interest: string | null;
          name: string;
          notes: string | null;
          phone: string;
          source: string | null;
          status: Database['public']['Enums']['lead_status'];
          updated_at: string;
        };
        Insert: {
          converted_membership_invite_id?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          email?: string | null;
          follow_up_date?: string | null;
          gym_org_id: string;
          id?: string;
          interest?: string | null;
          name: string;
          notes?: string | null;
          phone: string;
          source?: string | null;
          status?: Database['public']['Enums']['lead_status'];
          updated_at?: string;
        };
        Update: {
          converted_membership_invite_id?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          email?: string | null;
          follow_up_date?: string | null;
          gym_org_id?: string;
          id?: string;
          interest?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string;
          source?: string | null;
          status?: Database['public']['Enums']['lead_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_converted_membership_invite_id_fkey';
            columns: ['converted_membership_invite_id'];
            isOneToOne: false;
            referencedRelation: 'membership_invites';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      membership_invites: {
        Row: {
          accepted_at: string | null;
          accepted_membership_id: string | null;
          addon_payment_status: Database['public']['Enums']['payment_status'] | null;
          addon_plan_id: string | null;
          base_payment_status: Database['public']['Enums']['payment_status'];
          base_plan_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expires_at: string | null;
          gym_org_id: string;
          id: string;
          invited_email: string;
          invited_user_id: string | null;
          invitee_name: string;
          invitee_phone: string | null;
          status: Database['public']['Enums']['invite_status'];
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_membership_id?: string | null;
          addon_payment_status?: Database['public']['Enums']['payment_status'] | null;
          addon_plan_id?: string | null;
          base_payment_status?: Database['public']['Enums']['payment_status'];
          base_plan_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          gym_org_id: string;
          id?: string;
          invited_email: string;
          invited_user_id?: string | null;
          invitee_name: string;
          invitee_phone?: string | null;
          status?: Database['public']['Enums']['invite_status'];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_membership_id?: string | null;
          addon_payment_status?: Database['public']['Enums']['payment_status'] | null;
          addon_plan_id?: string | null;
          base_payment_status?: Database['public']['Enums']['payment_status'];
          base_plan_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          gym_org_id?: string;
          id?: string;
          invited_email?: string;
          invited_user_id?: string | null;
          invitee_name?: string;
          invitee_phone?: string | null;
          status?: Database['public']['Enums']['invite_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'membership_invites_accepted_membership_id_fkey';
            columns: ['accepted_membership_id'];
            isOneToOne: false;
            referencedRelation: 'client_memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_invites_addon_plan_id_fkey';
            columns: ['addon_plan_id'];
            isOneToOne: false;
            referencedRelation: 'membership_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_invites_base_plan_id_fkey';
            columns: ['base_plan_id'];
            isOneToOne: false;
            referencedRelation: 'membership_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_invites_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_invites_invited_user_id_fkey';
            columns: ['invited_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      membership_plans: {
        Row: {
          active: boolean;
          capability: Database['public']['Enums']['plan_capability'] | null;
          created_at: string;
          deleted_at: string | null;
          duration_days: number;
          gym_org_id: string;
          id: string;
          kind: Database['public']['Enums']['plan_kind'];
          name: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          capability?: Database['public']['Enums']['plan_capability'] | null;
          created_at?: string;
          deleted_at?: string | null;
          duration_days: number;
          gym_org_id: string;
          id?: string;
          kind: Database['public']['Enums']['plan_kind'];
          name: string;
          price: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          capability?: Database['public']['Enums']['plan_capability'] | null;
          created_at?: string;
          deleted_at?: string | null;
          duration_days?: number;
          gym_org_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['plan_kind'];
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'membership_plans_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json | null;
          deleted_at: string | null;
          gym_org_id: string | null;
          id: string;
          read_at: string | null;
          recipient_user_id: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json | null;
          deleted_at?: string | null;
          gym_org_id?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_user_id: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json | null;
          deleted_at?: string | null;
          gym_org_id?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_user_id?: string;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_user_id_fkey';
            columns: ['recipient_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_attribute_grants: {
        Row: {
          attribute: Database['public']['Enums']['profile_attribute'];
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
        };
        Insert: {
          attribute: Database['public']['Enums']['profile_attribute'];
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
        };
        Update: {
          attribute?: Database['public']['Enums']['profile_attribute'];
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_attribute_grants_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_attribute_grants_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      progress_logs: {
        Row: {
          bmi: number | null;
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          log_date: string;
          notes: string | null;
          weight_kg: number | null;
        };
        Insert: {
          bmi?: number | null;
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          log_date: string;
          notes?: string | null;
          weight_kg?: number | null;
        };
        Update: {
          bmi?: number | null;
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          log_date?: string;
          notes?: string | null;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_logs_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          id: string;
          permission_code: string;
          role_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          permission_code: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          permission_code?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          lane: Database['public']['Enums']['account_lane'];
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          lane: Database['public']['Enums']['account_lane'];
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          lane?: Database['public']['Enums']['account_lane'];
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      staff_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expires_at: string | null;
          gym_org_id: string;
          id: string;
          invited_user_id: string;
          status: Database['public']['Enums']['invite_status'];
          target_role: Database['public']['Enums']['staff_invite_target_role'];
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          gym_org_id: string;
          id?: string;
          invited_user_id: string;
          status?: Database['public']['Enums']['invite_status'];
          target_role: Database['public']['Enums']['staff_invite_target_role'];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          gym_org_id?: string;
          id?: string;
          invited_user_id?: string;
          status?: Database['public']['Enums']['invite_status'];
          target_role?: Database['public']['Enums']['staff_invite_target_role'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_invites_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_invites_invited_user_id_fkey';
            columns: ['invited_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          amount_paid: number;
          capability: Database['public']['Enums']['plan_capability'] | null;
          client_membership_id: string;
          created_at: string;
          deleted_at: string | null;
          duration_days: number;
          end_date: string | null;
          gym_org_id: string;
          id: string;
          kind: Database['public']['Enums']['plan_kind'];
          overlap_key: string;
          payment_status: Database['public']['Enums']['payment_status'];
          plan_id: string;
          price_amount: number;
          start_date: string | null;
          start_source: Database['public']['Enums']['subscription_start_source'] | null;
          updated_at: string;
        };
        Insert: {
          amount_paid?: number;
          capability?: Database['public']['Enums']['plan_capability'] | null;
          client_membership_id: string;
          created_at?: string;
          deleted_at?: string | null;
          duration_days: number;
          end_date?: string | null;
          gym_org_id: string;
          id?: string;
          kind: Database['public']['Enums']['plan_kind'];
          overlap_key?: string;
          payment_status?: Database['public']['Enums']['payment_status'];
          plan_id: string;
          price_amount: number;
          start_date?: string | null;
          start_source?: Database['public']['Enums']['subscription_start_source'] | null;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          capability?: Database['public']['Enums']['plan_capability'] | null;
          client_membership_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          duration_days?: number;
          end_date?: string | null;
          gym_org_id?: string;
          id?: string;
          kind?: Database['public']['Enums']['plan_kind'];
          overlap_key?: string;
          payment_status?: Database['public']['Enums']['payment_status'];
          plan_id?: string;
          price_amount?: number;
          start_date?: string | null;
          start_source?: Database['public']['Enums']['subscription_start_source'] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_client_membership_id_fkey';
            columns: ['client_membership_id'];
            isOneToOne: false;
            referencedRelation: 'client_memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'membership_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      trainer_profiles: {
        Row: {
          bio: string | null;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trainer_profiles_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trainer_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          email_verified_at: string | null;
          google_id: string | null;
          id: string;
          name: string;
          phone: string | null;
          role_id: string;
          staff_code: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          email_verified_at?: string | null;
          google_id?: string | null;
          id: string;
          name: string;
          phone?: string | null;
          role_id: string;
          staff_code?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          email_verified_at?: string | null;
          google_id?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          role_id?: string;
          staff_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      wearable_connections: {
        Row: {
          active: boolean;
          auth_ref: Json | null;
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          last_synced_at: string | null;
          provider: Database['public']['Enums']['wearable_provider'];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          auth_ref?: Json | null;
          client_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          last_synced_at?: string | null;
          provider: Database['public']['Enums']['wearable_provider'];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          auth_ref?: Json | null;
          client_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          last_synced_at?: string | null;
          provider?: Database['public']['Enums']['wearable_provider'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wearable_connections_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      wearable_daily_metrics: {
        Row: {
          active_kcal: number | null;
          client_user_id: string;
          id: string;
          ingested_at: string;
          metric_on: string;
          provider: Database['public']['Enums']['wearable_provider'];
          steps: number | null;
          weight_kg: number | null;
          workout_minutes: number | null;
        };
        Insert: {
          active_kcal?: number | null;
          client_user_id: string;
          id?: string;
          ingested_at?: string;
          metric_on: string;
          provider: Database['public']['Enums']['wearable_provider'];
          steps?: number | null;
          weight_kg?: number | null;
          workout_minutes?: number | null;
        };
        Update: {
          active_kcal?: number | null;
          client_user_id?: string;
          id?: string;
          ingested_at?: string;
          metric_on?: string;
          provider?: Database['public']['Enums']['wearable_provider'];
          steps?: number | null;
          weight_kg?: number | null;
          workout_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wearable_daily_metrics_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_plan_days: {
        Row: {
          created_at: string;
          day_label: string;
          deleted_at: string | null;
          id: string;
          sort_order: number;
          updated_at: string;
          workout_plan_id: string;
        };
        Insert: {
          created_at?: string;
          day_label: string;
          deleted_at?: string | null;
          id?: string;
          sort_order?: number;
          updated_at?: string;
          workout_plan_id: string;
        };
        Update: {
          created_at?: string;
          day_label?: string;
          deleted_at?: string | null;
          id?: string;
          sort_order?: number;
          updated_at?: string;
          workout_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_plan_days_workout_plan_id_fkey';
            columns: ['workout_plan_id'];
            isOneToOne: false;
            referencedRelation: 'workout_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_plan_exercise_completions: {
        Row: {
          client_user_id: string;
          completed_on: string;
          created_at: string;
          id: string;
          workout_plan_exercise_id: string;
        };
        Insert: {
          client_user_id: string;
          completed_on: string;
          created_at?: string;
          id?: string;
          workout_plan_exercise_id: string;
        };
        Update: {
          client_user_id?: string;
          completed_on?: string;
          created_at?: string;
          id?: string;
          workout_plan_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_plan_exercise_completions_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_plan_exercise_completions_workout_plan_exercise_id_fkey';
            columns: ['workout_plan_exercise_id'];
            isOneToOne: false;
            referencedRelation: 'workout_plan_exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_plan_exercises: {
        Row: {
          deleted_at: string | null;
          exercise_item_id: string;
          id: string;
          notes: string | null;
          reps: string | null;
          sets: number | null;
          sort_order: number;
          workout_plan_day_id: string;
        };
        Insert: {
          deleted_at?: string | null;
          exercise_item_id: string;
          id?: string;
          notes?: string | null;
          reps?: string | null;
          sets?: number | null;
          sort_order?: number;
          workout_plan_day_id: string;
        };
        Update: {
          deleted_at?: string | null;
          exercise_item_id?: string;
          id?: string;
          notes?: string | null;
          reps?: string | null;
          sets?: number | null;
          sort_order?: number;
          workout_plan_day_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_plan_exercises_exercise_item_id_fkey';
            columns: ['exercise_item_id'];
            isOneToOne: false;
            referencedRelation: 'exercise_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_plan_exercises_workout_plan_day_id_fkey';
            columns: ['workout_plan_day_id'];
            isOneToOne: false;
            referencedRelation: 'workout_plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_plans: {
        Row: {
          client_user_id: string;
          cloned_from_id: string | null;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          notes: string | null;
          status: Database['public']['Enums']['coaching_plan_status'];
          title: string;
          trainer_id: string;
          updated_at: string;
        };
        Insert: {
          client_user_id: string;
          cloned_from_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['coaching_plan_status'];
          title: string;
          trainer_id: string;
          updated_at?: string;
        };
        Update: {
          client_user_id?: string;
          cloned_from_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          gym_org_id?: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['coaching_plan_status'];
          title?: string;
          trainer_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_plans_client_user_id_fkey';
            columns: ['client_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_plans_cloned_from_id_fkey';
            columns: ['cloned_from_id'];
            isOneToOne: false;
            referencedRelation: 'workout_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_plans_gym_org_id_fkey';
            columns: ['gym_org_id'];
            isOneToOne: false;
            referencedRelation: 'gym_orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_plans_trainer_id_fkey';
            columns: ['trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_membership_invite: {
        Args: {
          p_invite_id: string;
          p_optional_class_grants?: Database['public']['Enums']['data_grant_class'][];
          p_optional_profile_attributes?: Database['public']['Enums']['profile_attribute'][];
          p_user_id: string;
        };
        Returns: {
          accepted_at: string | null;
          accepted_membership_id: string | null;
          addon_payment_status: Database['public']['Enums']['payment_status'] | null;
          addon_plan_id: string | null;
          base_payment_status: Database['public']['Enums']['payment_status'];
          base_plan_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expires_at: string | null;
          gym_org_id: string;
          id: string;
          invited_email: string;
          invited_user_id: string | null;
          invitee_name: string;
          invitee_phone: string | null;
          status: Database['public']['Enums']['invite_status'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'membership_invites';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      accept_staff_invite: {
        Args: { p_invite_id: string; p_user_id: string };
        Returns: {
          accepted_at: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expires_at: string | null;
          gym_org_id: string;
          id: string;
          invited_user_id: string;
          status: Database['public']['Enums']['invite_status'];
          target_role: Database['public']['Enums']['staff_invite_target_role'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'staff_invites';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_owned_gym_org: {
        Args: {
          p_address?: string;
          p_contact_email?: string;
          p_contact_phone?: string;
          p_logo_url?: string;
          p_name: string;
          p_owner_user_id: string;
          p_timezone?: string;
        };
        Returns: {
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          owner_user_id: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'gym_orgs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      offboard_client_membership: {
        Args: { p_gym_org_id: string; p_membership_id: string; p_now?: string };
        Returns: {
          assigned_trainer_id: string | null;
          check_in_blocked: boolean;
          client_user_id: string;
          created_at: string;
          deleted_at: string | null;
          gym_org_id: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          source_invite_id: string | null;
          status: Database['public']['Enums']['membership_status'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'client_memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      account_lane: 'CLIENT' | 'STAFF';
      attendance_recorder: 'CLIENT' | 'ADMIN';
      coaching_plan_status: 'ACTIVE' | 'ARCHIVED';
      data_grant_class: 'PROGRESS' | 'CALORIES' | 'WEARABLES' | 'DIET_PLANS' | 'WORKOUT_PLANS';
      exercise_equipment:
        | 'BARBELL'
        | 'DUMBBELL'
        | 'MACHINE'
        | 'CABLE'
        | 'BODYWEIGHT'
        | 'KETTLEBELL'
        | 'BAND'
        | 'OTHER';
      exercise_measurement: 'WEIGHT_REPS' | 'REPS_ONLY' | 'DURATION' | 'BODYWEIGHT_ASSISTED';
      exercise_muscle:
        | 'CHEST'
        | 'LATS'
        | 'UPPER_BACK'
        | 'LOWER_BACK'
        | 'SHOULDERS'
        | 'BICEPS'
        | 'TRICEPS'
        | 'QUADS'
        | 'HAMSTRINGS'
        | 'GLUTES'
        | 'CALVES'
        | 'CORE'
        | 'FULL_BODY'
        | 'CARDIO'
        | 'OTHER';
      exercise_source: 'seed' | 'manual';
      food_serving_unit: 'G' | 'ML' | 'PIECE' | 'KATORI' | 'CUP' | 'GLASS' | 'TBSP' | 'TSP';
      food_source: 'seed' | 'manual';
      gender: 'MALE' | 'FEMALE' | 'OTHER';
      invite_status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
      lead_status: 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';
      meal_slot: 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'EVENING_SNACK' | 'DINNER';
      membership_status: 'ACTIVE' | 'INACTIVE';
      notification_type:
        | 'SUBSCRIPTION_EXPIRING'
        | 'PAYMENT_PENDING_DIGEST'
        | 'TRAINER_ASSIGNED'
        | 'TRAINER_REASSIGNED'
        | 'PLAN_ASSIGNED'
        | 'INVITE_PENDING_CLAIM'
        | 'STAFF_INVITE_PENDING'
        | 'LEAD_FOLLOWUP_DUE'
        | 'CHECKIN_BLOCKED'
        | 'CHECKIN_UNBLOCKED';
      payment_status: 'paid' | 'unpaid' | 'partial';
      plan_capability: 'TRAINER_COACHING';
      plan_kind: 'BASE' | 'ADDON';
      profile_attribute: 'DOB' | 'HEIGHT' | 'WEIGHT' | 'GENDER' | 'MEDICAL_NOTES';
      staff_invite_target_role: 'TRAINER' | 'ADMIN';
      subscription_start_source: 'FIRST_ATTENDANCE' | 'ADMIN_OVERRIDE' | 'ADMIN_ATTACH';
      wearable_provider: 'APPLE_HEALTH' | 'HEALTH_CONNECT' | 'SAMSUNG_HEALTH';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_lane: ['CLIENT', 'STAFF'],
      attendance_recorder: ['CLIENT', 'ADMIN'],
      coaching_plan_status: ['ACTIVE', 'ARCHIVED'],
      data_grant_class: ['PROGRESS', 'CALORIES', 'WEARABLES', 'DIET_PLANS', 'WORKOUT_PLANS'],
      exercise_equipment: [
        'BARBELL',
        'DUMBBELL',
        'MACHINE',
        'CABLE',
        'BODYWEIGHT',
        'KETTLEBELL',
        'BAND',
        'OTHER',
      ],
      exercise_measurement: ['WEIGHT_REPS', 'REPS_ONLY', 'DURATION', 'BODYWEIGHT_ASSISTED'],
      exercise_muscle: [
        'CHEST',
        'LATS',
        'UPPER_BACK',
        'LOWER_BACK',
        'SHOULDERS',
        'BICEPS',
        'TRICEPS',
        'QUADS',
        'HAMSTRINGS',
        'GLUTES',
        'CALVES',
        'CORE',
        'FULL_BODY',
        'CARDIO',
        'OTHER',
      ],
      exercise_source: ['seed', 'manual'],
      food_serving_unit: ['G', 'ML', 'PIECE', 'KATORI', 'CUP', 'GLASS', 'TBSP', 'TSP'],
      food_source: ['seed', 'manual'],
      gender: ['MALE', 'FEMALE', 'OTHER'],
      invite_status: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'],
      lead_status: ['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST'],
      meal_slot: ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'EVENING_SNACK', 'DINNER'],
      membership_status: ['ACTIVE', 'INACTIVE'],
      notification_type: [
        'SUBSCRIPTION_EXPIRING',
        'PAYMENT_PENDING_DIGEST',
        'TRAINER_ASSIGNED',
        'TRAINER_REASSIGNED',
        'PLAN_ASSIGNED',
        'INVITE_PENDING_CLAIM',
        'STAFF_INVITE_PENDING',
        'LEAD_FOLLOWUP_DUE',
        'CHECKIN_BLOCKED',
        'CHECKIN_UNBLOCKED',
      ],
      payment_status: ['paid', 'unpaid', 'partial'],
      plan_capability: ['TRAINER_COACHING'],
      plan_kind: ['BASE', 'ADDON'],
      profile_attribute: ['DOB', 'HEIGHT', 'WEIGHT', 'GENDER', 'MEDICAL_NOTES'],
      staff_invite_target_role: ['TRAINER', 'ADMIN'],
      subscription_start_source: ['FIRST_ATTENDANCE', 'ADMIN_OVERRIDE', 'ADMIN_ATTACH'],
      wearable_provider: ['APPLE_HEALTH', 'HEALTH_CONNECT', 'SAMSUNG_HEALTH'],
    },
  },
} as const;
