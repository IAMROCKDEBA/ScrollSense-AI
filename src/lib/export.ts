import type { ExportReport } from "@/types";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportReportJson(report: ExportReport) {
  downloadBlob(
    `scrollsense-report-${Date.now()}.json`,
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  );
}

export function exportReportCsv(report: ExportReport) {
  const risk = report.riskScore;
  const profile = report.profile;
  const rows = [
    ["Field", "Value"],
    ["Generated at", report.generatedAt],
    ["Name", profile?.name ?? "Not provided"],
    ["Daily usage minutes", String(profile?.dailyUsageMinutes ?? "")],
    ["Sleep hours", String(profile?.sleepHours ?? "")],
    ["Study hours", String(profile?.studyHours ?? "")],
    ["Addiction risk score", String(risk?.addictionRiskScore ?? "")],
    ["Risk category", risk?.finalRiskCategory ?? ""],
    ["Focus score", String(risk?.focusScore ?? "")],
    ["Memory score", String(risk?.memoryScore ?? "")],
    ["Impulse control score", String(risk?.impulseControlScore ?? "")],
    ["Mood dependency score", String(risk?.moodDependencyScore ?? "")],
    ["Digital wellbeing score", String(risk?.digitalWellbeingScore ?? "")]
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  downloadBlob(`scrollsense-report-${Date.now()}.csv`, new Blob([csv], { type: "text/csv" }));
}
