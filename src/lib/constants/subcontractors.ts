import type { SubSpecialty } from "@/lib/actions/subcontractors";

export const SPECIALTY_LABELS: Record<SubSpecialty, string> = {
  general:    "Generalny wykonawca",
  electrical: "Elektryka",
  plumbing:   "Hydraulika / Instalacje sanitarne",
  hvac:       "HVAC / Klimatyzacja",
  roofing:    "Dachy / Pokrycia dachowe",
  flooring:   "Podłogi / Posadzki",
  painting:   "Malowanie / Tynkowanie",
  insulation: "Izolacje",
  concrete:   "Beton / Żelbet",
  steel:      "Konstrukcje stalowe",
  windows:    "Okna / Drzwi / Fasady",
  landscaping:"Zagospodarowanie terenu",
  demolition: "Rozbiórki",
  excavation: "Ziemne / Fundamenty",
  other:      "Inne",
};

// Agent Types for Multi-Agent System
export type AgentCategory = 
  | "orchestration"
  | "analysis"
  | "planning"
  | "financial"
  | "document"
  | "quality"
  | "safety"
  | "communication"
  | "technical"
  | "reporting"
  | "customer"
  | "legal"
  | "iot"
  | "integration";

export type AgentStatus = "idle" | "processing" | "completed" | "error";

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  capabilities: string[];
  dependencies: string[];
  priority: number;
}

export interface AgentMessage {
  from: string;
  to: string;
  type: "request" | "response" | "notification";
  payload: any;
  timestamp: Date;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  payload: any;
  status: AgentStatus;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
