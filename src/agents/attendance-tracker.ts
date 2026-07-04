import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Attendance Tracker Agent - Агент для відстеження відвідуваності
 * Відстежує відвідуваність працівників та розраховує відпустки
 */
export class AttendanceTrackerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "attendance-tracker",
      name: "Attendance Tracker Agent",
      description: "Відстежує відвідуваність працівників, розраховує робочі години та керує відпустками",
      category: "planning",
      capabilities: [
        "attendance_tracking",
        "hours_calculation",
        "leave_management",
        "absence_monitoring",
        "overtime_tracking",
        "compliance_check",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Відстежує відвідуваність
   */
  async trackAttendance(projectId: string, date: Date): Promise<{
    attendance: Array<{
      workerId: string;
      workerName: string;
      status: "present" | "absent" | "late" | "half_day";
      checkIn: Date;
      checkOut?: Date;
      hoursWorked: number;
    }>;
    summary: {
      total: number;
      present: number;
      absent: number;
      late: number;
    };
  }> {
    const attendance = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        status: "present" as const,
        checkIn: new Date(date.setHours(8, 0, 0, 0)),
        checkOut: new Date(date.setHours(17, 0, 0, 0)),
        hoursWorked: 9,
      },
      {
        workerId: "w-2",
        workerName: "Jane Doe",
        status: "late" as const,
        checkIn: new Date(date.setHours(8, 30, 0, 0)),
        checkOut: new Date(date.setHours(17, 0, 0, 0)),
        hoursWorked: 8.5,
      },
      {
        workerId: "w-3",
        workerName: "Bob Johnson",
        status: "absent" as const,
        checkIn: new Date(date.setHours(8, 0, 0, 0)),
        hoursWorked: 0,
      },
    ];

    const summary = {
      total: attendance.length,
      present: attendance.filter(a => a.status === "present").length,
      absent: attendance.filter(a => a.status === "absent").length,
      late: attendance.filter(a => a.status === "late").length,
    };

    return { attendance, summary };
  }

  /**
   * Розраховує робочі години
   */
  async calculateHours(workerId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    dailyBreakdown: Array<{
      date: Date;
      hours: number;
      type: "regular" | "overtime";
    }>;
  }> {
    const regularHours = 160;
    const overtimeHours = 12;
    const totalHours = regularHours + overtimeHours;

    const dailyBreakdown = Array.from({ length: 20 }, (_, i) => ({
      date: new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000),
      hours: i < 16 ? 8 : 10,
      type: i < 16 ? "regular" as const : "overtime" as const,
    }));

    return { regularHours, overtimeHours, totalHours, dailyBreakdown };
  }

  /**
   * Керує відпустками
   */
  async manageLeave(workerId: string): Promise<{
    leaveBalance: {
      annual: number;
      sick: number;
      personal: number;
    };
    scheduledLeaves: Array<{
      type: string;
      startDate: Date;
      endDate: Date;
      days: number;
      status: "pending" | "approved" | "rejected";
    }>;
    leaveHistory: Array<{
      type: string;
      startDate: Date;
      endDate: Date;
      days: number;
    }>;
  }> {
    const leaveBalance = {
      annual: 10,
      sick: 5,
      personal: 3,
    };

    const scheduledLeaves = [
      {
        type: "annual",
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 34 * 24 * 60 * 60 * 1000),
        days: 5,
        status: "approved" as const,
      },
    ];

    const leaveHistory = [
      {
        type: "sick",
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000),
        days: 2,
      },
    ];

    return { leaveBalance, scheduledLeaves, leaveHistory };
  }

  /**
   * Моніторить відсутність
   */
  async monitorAbsences(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    absences: Array<{
      workerId: string;
      workerName: string;
      date: Date;
      reason: string;
      type: "planned" | "unplanned";
      approved: boolean;
    }>;
    patterns: Array<{
      workerId: string;
      pattern: string;
      frequency: number;
    }>;
  }> {
    const absences = [
      {
        workerId: "w-3",
        workerName: "Bob Johnson",
        date: new Date(),
        reason: "Sick leave",
        type: "unplanned" as const,
        approved: true,
      },
    ];

    const patterns = [
      {
        workerId: "w-3",
        pattern: "Frequent Mondays",
        frequency: 3,
      },
    ];

    return { absences, patterns };
  }

  /**
   * Відстежує надурочні години
   */
  async trackOvertime(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    overtime: Array<{
      workerId: string;
      workerName: string;
      date: Date;
      hours: number;
      reason: string;
      approved: boolean;
    }>;
    totalCost: number;
    recommendations: string[];
  }> {
    const overtime = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        date: new Date(),
        hours: 4,
        reason: "Deadline pressure",
        approved: true,
      },
    ];

    const totalCost = overtime.reduce((sum, o) => sum + o.hours * 25, 0); // $25 за годину
    const recommendations = [
      "Review overtime necessity",
      "Consider resource reallocation",
    ];

    return { overtime, totalCost, recommendations };
  }

  /**
   * Перевіряє відповідність
   */
  async checkCompliance(projectId: string): Promise<{
    compliant: boolean;
    issues: Array<{
      type: string;
      description: string;
      severity: "low" | "medium" | "high";
    }>;
    recommendations: string[];
  }> {
    const issues = [
      {
        type: "Missing time records",
        description: "3 workers missing time records for last week",
        severity: "medium" as const,
      },
    ];

    const compliant = issues.length === 0;
    const recommendations = [
      "Ensure all workers clock in/out",
      "Review attendance policies",
    ];

    return { compliant, issues, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const attendanceTrackerAgent = new AttendanceTrackerAgent();
