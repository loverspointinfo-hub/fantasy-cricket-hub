import { format, isToday, isTomorrow } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const IST_TZ = "Asia/Kolkata";

/** Convert a date string/Date to IST zoned time */
export const toIST = (date: string | Date): Date => {
  return toZonedTime(new Date(date), IST_TZ);
};

/** Format a date in IST with the given format string */
export const formatIST = (date: string | Date, fmt: string): string => {
  return format(toIST(date), fmt);
};

/** "Today, 7:30 PM" / "Tomorrow, 3:00 PM" / "15 Mar, 7:30 PM" in IST */
export const formatMatchTime = (dateStr: string): string => {
  const d = toIST(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "dd MMM, h:mm a");
};
