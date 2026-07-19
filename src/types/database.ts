/**
 * Database types mirroring the Supabase schema (supabase/migrations/0001_init_schema.sql).
 * Regenerate with: `supabase gen types typescript --linked > src/types/database.ts`
 * Kept hand-written here so the project type-checks before the CLI is wired up.
 */

export type UserRole = "investor" | "contractor" | "wholesaler";
export type ProjectStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";
export type OfferStatus = "draft" | "sent" | "accepted" | "rejected";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "on_order";
export type OrgMemberRole = "owner" | "admin" | "manager" | "member";
export type ProjectTaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type AgentTaskStatus =
  | "idle"
  | "processing"
  | "completed"
  | "error"
  | "awaiting_review"
  | "blocked";
export type AgentMessageType = "request" | "response" | "notification";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          company_name: string | null;
          phone: string | null;
          city: string | null;
          logo_url: string | null;
          nip: string | null;
          company_address: string | null;
          website: string | null;
          bio: string | null;
          is_verified: boolean;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          city?: string | null;
          logo_url?: string | null;
          nip?: string | null;
          company_address?: string | null;
          website?: string | null;
          bio?: string | null;
          is_verified?: boolean;
          rating_avg?: number;
          rating_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          investor_id: string;
          contractor_id: string | null;
          title: string;
          address: string | null;
          surface_area: number | null;
          status: ProjectStatus;
          description: string | null;
          category: string | null;
          budget_min: number | null;
          budget_max: number | null;
          deadline: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          investor_id: string;
          contractor_id?: string | null;
          title: string;
          address?: string | null;
          surface_area?: number | null;
          status?: ProjectStatus;
          description?: string | null;
          category?: string | null;
          budget_min?: number | null;
          budget_max?: number | null;
          deadline?: string | null;
          published_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          project_id: string;
          contractor_id: string;
          title: string;
          total_net: number;
          total_gross: number;
          vat_rate: number;
          status: OfferStatus;
          public_token: string;
          sent_at: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          contractor_id: string;
          title: string;
          total_net?: number;
          total_gross?: number;
          vat_rate?: number;
          status?: OfferStatus;
          sent_at?: string | null;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>;
        Relationships: [];
      };
      offer_stages: {
        Row: {
          id: string;
          offer_id: string;
          stage_name: string;
          description: string | null;
          cost: number;
          order_index: number;
          group_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          stage_name: string;
          description?: string | null;
          cost?: number;
          order_index?: number;
          group_label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["offer_stages"]["Insert"]>;
        Relationships: [];
      };
      offer_materials: {
        Row: {
          id: string;
          offer_id: string;
          material_id: string;
          quantity: number;
          price_net: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          material_id: string;
          quantity?: number;
          price_net?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["offer_materials"]["Insert"]
        >;
        Relationships: [];
      };
      materials_catalog: {
        Row: {
          id: string;
          wholesaler_id: string;
          product_name: string;
          sku: string | null;
          price_net: number;
          unit: string;
          stock_status: StockStatus;
          supplier_id: string | null;
          external_id: string | null;
          currency: string;
          source: string;
          price_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wholesaler_id: string;
          product_name: string;
          sku?: string | null;
          price_net?: number;
          unit?: string;
          stock_status?: StockStatus;
          supplier_id?: string | null;
          external_id?: string | null;
          currency?: string;
          source?: string;
          price_updated_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["materials_catalog"]["Insert"]
        >;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          offer_id: string;
          wholesaler_id: string;
          status: OrderStatus;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          wholesaler_id: string;
          status?: OrderStatus;
          total_amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          website?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          wholesaler_id: string;
          supplier_id: string | null;
          filename: string | null;
          total_rows: number;
          created_count: number;
          updated_count: number;
          skipped_count: number;
          status: string;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wholesaler_id: string;
          supplier_id?: string | null;
          filename?: string | null;
          total_rows?: number;
          created_count?: number;
          updated_count?: number;
          skipped_count?: number;
          status?: string;
          error?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["import_jobs"]["Insert"]>;
        Relationships: [];
      };
      price_history: {
        Row: {
          id: string;
          material_id: string;
          wholesaler_id: string;
          price_net: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          wholesaler_id: string;
          price_net: number;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_history"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          project_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          kind: UserRole;
          logo_url: string | null;
          nip: string | null;
          address: string | null;
          website: string | null;
          bio: string | null;
          is_verified: boolean;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          kind?: UserRole;
          logo_url?: string | null;
          nip?: string | null;
          address?: string | null;
          website?: string | null;
          bio?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: OrgMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: OrgMemberRole;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_members"]["Insert"]
        >;
        Relationships: [];
      };
      organization_invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: OrgMemberRole;
          token: string;
          invited_by: string | null;
          status: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: OrgMemberRole;
          invited_by?: string | null;
          status?: string;
          accepted_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_invitations"]["Insert"]
        >;
        Relationships: [];
      };
      workers: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          full_name: string;
          specialty: string | null;
          hourly_rate: number | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string | null;
          full_name: string;
          specialty?: string | null;
          hourly_rate?: number | null;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["workers"]["Insert"]>;
        Relationships: [];
      };
      crews: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          foreman_worker_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          foreman_worker_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["crews"]["Insert"]>;
        Relationships: [];
      };
      crew_members: {
        Row: {
          id: string;
          crew_id: string;
          worker_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          worker_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["crew_members"]["Insert"]>;
        Relationships: [];
      };
      crew_assignments: {
        Row: {
          id: string;
          crew_id: string;
          project_id: string;
          start_date: string | null;
          end_date: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          project_id: string;
          start_date?: string | null;
          end_date?: string | null;
          note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["crew_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      project_tasks: {
        Row: {
          id: string;
          project_id: string;
          crew_id: string | null;
          title: string;
          description: string | null;
          status: ProjectTaskStatus;
          progress: number;
          order_index: number;
          start_date: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          crew_id?: string | null;
          title: string;
          description?: string | null;
          status?: ProjectTaskStatus;
          progress?: number;
          order_index?: number;
          start_date?: string | null;
          due_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["project_tasks"]["Insert"]>;
        Relationships: [];
      };
      project_updates: {
        Row: {
          id: string;
          project_id: string;
          author_id: string | null;
          note: string | null;
          progress: number | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          author_id?: string | null;
          note?: string | null;
          progress?: number | null;
          photo_url?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_updates"]["Insert"]
        >;
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          project_id: string;
          worker_id: string;
          crew_id: string | null;
          entry_date: string;
          hours: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          worker_id: string;
          crew_id?: string | null;
          entry_date?: string;
          hours: number;
          note?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["time_entries"]["Insert"]>;
        Relationships: [];
      };
      punch_items: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          photo_url: string | null;
          plan_x: number | null;
          plan_y: number | null;
          floor_plan_url: string | null;
          status: "open" | "in_progress" | "resolved";
          assigned_to: string | null;
          due_date: string | null;
          resolved_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          plan_x?: number | null;
          plan_y?: number | null;
          floor_plan_url?: string | null;
          status?: "open" | "in_progress" | "resolved";
          assigned_to?: string | null;
          due_date?: string | null;
          resolved_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["punch_items"]["Insert"]>;
        Relationships: [];
      };
      project_expenses: {
        Row: {
          id: string;
          project_id: string;
          category: string;
          amount: number;
          note: string | null;
          expense_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          category?: string;
          amount: number;
          note?: string | null;
          expense_date?: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_expenses"]["Insert"]
        >;
        Relationships: [];
      };
      cashflow_entries: {
        Row: {
          id: string;
          project_id: string | null;
          org_id: string;
          created_by: string | null;
          period_year: number;
          period_month: number;
          type: "inflow" | "outflow";
          category: string;
          description: string;
          planned_amount: number;
          actual_amount: number | null;
          is_confirmed: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          org_id: string;
          created_by?: string | null;
          period_year: number;
          period_month: number;
          type?: "inflow" | "outflow";
          category?: string;
          description: string;
          planned_amount?: number;
          actual_amount?: number | null;
          is_confirmed?: boolean;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["cashflow_entries"]["Insert"]
        >;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          project_id: string | null;
          org_id: string;
          created_by: string | null;
          invoice_number: string;
          direction: "incoming" | "outgoing";
          type: string;
          counterparty: string;
          nip: string | null;
          issue_date: string;
          sale_date: string | null;
          due_date: string | null;
          paid_date: string | null;
          net_amount: number;
          vat_rate: number;
          vat_amount: number;
          gross_amount: number;
          currency: string;
          status:
            | "draft"
            | "sent"
            | "unpaid"
            | "partially_paid"
            | "paid"
            | "overdue"
            | "cancelled";
          ksef_reference: string | null;
          payment_method: string | null;
          bank_account: string | null;
          description: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          org_id: string;
          created_by?: string | null;
          invoice_number: string;
          direction?: "incoming" | "outgoing";
          type?: string;
          counterparty: string;
          nip?: string | null;
          issue_date: string;
          sale_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          net_amount: number;
          vat_rate?: number;
          currency?: string;
          status?:
            | "draft"
            | "sent"
            | "unpaid"
            | "partially_paid"
            | "paid"
            | "overdue"
            | "cancelled";
          ksef_reference?: string | null;
          payment_method?: string | null;
          bank_account?: string | null;
          description?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      retention_payments: {
        Row: {
          id: string;
          project_id: string;
          org_id: string;
          created_by: string | null;
          title: string;
          description: string | null;
          party_name: string;
          direction: "held" | "paid_out";
          contract_value: number;
          retention_pct: number;
          retention_amount: number;
          release_condition: string | null;
          release_date: string | null;
          released_at: string | null;
          released_amount: number | null;
          status: "held" | "partially_released" | "released" | "disputed";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          org_id: string;
          created_by?: string | null;
          title: string;
          description?: string | null;
          party_name: string;
          direction?: "held" | "paid_out";
          contract_value: number;
          retention_pct?: number;
          release_condition?: string | null;
          release_date?: string | null;
          released_at?: string | null;
          released_amount?: number | null;
          status?: "held" | "partially_released" | "released" | "disputed";
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["retention_payments"]["Insert"]
        >;
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          capabilities: string[];
          dependencies: string[];
          priority: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          category: string;
          capabilities?: string[];
          dependencies?: string[];
          priority?: number;
        };
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>;
        Relationships: [];
      };
      agent_tasks: {
        Row: {
          id: string;
          agent_id: string;
          org_id: string | null;
          project_id: string | null;
          type: string;
          payload: unknown;
          status: AgentTaskStatus;
          result: unknown;
          error: string | null;
          branch: string | null;
          compare_url: string | null;
          worktree_path: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          org_id?: string | null;
          project_id?: string | null;
          type: string;
          payload?: unknown;
          status?: AgentTaskStatus;
          result?: unknown;
          error?: string | null;
          branch?: string | null;
          compare_url?: string | null;
          worktree_path?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["agent_tasks"]["Insert"]>;
        Relationships: [];
      };
      agent_messages: {
        Row: {
          id: string;
          from_agent: string;
          to_agent: string;
          type: AgentMessageType;
          payload: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_agent: string;
          to_agent: string;
          type?: AgentMessageType;
          payload?: unknown;
        };
        Update: Partial<
          Database["public"]["Tables"]["agent_messages"]["Insert"]
        >;
        Relationships: [];
      };
      cost_items: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: string;
          unit: string;
          labor_rate: number;
          material_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category: string;
          unit: string;
          labor_rate?: number;
          material_rate?: number;
        };
        Update: Partial<Database["public"]["Tables"]["cost_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      increment_views_count: {
        Args: { ad_id: string };
        Returns: void;
      };
      search_cost_items: {
        Args: { q: string; result_limit?: number };
        Returns: Database["public"]["Tables"]["cost_items"]["Row"][];
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      offer_status: OfferStatus;
      order_status: OrderStatus;
      stock_status: StockStatus;
    };
  };
}

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Offer = Database["public"]["Tables"]["offers"]["Row"];
export type OfferStage = Database["public"]["Tables"]["offer_stages"]["Row"];
export type OfferMaterial = Database["public"]["Tables"]["offer_materials"]["Row"];
export type Material = Database["public"]["Tables"]["materials_catalog"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type ImportJob = Database["public"]["Tables"]["import_jobs"]["Row"];
export type PriceHistory = Database["public"]["Tables"]["price_history"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type OrganizationInvitation =
  Database["public"]["Tables"]["organization_invitations"]["Row"];
export type Worker = Database["public"]["Tables"]["workers"]["Row"];
export type Crew = Database["public"]["Tables"]["crews"]["Row"];
export type CrewMember = Database["public"]["Tables"]["crew_members"]["Row"];
export type CrewAssignment =
  Database["public"]["Tables"]["crew_assignments"]["Row"];
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type ProjectExpense =
  Database["public"]["Tables"]["project_expenses"]["Row"];
export type ProjectTask = Database["public"]["Tables"]["project_tasks"]["Row"];
export type ProjectUpdate =
  Database["public"]["Tables"]["project_updates"]["Row"];
