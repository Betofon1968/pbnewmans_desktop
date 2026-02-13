export function useReportsTab({ React }) {
  const { useState } = React;

  const [reportsSubTab, setReportsSubTab] = useState('Daily Summary');
  const [reportDateRange, setReportDateRange] = useState(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      start: weekAgo.toLocaleDateString('en-CA'),
      end: today.toLocaleDateString('en-CA')
    };
  });

  return {
    reportsSubTab,
    setReportsSubTab,
    reportDateRange,
    setReportDateRange
  };
}
