
/**
 * Utility functions for timezone-neutral date handling
 * These functions ensure dates are handled consistently regardless of user timezone
 */

/**
 * Formats a date to YYYY-MM-DD string without timezone conversion
 * This ensures the date stays exactly as the user sees it
 */
export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a new date by adding days to an existing date
 * Uses timezone-neutral calculation to avoid date shifts
 */
export function addDaysToDate(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object
 * Creates the date in local timezone to match user expectation
 * IMPORTANT: This creates the date at noon to avoid timezone edge cases
 */
export function parseDateFromDatabase(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon to avoid timezone shifting issues
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Gets the date for a specific day within a week
 * Used for calculating daily entry dates within a week
 */
export function getWeekDayDate(weekStartDate: string, dayIndex: number): Date {
  const startDate = parseDateFromDatabase(weekStartDate);
  return addDaysToDate(startDate, dayIndex);
}

/**
 * Checks if two dates represent the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateForDatabase(date1) === formatDateForDatabase(date2);
}

/**
 * Safely formats a date for display without timezone conversion
 * This ensures displayed dates match what was originally selected
 */
export function formatDateForDisplay(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid timezone issues
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    timeZone: undefined // Use local timezone for display
  });
}
