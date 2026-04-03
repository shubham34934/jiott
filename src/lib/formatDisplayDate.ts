const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Renders dates like "13 Feb 26" (day, short month, 2-digit year). */
export function formatDisplayDate(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${yy}`;
}
