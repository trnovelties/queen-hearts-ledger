
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  validateTicketSalesCalculation,
  validateJackpotCalculation,
  validateGameTotals,
  validateAndLogCalculation,
  CalculationResult
} from '@/utils/calculationValidation';

export const useCalculationValidation = () => {
  const showValidationResults = useCallback((validation: CalculationResult, operation: string) => {
    if (!validation.isValid) {
      toast.error(`${operation} Validation Failed`, {
        description: validation.errors.join(', ')
      });
    } else if (validation.warnings.length > 0) {
      toast.warning(`${operation} Warnings`, {
        description: validation.warnings.join(', ')
      });
    } else {
      toast.success(`${operation} Validation Passed`);
    }
  }, []);

  const validateTicketSales = useCallback((
    ticketsSold: number,
    ticketPrice: number,
    organizationPercentage: number,
    jackpotPercentage: number,
    showToast = true
  ) => {
    const validation = validateTicketSalesCalculation(
      ticketsSold,
      ticketPrice,
      organizationPercentage,
      jackpotPercentage
    );

    if (showToast) {
      showValidationResults(validation, 'Ticket Sales');
    }

    return validation;
  }, [showValidationResults]);

  const validateJackpot = useCallback((
    jackpotContributions: number,
    minimumJackpot: number,
    carryoverJackpot: number = 0,
    showToast = true
  ) => {
    const validation = validateJackpotCalculation(
      jackpotContributions,
      minimumJackpot,
      carryoverJackpot
    );

    if (showToast) {
      showValidationResults(validation, 'Jackpot');
    }

    return validation;
  }, [showValidationResults]);

  const validateGame = useCallback((
    ticketSales: Array<{ amount_collected: number; organization_total: number; jackpot_total: number }>,
    expenses: Array<{ amount: number; is_donation: boolean }>,
    payouts: Array<{ weekly_payout: number }>,
    showToast = true
  ) => {
    const validation = validateGameTotals(ticketSales, expenses, payouts);

    if (showToast) {
      showValidationResults(validation, 'Game Totals');
    }

    return validation;
  }, [showValidationResults]);

  const validateAndLog = useCallback(validateAndLogCalculation, []);

  return {
    validateTicketSales,
    validateJackpot,
    validateGame,
    validateAndLog,
    showValidationResults
  };
};
