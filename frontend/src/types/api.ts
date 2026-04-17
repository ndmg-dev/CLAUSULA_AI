export interface BoundingBox {
  page_number: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Issue {
  title: string;
  description: string;
  severity: "Critical" | "Mild";
  clause_reference: string;
  bounding_box: BoundingBox | null;
}

export interface AnalysisSummary {
  executive_summary: string;
  risk_level: "Low" | "Medium" | "High";
}

export interface AnalysisResult {
  document_health_score: number;
  summary: AnalysisSummary;
  issues: Issue[];
  original_text: string | null;
}
