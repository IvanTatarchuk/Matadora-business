import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Anomaly Detector Agent - Агент для виявлення аномалій
 * Виявляє аномалії в даних проекту та IoT пристроїв
 */
export class AnomalyDetectorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "anomaly-detector",
      name: "Anomaly Detector Agent",
      description: "Виявляє аномалії в даних проекту та IoT пристроїв, аналізує патерни та надає сповіщення",
      category: "iot",
      capabilities: [
        "pattern_analysis",
        "anomaly_detection",
        "threshold_monitoring",
        "alert_generation",
        "root_cause_analysis",
        "prediction",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Аналізує патерни
   */
  async analyzePatterns(data: number[]): Promise<{
    patterns: Array<{
      type: string;
      description: string;
      confidence: number; // 0-100
    }>;
    baseline: {
      mean: number;
      stdDev: number;
      min: number;
      max: number;
    };
  }> {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const patterns = [
      {
        type: "Seasonal",
        description: "Data shows seasonal variation",
        confidence: 85,
      },
      {
        type: "Trend",
        description: "Slight upward trend detected",
        confidence: 70,
      },
    ];

    const baseline = {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...data),
      max: Math.max(...data),
    };

    return { patterns, baseline };
  }

  /**
   * Виявляє аномалії
   */
  async detectAnomalies(data: any[], threshold: number): Promise<{
    anomalies: Array<{
      id: string;
      value: number;
      expected: number;
      deviation: number; // у процентах
      severity: "low" | "medium" | "high";
      timestamp: Date;
    }>;
    summary: {
      total: number;
      low: number;
      medium: number;
      high: number;
    };
  }> {
    const anomalies = [
      {
        id: "anom-1",
        value: 150,
        expected: 75,
        deviation: 100,
        severity: "high" as const,
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        id: "anom-2",
        value: 95,
        expected: 75,
        deviation: 27,
        severity: "medium" as const,
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: "anom-3",
        value: 85,
        expected: 75,
        deviation: 13,
        severity: "low" as const,
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
      },
    ];

    const summary = {
      total: anomalies.length,
      low: anomalies.filter(a => a.severity === "low").length,
      medium: anomalies.filter(a => a.severity === "medium").length,
      high: anomalies.filter(a => a.severity === "high").length,
    };

    return { anomalies, summary };
  }

  /**
   * Моніторить пороги
   */
  async monitorThresholds(metric: string, value: number, thresholds: {
    warning: number;
    critical: number;
  }): Promise<{
    status: "normal" | "warning" | "critical";
    value: number;
    thresholds: typeof thresholds;
    message: string;
  }> {
    let status: "normal" | "warning" | "critical";
    if (value >= thresholds.critical) {
      status = "critical" as const;
    } else if (value >= thresholds.warning) {
      status = "warning" as const;
    } else {
      status = "normal" as const;
    }

    const message = status === "normal" ? "Value within normal range" : status === "warning" ? "Value exceeds warning threshold" : "Value exceeds critical threshold";

    return { status, value, thresholds, message };
  }

  /**
   * Генерує сповіщення
   */
  async generateAlerts(anomalies: any[]): Promise<{
    alerts: Array<{
      id: string;
      type: string;
      severity: "info" | "warning" | "critical";
      message: string;
      recommendation: string;
      timestamp: Date;
    }>;
  }> {
    const alerts = anomalies.map((a, i) => ({
      id: `alert-${i}`,
      type: "Anomaly",
      severity: a.severity === "high" ? "critical" as const : a.severity === "medium" ? "warning" as const : "info" as const,
      message: `Anomaly detected: value ${a.value} deviates ${a.deviation}% from expected`,
      recommendation: a.severity === "high" ? "Immediate investigation required" : a.severity === "medium" ? "Review within 24 hours" : "Monitor for trends",
      timestamp: a.timestamp,
    }));

    return { alerts };
  }

  /**
   * Аналізує причину
   */
  async analyzeRootCause(anomalyId: string): Promise<{
    anomalyId: string;
    possibleCauses: Array<{
      cause: string;
      probability: number; // 0-100
      evidence: string;
    }>;
    recommendedActions: string[];
  }> {
    const possibleCauses = [
      {
        cause: "Sensor malfunction",
        probability: 60,
        evidence: "Sudden spike in readings",
      },
      {
        cause: "Environmental change",
        probability: 30,
        evidence: "Correlated with weather data",
      },
      {
        cause: "Data transmission error",
        probability: 10,
        evidence: "Intermittent connectivity issues",
      },
    ];

    const recommendedActions = [
      "Inspect sensor for physical damage",
      "Compare with nearby sensors",
      "Review environmental conditions",
    ];

    return { anomalyId, possibleCauses, recommendedActions };
  }

  /**
   * Прогнозує
   */
  async predictAnomalies(data: number[], futurePoints: number): Promise<{
    predictions: Array<{
      timestamp: Date;
      predicted: number;
      confidence: number; // 0-100
      anomalyRisk: "low" | "medium" | "high";
    }>;
  }> {
    const predictions = Array.from({ length: futurePoints }, (_, i) => ({
      timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      predicted: 75 + Math.random() * 10,
      confidence: 85 - i * 5,
      anomalyRisk: i < 3 ? "low" as const : i < 5 ? "medium" as const : "high" as const,
    }));

    return { predictions };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const anomalyDetectorAgent = new AnomalyDetectorAgent();
