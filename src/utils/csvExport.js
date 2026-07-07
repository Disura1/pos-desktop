// Escapes a value for safe CSV output — wraps in quotes if it contains
// a comma, quote, or newline, and doubles any internal quotes.
const escapeCsvField = (value) => {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// headers: [{ label: 'Column Name', value: 'fieldName' | (row) => computedValue }]
export const exportToCSV = async (filename, headers, rows) => {
  const headerLine = headers.map((h) => escapeCsvField(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers
      .map((h) => escapeCsvField(typeof h.value === 'function' ? h.value(row) : row[h.value]))
      .join(','),
  );
  const csv = [headerLine, ...dataLines].join('\n');
  return window.electronAPI.exportFile(filename, csv);
};