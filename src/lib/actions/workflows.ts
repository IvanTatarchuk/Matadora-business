"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WorkflowTrigger = "manual" | "scheduled" | "event_based" | "webhook" | "condition";
export type WorkflowStepType = "action" | "condition" | "notification" | "approval" | "delay" | "integration";
export type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowDefinition = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  trigger_type: WorkflowTrigger;
  trigger_config: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  org_id: string;
  step_order: number;
  name: string;
  description: string | null;
  step_type: WorkflowStepType;
  step_config: Record<string, any>;
  depends_on: string[];
  created_at: string;
};

export type WorkflowExecution = {
  id: string;
  workflow_id: string;
  org_id: string;
  triggered_by: string | null;
  trigger_data: Record<string, any>;
  status: WorkflowStatus;
  current_step: number;
  completed_steps: string[];
  started_at: string;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  result: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createWorkflowDefinition(input: {
  name: string;
  description?: string;
  triggerType: WorkflowTrigger;
  triggerConfig: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("workflow_definitions").insert({
    org_id: member.org_id,
    name: input.name,
    description: input.description ?? null,
    trigger_type: input.triggerType,
    trigger_config: input.triggerConfig,
    is_active: true,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/workflows");
  return { ok: true, id: data.id };
}

export async function listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("workflow_definitions")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as WorkflowDefinition[];
}

export async function toggleWorkflow(workflowId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: workflow } = await db(supabase)
    .from("workflow_definitions")
    .select("is_active")
    .eq("id", workflowId)
    .single();

  if (!workflow) return { ok: false, error: "Workflow not found" };

  const { error } = await db(supabase)
    .from("workflow_definitions")
    .update({ is_active: !workflow.is_active })
    .eq("id", workflowId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/workflows");
  return { ok: true };
}

export async function createWorkflowStep(input: {
  workflowId: string;
  stepOrder: number;
  name: string;
  description?: string;
  stepType: WorkflowStepType;
  stepConfig: Record<string, any>;
  dependsOn?: string[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("workflow_steps").insert({
    workflow_id: input.workflowId,
    org_id: member.org_id,
    step_order: input.stepOrder,
    name: input.name,
    description: input.description ?? null,
    step_type: input.stepType,
    step_config: input.stepConfig,
    depends_on: input.dependsOn ?? [],
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/workflows");
  return { ok: true, id: data.id };
}

export async function listWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("step_order", { ascending: true });

  if (error) return [];
  return (data ?? []) as WorkflowStep[];
}

export async function triggerWorkflow(workflowId: string, triggerData?: Record<string, any>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("workflow_executions").insert({
    workflow_id: workflowId,
    org_id: member.org_id,
    triggered_by: user.id,
    trigger_data: triggerData ?? {},
    status: "running",
    current_step: 0,
    completed_steps: [],
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/workflows");
  return { ok: true, id: data.id };
}

export async function listWorkflowExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("workflow_executions")
    .select("*")
    .eq("org_id", member.org_id)
    .order("started_at", { ascending: false });

  if (workflowId) query = query.eq("workflow_id", workflowId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as WorkflowExecution[];
}

export async function getWorkflowStats(): Promise<{
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
}> {
  const workflows = await listWorkflowDefinitions();
  const executions = await listWorkflowExecutions();

  return {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter((w) => w.is_active).length,
    totalExecutions: executions.length,
    runningExecutions: executions.filter((e) => e.status === "running").length,
    completedExecutions: executions.filter((e) => e.status === "completed").length,
    failedExecutions: executions.filter((e) => e.status === "failed").length,
  };
}
