
import { useEffect, useState } from 'react';

interface JackpotCalculationParams {
  jackpotContributions: number;
  minimumJackpot: number;
  carryoverJackpot?: number;
}

export const useJackpotCalculation = ({
  jackpotContributions,
  minimumJackpot,
  carryoverJackpot = 0
}: JackpotCalculationParams) => {
  const [displayedJackpot, setDisplayedJackpot] = useState(0);

  useEffect(() => {
    // If contributions haven't reached minimum, show minimum + carryover
    if (jackpotContributions < minimumJackpot) {
      setDisplayedJackpot(minimumJackpot + carryoverJackpot);
    } else {
      // Once threshold is met, show contributions + carryover
      setDisplayedJackpot(jackpotContributions + carryoverJackpot);
    }
  }, [jackpotContributions, minimumJackpot, carryoverJackpot]);

  return displayedJackpot;
};
