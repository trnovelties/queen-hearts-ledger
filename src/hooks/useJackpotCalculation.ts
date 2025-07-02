
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
    // Calculate total accumulated jackpot: current contributions + carryover from previous weeks
    const totalAccumulated = jackpotContributions + carryoverJackpot;
    
    // If total accumulated is less than minimum, show minimum
    // Otherwise, show the full accumulated amount
    if (totalAccumulated < minimumJackpot) {
      setDisplayedJackpot(minimumJackpot);
    } else {
      setDisplayedJackpot(totalAccumulated);
    }
  }, [jackpotContributions, minimumJackpot, carryoverJackpot]);

  return displayedJackpot;
};
