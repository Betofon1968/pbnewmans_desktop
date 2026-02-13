export function getNextSequentialInvoiceNumber(invoices = []) {
  let maxSequence = 0;
  invoices.forEach((invoice) => {
    const match = String(invoice?.invoiceNumber || '')
      .trim()
      .match(/^PB(\d{4})$/i);
    if (!match) return;
    const sequence = parseInt(match[1], 10);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  });
  return `PB${String(maxSequence + 1).padStart(4, '0')}`;
}

export function getInvoiceWeekRange(weeksAgo) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startSunday = new Date(today);
  startSunday.setDate(today.getDate() - dayOfWeek - weeksAgo * 7);
  const endSaturday = new Date(startSunday);
  endSaturday.setDate(startSunday.getDate() + 6);
  return {
    start: startSunday.toLocaleDateString('en-CA'),
    end: endSaturday.toLocaleDateString('en-CA'),
  };
}
