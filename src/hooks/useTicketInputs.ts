
import { useState } from 'react';

export const useTicketInputs = () => {
  const [tempTicketInputs, setTempTicketInputs] = useState<{[key: string]: string}>({});

  const handleTicketInputChange = (weekId: string, dayIndex: number, value: string) => {
    const key = `${weekId}-${dayIndex}`;
    setTempTicketInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearTicketInput = (weekId: string, dayIndex: number) => {
    const key = `${weekId}-${dayIndex}`;
    setTempTicketInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[key];
      return newInputs;
    });
  };

  return {
    tempTicketInputs,
    handleTicketInputChange,
    clearTicketInput
  };
};
