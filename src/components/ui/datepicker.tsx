
import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
}

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
            {date ? format(date, "PPP") : placeholder}
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
          <div className="relative w-full">
            <Input
              value={date ? format(date, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const inputDate = e.target.value;
                if (inputDate) {
                  const newDate = new Date(inputDate);
                  if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                  }
                } else {
                  setDate(undefined);
                }
              }}
              placeholder={placeholder}
              className={cn(
                "w-full pr-10 border-[#1F4E4A]/20 focus:ring-2 focus:ring-[#A1E96C]/50 focus:border-[#A1E96C] font-medium text-[#132E2C] placeholder:text-[#132E2C]/50",
                disabled && "opacity-50 cursor-not-allowed bg-gray-50"
              )}
              disabled={disabled}
              type="date"
            />
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none text-[#1F4E4A]" />
          </div>
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
