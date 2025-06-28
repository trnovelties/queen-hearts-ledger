import { supabase } from "@/integrations/supabase/client";

export interface CalculationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedValues: Record<string, number>;
}

export interface AuditLogEntry {
  operation: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  timestamp: string;
  userId: string;
  gameId?: string;
  weekId?: string;
}

// Validation functions for core calculations
export const validateTicketSalesCalculation = (
  ticketsSold: number,
  ticketPrice: number,
  organizationPercentage: number,
  jackpotPercentage: number
): CalculationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic input validation
  if (ticketsSold <= 0) errors.push("Tickets sold must be greater than 0");
  if (ticketPrice <= 0) errors.push("Ticket price must be greater than 0");
  if (organizationPercentage < 0 || organizationPercentage > 100) {
    errors.push("Organization percentage must be between 0 and 100");
  }
  if (jackpotPercentage < 0 || jackpotPercentage > 100) {
    errors.push("Jackpot percentage must be between 0 and 100");
  }
  
  // Percentage sum validation
  if (Math.abs((organizationPercentage + jackpotPercentage) - 100) > 0.01) {
    errors.push("Organization and jackpot percentages must sum to 100%");
  }
  
  // Calculate values
  const amountCollected = ticketsSold * ticketPrice;
  const organizationTotal = amountCollected * (organizationPercentage / 100);
  const jackpotTotal = amountCollected * (jackpotPercentage / 100);
  
  // Cross-validation
  if (Math.abs((organizationTotal + jackpotTotal) - amountCollected) > 0.01) {
    errors.push("Organization and jackpot totals don't sum to amount collected");
  }
  
  // Warnings for unusual values
  if (ticketsSold > 10000) warnings.push("Unusually high number of tickets sold");
  if (ticketPrice > 50) warnings.push("Unusually high ticket price");
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      amountCollected,
      organizationTotal,
      jackpotTotal
    }
  };
};

export const validateJackpotCalculation = (
  jackpotContributions: number,
  minimumJackpot: number,
  carryoverJackpot: number = 0
): CalculationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Input validation
  if (jackpotContributions < 0) errors.push("Jackpot contributions cannot be negative");
  if (minimumJackpot < 0) errors.push("Minimum jackpot cannot be negative");
  if (carryoverJackpot < 0) errors.push("Carryover jackpot cannot be negative");
  
  // Calculate displayed jackpot
  let displayedJackpot: number;
  if (jackpotContributions < minimumJackpot) {
    displayedJackpot = minimumJackpot + carryoverJackpot;
  } else {
    displayedJackpot = jackpotContributions + carryoverJackpot;
  }
  
  // Warnings
  if (jackpotContributions < minimumJackpot) {
    warnings.push("Jackpot contributions below minimum threshold");
  }
  if (carryoverJackpot > jackpotContributions * 2) {
    warnings.push("Carryover jackpot seems unusually high compared to contributions");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      displayedJackpot,
      jackpotContributions,
      minimumJackpot,
      carryoverJackpot
    }
  };
};

export const validateGameTotals = (
  ticketSales: Array<{
    amount_collected: number;
    organization_total: number;
    jackpot_total: number;
  }>,
  expenses: Array<{
    amount: number;
    is_donation: boolean;
  }>,
  payouts: Array<{
    weekly_payout: number;
  }>
): CalculationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Calculate totals from individual records
  const totalSales = ticketSales.reduce((sum, sale) => sum + sale.amount_collected, 0);
  const totalOrgPortion = ticketSales.reduce((sum, sale) => sum + sale.organization_total, 0);
  const totalJackpotPortion = ticketSales.reduce((sum, sale) => sum + sale.jackpot_total, 0);
  
  const totalExpenses = expenses
    .filter(e => !e.is_donation)
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  const totalDonations = expenses
    .filter(e => e.is_donation)
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  const totalPayouts = payouts.reduce((sum, payout) => sum + payout.weekly_payout, 0);
  
  // Validation checks
  if (Math.abs((totalOrgPortion + totalJackpotPortion) - totalSales) > 0.01) {
    errors.push("Organization and jackpot portions don't sum to total sales");
  }
  
  const organizationNetProfit = totalOrgPortion - totalExpenses - totalDonations;
  if (organizationNetProfit < 0) {
    warnings.push("Organization net profit is negative");
  }
  
  if (totalPayouts > totalJackpotPortion) {
    errors.push("Total payouts exceed total jackpot portion");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedValues: {
      totalSales,
      totalOrgPortion,
      totalJackpotPortion,
      totalExpenses,
      totalDonations,
      totalPayouts,
      organizationNetProfit
    }
  };
};

// Audit trail functions
export const logCalculation = async (entry: Omit<AuditLogEntry, 'timestamp' | 'userId'>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      userId: user.id
    };

    console.log('=== CALCULATION AUDIT LOG ===');
    console.log(`Operation: ${auditEntry.operation}`);
    console.log('Inputs:', JSON.stringify(auditEntry.inputs, null, 2));
    console.log('Outputs:', JSON.stringify(auditEntry.outputs, null, 2));
    console.log('Timestamp:', auditEntry.timestamp);
    console.log('User ID:', auditEntry.userId);
    if (auditEntry.gameId) console.log('Game ID:', auditEntry.gameId);
    if (auditEntry.weekId) console.log('Week ID:', auditEntry.weekId);
    console.log('================================');

    // Store in localStorage for now (could be extended to database storage)
    const existingLogs = JSON.parse(localStorage.getItem('calculationAuditLogs') || '[]');
    existingLogs.push(auditEntry);
    
    // Keep only last 1000 entries
    if (existingLogs.length > 1000) {
      existingLogs.splice(0, existingLogs.length - 1000);
    }
    
    localStorage.setItem('calculationAuditLogs', JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Failed to log calculation:', error);
  }
};

export const getAuditLogs = (filters?: {
  operation?: string;
  gameId?: string;
  weekId?: string;
  startDate?: string;
  endDate?: string;
}): AuditLogEntry[] => {
  try {
    const logs: AuditLogEntry[] = JSON.parse(localStorage.getItem('calculationAuditLogs') || '[]');
    
    if (!filters) return logs;
    
    return logs.filter(log => {
      if (filters.operation && log.operation !== filters.operation) return false;
      if (filters.gameId && log.gameId !== filters.gameId) return false;
      if (filters.weekId && log.weekId !== filters.weekId) return false;
      if (filters.startDate && log.timestamp < filters.startDate) return false;
      if (filters.endDate && log.timestamp > filters.endDate) return false;
      return true;
    });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
};

export const validateAndLogCalculation = async <T extends Record<string, any>>(
  operation: string,
  inputs: Record<string, any>,
  calculationFn: () => T,
  validationFn?: (result: T) => CalculationResult,
  gameId?: string,
  weekId?: string
): Promise<{ result: T; validation?: CalculationResult }> => {
  const startTime = performance.now();
  
  try {
    // Perform calculation
    const result = calculationFn();
    
    // Validate if validation function provided
    let validation: CalculationResult | undefined;
    if (validationFn) {
      validation = validationFn(result);
      
      if (!validation.isValid) {
        console.error(`Calculation validation failed for ${operation}:`, validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn(`Calculation warnings for ${operation}:`, validation.warnings);
      }
    }
    
    const endTime = performance.now();
    
    // Log the calculation
    await logCalculation({
      operation,
      inputs,
      outputs: {
        ...result,
        executionTimeMs: endTime - startTime,
        validationResult: validation ? {
          isValid: validation.isValid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        } : null
      },
      gameId,
      weekId
    });
    
    return { result, validation };
  } catch (error) {
    console.error(`Calculation failed for ${operation}:`, error);
    
    await logCalculation({
      operation,
      inputs,
      outputs: {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: performance.now() - startTime
      },
      gameId,
      weekId
    });
    
    throw error;
  }
};
