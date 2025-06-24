

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
 * Formats a date string for display - COMPREHENSIVE DEBUGGING VERSION
 * Input: YYYY-MM-DD string
 * Output: Human readable format (e.g., "June 24, 2025")
 * NO DATE OBJECTS - NO TIMEZONE ISSUES
 */
export function formatDateStringForDisplay(dateString: string): string {
  console.log('\n=== COMPREHENSIVE DATE FORMAT DEBUGGING ===');
  console.log('1. Raw input dateString:', JSON.stringify(dateString));
  console.log('2. Input type:', typeof dateString);
  console.log('3. Input length:', dateString?.length);
  
  if (!dateString) {
    console.log('4. EARLY RETURN: Empty dateString');
    console.log('=== END DEBUG (empty) ===\n');
    return dateString;
  }
  
  if (!isValidDateString(dateString)) {
    console.log('4. EARLY RETURN: Invalid dateString format');
    console.log('=== END DEBUG (invalid) ===\n');
    return dateString;
  }
  
  console.log('4. Validation passed, proceeding with parsing');
  
  // Parse the date string components directly - NO Date() constructor
  const splitResult = dateString.split('-');
  console.log('5. Split result:', splitResult);
  
  const [yearStr, monthStr, dayStr] = splitResult;
  console.log('6. Destructured strings - year:', JSON.stringify(yearStr), 'month:', JSON.stringify(monthStr), 'day:', JSON.stringify(dayStr));
  
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  console.log('7. Parsed integers - year:', year, 'month:', month, 'day:', day);
  console.log('8. parseInt results types - year:', typeof year, 'month:', typeof month, 'day:', typeof day);
  console.log('9. Are all numbers valid?', !isNaN(year), !isNaN(month), !isNaN(day));
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  console.log('10. Month names array length:', monthNames.length);
  console.log('11. Array index to use (month - 1):', month - 1);
  console.log('12. Is index valid?', (month - 1) >= 0 && (month - 1) < monthNames.length);
  console.log('13. Month name at index:', monthNames[month - 1]);
  
  // Format using pure string manipulation - no Date objects involved
  const formattedDate = `${monthNames[month - 1]} ${day}, ${year}`;
  console.log('14. Final formatted result:', JSON.stringify(formattedDate));
  
  // Let's also test what would happen with Date object (for comparison)
  console.log('\n--- COMPARISON TEST WITH DATE OBJECT (for debugging) ---');
  try {
    const testDate = new Date(dateString + 'T00:00:00');
    console.log('15. Date object created:', testDate);
    console.log('16. Date.toString():', testDate.toString());
    console.log('17. Date.getFullYear():', testDate.getFullYear());
    console.log('18. Date.getMonth():', testDate.getMonth(), '(0-based)');
    console.log('19. Date.getDate():', testDate.getDate());
    console.log('20. Would Date show:', `${monthNames[testDate.getMonth()]} ${testDate.getDate()}, ${testDate.getFullYear()}`);
  } catch (e) {
    console.log('15. Date object creation failed:', e);
  }
  console.log('--- END COMPARISON TEST ---\n');
  
  console.log('21. FINAL RETURN VALUE:', JSON.stringify(formattedDate));
  console.log('=== END COMPREHENSIVE DATE FORMAT DEBUGGING ===\n');
  
  return formattedDate;
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

