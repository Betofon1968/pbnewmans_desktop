// Confirmation guard for printing BOL/Manifest on a past date.
// Operators were accidentally printing prior weeks' deliveries; this opens
// a styled confirm modal (matching the rest of the app's modal patterns)
// when the selected date is before today in the configured timezone.

import { daysBetweenDateStrings, getTodayInTimezoneValue } from '../time/dateUtils.js';

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Returns a Promise<boolean> — resolves true to proceed, false to cancel.
// If the date is today or in the future, resolves immediately to true
// without opening the modal.
//
// kind:                 'BOL' | 'Manifest' (used in dialog text)
// selectedDate:         ISO date string (YYYY-MM-DD)
// todayStr:             ISO date string for "today" in user's timezone
// setPastDatePrintModal: state setter from useAppModals
const buildPayload = (kind, selectedDate, todayStr, setPastDatePrintModal) => {
  const daysAgo = Math.abs(daysBetweenDateStrings(selectedDate, todayStr));
  return new Promise((resolve) => {
    setPastDatePrintModal({
      kind,
      selectedDate,
      selectedDateLabel: formatDateLong(selectedDate),
      todayLabel: formatDateLong(todayStr),
      daysAgo,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
};

// Convenience: caller has the timezone string.
export const guardPastDatePrint = ({ kind, selectedDate, timezone, setPastDatePrintModal }) => {
  const todayStr = getTodayInTimezoneValue(timezone);
  if (!selectedDate || !todayStr || selectedDate >= todayStr) return Promise.resolve(true);
  return buildPayload(kind, selectedDate, todayStr, setPastDatePrintModal);
};

// Convenience: caller has today's date string already (e.g. via getTodayInTimezone()).
export const guardPastDatePrintWithToday = ({ kind, selectedDate, todayStr, setPastDatePrintModal }) => {
  if (!selectedDate || !todayStr || selectedDate >= todayStr) return Promise.resolve(true);
  return buildPayload(kind, selectedDate, todayStr, setPastDatePrintModal);
};
