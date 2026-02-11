export const getWeekDatesForDate = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setDate(diff + i);
    weekDates.push(d.toLocaleDateString('en-CA'));
  }
  return weekDates;
};

export const formatDateDisplayValue = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatDayNameShort = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const formatDayNumberValue = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDate();
};

export const formatPhoneNumberValue = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  const limited = digits.substring(0, 10);
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.substring(0, 3)}) ${limited.substring(3)}`;
  return `(${limited.substring(0, 3)}) ${limited.substring(3, 6)}-${limited.substring(6)}`;
};

export const formatCurrencyValue = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const escapeHtmlValue = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const isDateTodayInTimezone = (dateStr, timezone, now = new Date()) => {
  const today = now.toLocaleDateString('en-CA', { timeZone: timezone });
  return dateStr === today;
};

export const getNavigatedWeekDate = (selectedDate, direction) => {
  const date = new Date(selectedDate + 'T12:00:00');
  const day = date.getDay();
  if (direction > 0) {
    const daysUntilMonday = (1 - day + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
  } else {
    const daysSinceSaturday = (day - 6 + 7) % 7 || 7;
    date.setDate(date.getDate() - daysSinceSaturday);
  }
  return date.toLocaleDateString('en-CA');
};
