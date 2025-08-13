import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithInput } from '@/components/ui/datepicker';
import { formatDateStringForDisplay, getTodayDateString } from '@/lib/dateUtils';

interface ExpenseDonationCardProps {
  gameId: string;
  onOpenExpenseModal: (date: string, gameId: string) => void;
  onOpenDonationModal: (date: string, gameId: string) => void;
}

export const ExpenseDonationCard = ({ 
  gameId, 
  onOpenExpenseModal, 
  onOpenDonationModal 
}: ExpenseDonationCardProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedType, setSelectedType] = useState<string>('');

  const handleAddEntry = () => {
    if (!selectedDate || !selectedType) return;
    
    const dateString = selectedDate.toISOString().split('T')[0];
    
    if (selectedType === 'donation') {
      onOpenDonationModal(dateString, gameId);
    } else if (selectedType === 'expense') {
      onOpenExpenseModal(dateString, gameId);
    }
    
    // Reset the form
    setSelectedType('');
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-[#1F4E4A]">Add Expense/Donation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="entry-date" className="text-sm font-medium text-gray-600">
              Date
            </Label>
            <DatePickerWithInput
              date={selectedDate}
              setDate={setSelectedDate}
              placeholder="Select date"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="entry-type" className="text-sm font-medium text-gray-600">
              Type
            </Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="donation">Donation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleAddEntry}
            disabled={!selectedDate || !selectedType}
            className="w-full bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
          >
            Add Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};