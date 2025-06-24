
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
  
  // Basic validation without creating Date objects
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

/**
 * Formats a date string for display - RAW DATABASE DATE DISPLAY
 * Input: YYYY-MM-DD string from database
 * Output: Human readable format (e.g., "June 24, 2025")
 * NO TIMEZONE CONVERSION - DISPLAYS EXACT DATABASE VALUE
 */
export function formatDateStringForDisplay(dateString: string): string {
  console.log('=== formatDateStringForDisplay DEBUG START ===');
  console.log('Input dateString:', dateString);
  console.log('Input type:', typeof dateString);
  
  // If empty or invalid, return as-is
  if (!dateString || !isValidDateString(dateString)) {
    console.log('Invalid or empty dateString, returning as-is');
    console.log('=== formatDateStringForDisplay DEBUG END ===');
    return dateString;
  }
  
  // Parse the date string components directly - NO Date() constructor
  const [year, month, day] = dateString.split('-');
  console.log('Split parts:', [year, month, day]);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[monthIndex];
  const dayNumber = parseInt(day, 10);
  
  console.log('Month index:', monthIndex, 'Month name:', monthName);
  console.log('Day number:', dayNumber);
  
  // Format using pure string manipulation - no Date objects involved
  const result = `${monthName} ${dayNumber}, ${year}`;
  console.log('Formatted result:', result);
  console.log('=== formatDateStringForDisplay DEBUG END ===');
  
  return result;
}

/**
 * Formats a date string for short display (MMM d format)
 * Input: YYYY-MM-DD string from database
 * Output: Short format (e.g., "Jun 24")
 * NO TIMEZONE CONVERSION - DISPLAYS EXACT DATABASE VALUE
 */
export function formatDateStringForShortDisplay(dateString: string): string {
  if (!dateString || !isValidDateString(dateString)) {
    return dateString;
  }
  
  const [year, month, day] = dateString.split('-');
  
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = shortMonthNames[monthIndex];
  const dayNumber = parseInt(day, 10);
  
  return `${monthName} ${dayNumber}`;
}

/**
 * Formats a date string with year for short display (MMM d, yyyy format)  
 * Input: YYYY-MM-DD string from database
 * Output: Short format with year (e.g., "Jun 24, 2025")
 * NO TIMEZONE CONVERSION - DISPLAYS EXACT DATABASE VALUE
 */
export function formatDateStringForMediumDisplay(dateString: string): string {
  if (!dateString || !isValidDateString(dateString)) {
    return dateString;
  }
  
  const [year, month, day] = dateString.split('-');
  
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = shortMonthNames[monthIndex];
  const dayNumber = parseInt(day, 10);
  
  return `${monthName} ${dayNumber}, ${year}`;
}

/**
 * NEW: Formats a date string for compact display (MMM d, yyyy format)
 * Input: YYYY-MM-DD string from database  
 * Output: Compact format (e.g., "Jun 24, 2025")
 * NO TIMEZONE CONVERSION - DISPLAYS EXACT DATABASE VALUE
 * This replaces date-fns format calls to prevent timezone issues
 */
export function formatDateStringShort(dateString: string): string {
  console.log('=== formatDateStringShort DEBUG START ===');
  console.log('Input dateString:', dateString);
  console.log('Input type:', typeof dateString);
  
  if (!dateString || !isValidDateString(dateString)) {
    console.log('Invalid dateString, returning as-is:', dateString);
    console.log('=== formatDateStringShort DEBUG END ===');
    return dateString;
  }
  
  const [year, month, day] = dateString.split('-');
  console.log('Split parts:', [year, month, day]);
  
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = shortMonthNames[monthIndex];
  const dayNumber = parseInt(day, 10);
  
  console.log('Month index:', monthIndex, 'Month name:', monthName);
  console.log('Day number:', dayNumber);
  
  const result = `${monthName} ${dayNumber}, ${year}`;
  console.log('Final formatted result:', result);
  console.log('=== formatDateStringShort DEBUG END ===');
  
  return result;
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
