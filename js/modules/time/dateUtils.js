export const getTodayInTimezoneValue = (timezone, now = new Date()) => {
  return now.toLocaleDateString('en-CA', { timeZone: timezone });
};

export const getTomorrowInTimezoneValue = (timezone, now = new Date()) => {
  const todayStr = getTodayInTimezoneValue(timezone, now);
  const today = new Date(todayStr + 'T12:00:00');
  today.setDate(today.getDate() + 1);
  return today.toLocaleDateString('en-CA');
};

export const isFutureDateInTimezone = (dateStr, timezone, now = new Date()) => {
  return dateStr > getTodayInTimezoneValue(timezone, now);
};

export const isPastDateInTimezone = (dateStr, timezone, now = new Date()) => {
  if (!dateStr) return false;
  return dateStr < getTodayInTimezoneValue(timezone, now);
};

// Returns the number of full days from dateA to dateB (positive if B > A).
// Both inputs are expected to be ISO date strings (YYYY-MM-DD).
export const daysBetweenDateStrings = (dateA, dateB) => {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA + 'T12:00:00');
  const b = new Date(dateB + 'T12:00:00');
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};
