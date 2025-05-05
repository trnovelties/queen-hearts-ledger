
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
              "w-full justify-between text-left font-normal",
              !date && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            {date ? format(date, "PPP") : placeholder}
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDates}
            initialFocus
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
      {label && <label className="text-sm font-medium">{label}</label>}
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
              className="w-full pr-10"
              disabled={disabled}
              type="text"
            />
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDates}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
