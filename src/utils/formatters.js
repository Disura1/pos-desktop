export const fmtCurrency = (val) =>
  `LKR ${parseFloat(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (dateStr) => {
  // Append time to force local timezone parsing (date-only strings are parsed as UTC by default)
  const d = dateStr && dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
  return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const fmtTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

export const calcDiscount = (subtotal, discount) => {
  if (!discount) return 0;
  if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
  if (discount.type === 'fixed') return Math.min(discount.value, subtotal);
  return 0;
};

export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
