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
