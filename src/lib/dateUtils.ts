
/**
 * Utility functions for timezone-neutral date handling
 * These functions ensure dates are handled consistently regardless of user timezone
 */

/**
 * Gets today's date in YYYY-MM-DD format in user's local timezone
 * This ensures the "today" date matches what the user expects to see
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates that a date string is in the correct YYYY-MM-DD format
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Formats a date string for display
 * Input: YYYY-MM-DD string
 * Output: Human readable format
 */
export function formatDateStringForDisplay(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

/**
 * Legacy function for backward compatibility
 * Formats a Date object to YYYY-MM-DD string for database storage
 * Note: This may cause timezone issues, prefer using date strings directly
 */
export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Legacy function for backward compatibility
 * Parses a YYYY-MM-DD string from database to Date object
 * Note: This may cause timezone issues, prefer working with date strings directly
 */
export function parseDateFromDatabase(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
