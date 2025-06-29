
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { useTicketSales } from '@/hooks/useTicketSales';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

interface TicketSalesTableProps {
  week: any;
  game: any;
  currentGameId: string | null;
  games: any[];
  setGames: (games: any[]) => void;
  onToggleWeek: (weekId: string | null) => void;
  onOpenWinnerForm?: (gameId: string, weekId: string) => void;
}

export const TicketSalesTable = ({
  week,
  game,
  currentGameId,
  games,
  setGames,
  onToggleWeek,
  onOpenWinnerForm
}: TicketSalesTableProps) => {
  const { handleTicketInputChange, handleTicketInputSubmit, tempTicketInputs } = useTicketSales();
  const [displayedEndingJackpot, setDisplayedEndingJackpot] = useState<number>(0);
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Check if week is complete (has all 7 days with ticket entries)
  const isWeekComplete = () => {
    const entriesWithTickets = week.ticket_sales.filter((entry: any) => entry.tickets_sold > 0);
    return entriesWithTickets.length === 7;
  };

  // Check if week already has a winner
  const hasWinner = () => {
    return week.winner_name && week.winner_name.trim() !== '';
  };

  // Should show "Add Winner Details" button
  const shouldShowWinnerButton = () => {
    return isWeekComplete() && !hasWinner();
  };

  // Calculate week totals from daily entries
  const weekTotalTickets = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.tickets_sold, 0);
  const weekTotalSales = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.amount_collected, 0);
  const weekOrganizationTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.organization_total, 0);
  const weekJackpotTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.jackpot_total, 0);

  // Calculate displayed ending jackpot based on week completion status
  useEffect(() => {
    const calculateDisplayedEndingJackpot = async () => {
      if (week.winner_name && week.ending_jackpot !== null && week.ending_jackpot !== undefined) {
        // Week is completed - use the stored ending jackpot value from database
        console.log('Using stored ending jackpot for completed week:', week.ending_jackpot);
        setDisplayedEndingJackpot(week.ending_jackpot);
      } else {
        // Week is not completed - calculate current jackpot dynamically
        try {
          // Get previous week's stored ending jackpot as starting point
          let previousEndingJackpot = 0;
          if (week.week_number > 1) {
            const { data: previousWeek, error } = await supabase
              .from('weeks')
              .select('ending_jackpot')
              .eq('game_id', game.id)
              .eq('week_number', week.week_number - 1)
              .eq('user_id', user?.id)
              .single();

            if (!error && previousWeek && previousWeek.ending_jackpot !== null) {
              previousEndingJackpot = previousWeek.ending_jackpot;
              console.log('Found previous week ending jackpot:', previousEndingJackpot);
            } else {
              // Fallback to game carryover if previous week not found or has no ending jackpot
              console.log('No previous week ending jackpot found, using game carryover:', game.carryover_jackpot);
              previousEndingJackpot = game.carryover_jackpot || 0;
            }
          } else {
            // Week 1 starts with game's carryover jackpot
            previousEndingJackpot = game.carryover_jackpot || 0;
            console.log('Week 1, using game carryover jackpot:', previousEndingJackpot);
          }

          // Add current week's jackpot contributions to get the current running total
          const currentJackpotTotal = previousEndingJackpot + weekJackpotTotal;
          console.log('Calculating current jackpot for incomplete week:');
          console.log('Previous ending jackpot:', previousEndingJackpot);
          console.log('Current week contributions:', weekJackpotTotal);
          console.log('Current total jackpot:', currentJackpotTotal);
          
          setDisplayedEndingJackpot(currentJackpotTotal);
        } catch (error) {
          console.error('Error calculating current jackpot:', error);
          // Fallback calculation
          const fallbackJackpot = (game.carryover_jackpot || 0) + weekJackpotTotal;
          console.log('Using fallback calculation:', fallbackJackpot);
          setDisplayedEndingJackpot(fallbackJackpot);
        }
      }
    };

    calculateDisplayedEndingJackpot();
  }, [week, game.id, game.carryover_jackpot, weekJackpotTotal, user?.id]);

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
      {/* Week Details Header */}
      <div className="pb-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-2xl font-bold text-[#1F4E4A] mb-2">Week {week.week_number}</h4>
            <p className="text-gray-600 text-lg">
              {formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWeek(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Week Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{weekTotalTickets}</div>
            <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
            <div className="text-sm text-green-600 font-medium">Total Sales</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
            <div className="text-sm text-purple-600 font-medium">Organization Net</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
            <div className="text-sm text-orange-600 font-medium">Jackpot Total</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="text-2xl font-bold text-indigo-700">{formatCurrency(displayedEndingJackpot)}</div>
            <div className="text-sm text-indigo-600 font-medium">
              {week.winner_name ? 'Ending Jackpot' : 'Current Jackpot'}
            </div>
          </div>
        </div>
        
        {/* Winner Information */}
        {week.winner_name && (
          <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
            <h5 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
              🏆 Winner Information
            </h5>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-yellow-700">Winner Name</div>
                <div className="text-yellow-900 font-semibold">{week.winner_name}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-yellow-700">Slot Selected</div>
                <div className="text-yellow-900 font-semibold">#{week.slot_chosen}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-yellow-700">Card Drawn</div>
                <div className="text-yellow-900 font-semibold">{week.card_selected}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-yellow-700">Payout Amount</div>
                <div className="text-yellow-900 font-semibold">{formatCurrency(week.weekly_payout)}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-yellow-700">Winner Present</div>
                <div className={`font-semibold ${week.winner_present ? 'text-green-600' : 'text-red-600'}`}>
                  {week.winner_present ? '✓ Yes' : '✗ No'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Winner Details Button */}
        {shouldShowWinnerButton() && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-lg font-semibold text-green-800 mb-1">Week Complete!</h5>
                <p className="text-sm text-green-700">All 7 days have ticket sales. Ready to select a winner.</p>
              </div>
              <Button
                onClick={() => onOpenWinnerForm && onOpenWinnerForm(game.id, week.id)}
                className="bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A] font-semibold px-6 py-2"
              >
                Add Winner Details
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* 7 Daily Entries */}
      <div className="pt-6">
        <h5 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Daily Entries (7 Days)</h5>
        
        <div className="space-y-3 h-fit">
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const weekStartDate = new Date(week.start_date);
            const entryDate = new Date(weekStartDate);
            entryDate.setDate(entryDate.getDate() + dayIndex);

            // Find existing entry for this specific date
            const existingEntry = week.ticket_sales.find((entry: any) => {
              const existingDate = new Date(entry.date);
              return existingDate.toDateString() === entryDate.toDateString();
            });

            const inputKey = `${week.id}-${dayIndex}`;
            const tempValue = tempTicketInputs[inputKey];
            const currentValue = tempValue !== undefined ? tempValue : (existingEntry?.tickets_sold || '');

            return (
              <div key={dayIndex} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-gray-900">
                    Day {dayIndex + 1}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDateStringForDisplay(entryDate.toISOString().split('T')[0])}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Tickets Sold</label>
                    <Input
                      type="number"
                      min="0"
                      value={currentValue}
                      onChange={(e) => handleTicketInputChange(week.id, dayIndex, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTicketInputSubmit(week.id, dayIndex, e.currentTarget.value, currentGameId!, games, setGames);
                        }
                      }}
                      onBlur={(e) => {
                        handleTicketInputSubmit(week.id, dayIndex, e.target.value, currentGameId!, games, setGames);
                      }}
                      className="w-28 h-9 text-center font-medium"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Quick Add</label>
                    <Select onValueChange={(value) => {
                      if (value === 'donation') {
                        // Handle donation modal opening
                      } else if (value === 'expense') {
                        // Handle expense modal opening
                      }
                    }}>
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue placeholder="+" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donation">Donation</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {existingEntry && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Day Total</label>
                      <div className="text-sm font-bold px-3 py-2 bg-blue-100 text-blue-800 rounded border border-blue-200 min-w-[80px] text-center">
                        {formatCurrency(existingEntry.amount_collected)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
