// Tab prop extraction (safe, behavior-preserving)
// Limits tab inputs to values this tab actually consumes.

export const createReportsTabProps = (scope) => ({
  React: scope.React,
  bolSettings: scope.bolSettings,
  palletTypes: scope.palletTypes,
  reportDateRange: scope.reportDateRange,
  reportsSubTab: scope.reportsSubTab,
  routesByDate: scope.routesByDate,
  setReportDateRange: scope.setReportDateRange,
  setReportsSubTab: scope.setReportsSubTab,
  storesDirectory: scope.storesDirectory,
  escapeHtml: scope.escapeHtml,
});
