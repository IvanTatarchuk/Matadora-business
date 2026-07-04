import { createAdminClient } from "@/lib/supabase/admin";
import { AgentConfig, AgentMessage, AgentTask, AgentStatus } from "@/lib/constants/subcontractors";

/**
 * Orchestrator Agent - Головний агент мультиагентної системи
 * Керує всіма іншими агентами, розподіляє завдання та координує роботу
 *
 * Стан (черга завдань, реєстр агентів, message bus) зберігається в Supabase
 * (public.agents / public.agent_tasks / public.agent_messages), а не в
 * пам'яті процесу — Vercel serverless-функції не гарантують, що наступний
 * запит потрапить на той самий "теплий" інстанс, тому in-memory Map/масив
 * тут не працює надійно між викликами.
 */
export class OrchestratorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "orchestrator",
      name: "Orchestrator Agent",
      description: "Головний агент, який керує всіма іншими агентами та координує їх роботу",
      category: "orchestration",
      capabilities: [
        "task_distribution",
        "agent_coordination",
        "message_routing",
        "error_handling",
        "priority_management",
        "dependency_resolution",
      ],
      dependencies: [],
      priority: 100,
    };
  }

  private db() {
    return createAdminClient();
  }

  /**
   * Реєструє агент у Supabase (upsert — повторна реєстрація оновлює метадані).
   */
  async registerAgent(agent: AgentConfig): Promise<void> {
    const { error } = await this.db()
      .from("agents")
      .upsert({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        capabilities: agent.capabilities,
        dependencies: agent.dependencies,
        priority: agent.priority,
      });
    if (error) throw error;
  }

  /**
   * Отримує конфігурацію агента по ID.
   */
  async getAgent(id: string): Promise<AgentConfig | undefined> {
    const { data } = await this.db().from("agents").select("*").eq("id", id).maybeSingle();
    if (!data) return undefined;
    return this.rowToConfig(data);
  }

  /**
   * Отримує всі зареєстровані агенти.
   */
  async getAllAgents(): Promise<AgentConfig[]> {
    const { data, error } = await this.db().from("agents").select("*");
    if (error) throw error;
    return (data ?? []).map(this.rowToConfig);
  }

  /**
   * Отримує агенти за категорією.
   */
  async getAgentsByCategory(category: string): Promise<AgentConfig[]> {
    const { data, error } = await this.db().from("agents").select("*").eq("category", category);
    if (error) throw error;
    return (data ?? []).map(this.rowToConfig);
  }

  private rowToConfig(row: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    capabilities: string[];
    dependencies: string[];
    priority: number;
  }): AgentConfig {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      category: row.category as AgentConfig["category"],
      capabilities: row.capabilities,
      dependencies: row.dependencies,
      priority: row.priority,
    };
  }

  /**
   * Додає завдання в чергу (таблиця agent_tasks).
   */
  async addTask(task: {
    agentId: string;
    type: string;
    payload: Record<string, unknown>;
    orgId?: string;
    projectId?: string;
  }): Promise<AgentTask> {
    const { data, error } = await this.db()
      .from("agent_tasks")
      .insert({
        agent_id: task.agentId,
        type: task.type,
        payload: task.payload,
        org_id: task.orgId ?? null,
        project_id: task.projectId ?? null,
        status: "idle",
      })
      .select()
      .single();
    if (error) throw error;
    return this.rowToTask(data);
  }

  /**
   * Отримує наступне завдання з черги для конкретного агента, з
   * пріоритезацією за `agents.priority` (найвищий пріоритет — перший).
   */
  async getNextTask(agentId: string): Promise<AgentTask | undefined> {
    const { data, error } = await this.db()
      .from("agent_tasks")
      .select("*")
      .eq("agent_id", agentId)
      .eq("status", "idle")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    await this.updateTaskStatus(data.id, "processing");
    return this.rowToTask({ ...data, status: "processing" });
  }

  private rowToTask(row: {
    id: string;
    agent_id: string;
    type: string;
    payload: unknown;
    status: string;
    result: unknown;
    error: string | null;
    created_at: string;
    completed_at: string | null;
  }): AgentTask {
    return {
      id: row.id,
      agentId: row.agent_id,
      type: row.type,
      payload: row.payload,
      status: row.status as AgentStatus,
      result: row.result ?? undefined,
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  /**
   * Відправляє повідомлення між агентами (таблиця agent_messages).
   */
  async sendMessage(message: {
    from: string;
    to: string;
    type: AgentMessage["type"];
    payload: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.db().from("agent_messages").insert({
      from_agent: message.from,
      to_agent: message.to,
      type: message.type,
      payload: message.payload,
    });
    if (error) throw error;
  }

  /**
   * Отримує повідомлення для агента.
   */
  async getMessages(agentId: string): Promise<AgentMessage[]> {
    const { data, error } = await this.db()
      .from("agent_messages")
      .select("*")
      .eq("to_agent", agentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      from: row.from_agent,
      to: row.to_agent,
      type: row.type as AgentMessage["type"],
      payload: row.payload,
      timestamp: new Date(row.created_at),
    }));
  }

  /**
   * Розподіляє завдання між агентами на основі їх можливостей.
   */
  async distributeTask(
    taskType: string,
    payload: Record<string, unknown>,
    context?: { orgId?: string; projectId?: string }
  ): Promise<AgentTask> {
    const capableAgents = (await this.getAllAgents()).filter((agent) =>
      agent.capabilities.includes(taskType)
    );

    if (capableAgents.length === 0) {
      throw new Error(`No agent capable of handling task: ${taskType}`);
    }

    const selectedAgent = capableAgents.sort((a, b) => b.priority - a.priority)[0];

    return this.addTask({
      agentId: selectedAgent.id,
      type: taskType,
      payload,
      orgId: context?.orgId,
      projectId: context?.projectId,
    });
  }

  /**
   * Перевіряє залежності агента.
   */
  async checkDependencies(agentId: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    if (!agent) return false;
    if (agent.dependencies.length === 0) return true;

    const { count } = await this.db()
      .from("agents")
      .select("id", { count: "exact", head: true })
      .in("id", agent.dependencies);
    return (count ?? 0) === agent.dependencies.length;
  }

  /**
   * Отримує топологію агентів для візуалізації.
   */
  async getTopology(): Promise<{
    agents: AgentConfig[];
    connections: Array<{ from: string; to: string }>;
  }> {
    const agents = await this.getAllAgents();
    const connections: Array<{ from: string; to: string }> = [];
    agents.forEach((agent) => {
      agent.dependencies.forEach((depId) => {
        connections.push({ from: depId, to: agent.id });
      });
    });
    return { agents, connections };
  }

  /**
   * Отримує статистику системи.
   */
  async getStats(): Promise<{
    totalAgents: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    messagesSent: number;
  }> {
    const db = this.db();
    const [{ count: totalAgents }, { count: activeTasks }, { count: completedTasks }, { count: failedTasks }, { count: messagesSent }] =
      await Promise.all([
        db.from("agents").select("id", { count: "exact", head: true }),
        db.from("agent_tasks").select("id", { count: "exact", head: true }).eq("status", "processing"),
        db.from("agent_tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
        db.from("agent_tasks").select("id", { count: "exact", head: true }).eq("status", "error"),
        db.from("agent_messages").select("id", { count: "exact", head: true }),
      ]);

    return {
      totalAgents: totalAgents ?? 0,
      activeTasks: activeTasks ?? 0,
      completedTasks: completedTasks ?? 0,
      failedTasks: failedTasks ?? 0,
      messagesSent: messagesSent ?? 0,
    };
  }

  /**
   * Оновлює статус завдання.
   */
  async updateTaskStatus(
    taskId: string,
    status: AgentStatus,
    result?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (result) patch.result = result;
    if (error) patch.error = error;
    if (status === "completed" || status === "error") {
      patch.completed_at = new Date().toISOString();
    }
    const { error: dbError } = await this.db().from("agent_tasks").update(patch).eq("id", taskId);
    if (dbError) throw dbError;
  }

  /**
   * Отримує конфігурацію оркестратора.
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону — сам клас тепер stateless (уся мутабельність у
// Supabase), тому синглтон тут безпечний навіть у serverless-середовищі.
export const orchestrator = new OrchestratorAgent();
