
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
}

// Helper function to format date for display without timezone conversion
const formatDateForDisplay = (date: Date, formatType: 'long' | 'short' = 'long'): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  if (formatType === 'long') {
    return `${monthNames[month]} ${day}, ${year}`;
  } else {
    return `${shortMonthNames[month]} ${day}, ${year}`;
  }
};

export function DatePicker({
  date,
  setDate,
  label,
  placeholder = "Select date",
  className,
  disabled = false,
  disabledDates,
}: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-between text-left font-normal border-[#1F4E4A]/20 hover:border-[#1F4E4A]/40 focus:ring-2 focus:ring-[#A1E96C]/50 focus:border-[#A1E96C]",
              !date && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            {date ? formatDateForDisplay(date, 'long') : placeholder}
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg border-[#1F4E4A]/20" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDates}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DatePickerWithInput({
  date,
  setDate,
  label,
  placeholder = "Select date",
  className,
  disabled = false,
  disabledDates,
}: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label && <label className="text-sm font-semibold text-[#132E2C]">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-between text-left font-normal border-[#1F4E4A]/20 hover:border-[#1F4E4A]/40 focus:ring-2 focus:ring-[#A1E96C]/50 focus:border-[#A1E96C] font-medium text-[#132E2C]",
              !date && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            {date ? formatDateForDisplay(date, 'short') : placeholder}
            <CalendarIcon className="h-4 w-4 opacity-50 text-[#1F4E4A]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg border-[#1F4E4A]/20" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDates}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
