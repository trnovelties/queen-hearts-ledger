
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { WeekManagement } from './WeekManagement';
import { ExpenseSection } from './ExpenseSection';

interface GameCardProps {
  game: any;
  expandedGame: string | null;
  expandedWeek: string | null;
  expandedExpenses: string | null;
  onToggleGame: (gameId: string) => void;
  onToggleWeek: (weekId: string) => void;
  onToggleExpenses: (gameId: string) => void;
  onOpenWeekForm: (gameId: string) => void;
  onOpenDeleteConfirm: (id: string, type: "game" | "week" | "entry" | "expense") => void;
  onGeneratePdfReport: (game: any) => void;
  onOpenExpenseModal: (gameId: string, gameName: string) => void;
  onOpenDonationModal: (gameId: string, gameName: string, date?: string) => void;
  onOpenDailyExpenseModal: (date: string, gameId: string) => void;
  currentGameId: string | null;
  setCurrentGameId: (id: string | null) => void;
  games: any[];
  setGames: (games: any[]) => void;
  onRefreshData?: () => void;
}

export const GameCard = ({
  game,
  expandedGame,
  expandedWeek,
  expandedExpenses,
  onToggleGame,
  onToggleWeek,
  onToggleExpenses,
  onOpenWeekForm,
  onOpenDeleteConfirm,
  onGeneratePdfReport,
  onOpenExpenseModal,
  onOpenDonationModal,
  onOpenDailyExpenseModal,
  currentGameId,
  setCurrentGameId,
  games,
  setGames,
  onRefreshData
}: GameCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate actual start and end dates from weeks data
  const gameStartDate = game.weeks.length > 0 
    ? game.weeks.reduce((earliest: any, week: any) => 
        new Date(week.start_date) < new Date(earliest.start_date) ? week : earliest
      ).start_date 
    : game.start_date;

  const gameEndDate = game.weeks.length > 0 
    ? game.weeks.reduce((latest: any, week: any) => 
        new Date(week.end_date) > new Date(latest.end_date) ? week : latest
      ).end_date 
    : game.end_date;

  // Create wrapper handlers for daily modals
  const handleDailyExpense = (date: string, gameId: string) => {
    onOpenDailyExpenseModal(date, gameId);
  };

  const handleDailyDonation = (date: string, gameId: string) => {
    onOpenDonationModal(gameId, game.name, date);
  };

  return (
    <Card key={game.id} className="overflow-hidden">
      <CardHeader 
        className={`flex flex-col items-start justify-between cursor-pointer ${
          expandedGame === game.id ? 'bg-accent/50' : ''
        }`}
        onClick={() => onToggleGame(game.id)}
      >
        <div className="w-full flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            {game.name}
            {game.end_date && (
              <span className="ml-2 text-sm text-green-600 font-normal">(Completed)</span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="text-sm hidden md:flex space-x-4 ml-auto">
              <div>
                {(() => {
                  const formatDateForRange = (dateString: string): string => {
                    const [year, month, day] = dateString.split('-');
                    const monthNames = [
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ];
                    const monthIndex = parseInt(month, 10) - 1;
                    const monthName = monthNames[monthIndex];
                    const dayNumber = parseInt(day, 10);
                    return `${monthName} ${dayNumber}`;
                  };

                  const startFormatted = formatDateForRange(gameStartDate);
                  const endFormatted = gameEndDate ? formatDateForRange(gameEndDate) : null;
                  const year = gameEndDate ? gameEndDate.split('-')[0] : gameStartDate.split('-')[0];

                  return gameEndDate 
                    ? `${startFormatted} - ${endFormatted}, ${year}`
                    : `${startFormatted}, ${year}`;
                })()}
              </div>
              <div>
                <span className="text-muted-foreground">Total Tickets Sold:</span> {game.weeks.reduce((total: number, week: any) => {
                  const weekTicketsSold = week.ticket_sales?.reduce((weekTotal: number, sale: any) => weekTotal + (sale.tickets_sold || 0), 0) || 0;
                  return total + weekTicketsSold;
                }, 0).toLocaleString()}
              </div>
              <div>
                <div>
                  <span className="text-muted-foreground">Total Sales:</span> {formatCurrency(game.weeks.reduce((total: number, week: any) => {
                    const weekTotalSales = week.ticket_sales?.reduce((weekTotal: number, sale: any) => weekTotal + (sale.amount_collected || 0), 0) || 0;
                    return total + weekTotalSales;
                  }, 0) + (game.carryover_jackpot || 0))}
                </div>
                {game.carryover_jackpot > 0 && (
                  <div className="text-xs text-muted-foreground/70">
                    (includes {formatCurrency(game.carryover_jackpot)} from previous game)
                  </div>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Organization:</span> {formatCurrency(game.weeks.reduce((total: number, week: any) => {
                  const weekOrganizationTotal = week.ticket_sales?.reduce((weekTotal: number, sale: any) => weekTotal + (sale.organization_total || 0), 0) || 0;
                  return total + weekOrganizationTotal;
                }, 0))}
              </div>
              <div>
                <span className="text-muted-foreground">Jackpot Total:</span> {formatCurrency(game.weeks.reduce((total: number, week: any) => {
                  const weekJackpotTotal = week.ticket_sales?.reduce((weekTotal: number, sale: any) => weekTotal + (sale.jackpot_total || 0), 0) || 0;
                  let runningTotal = total + weekJackpotTotal;
                  
                  // For Queen of Hearts weeks, show the jackpot total before payout (what the winner received)
                  if (week.card_selected === 'Queen of Hearts') {
                    // Don't deduct Queen of Hearts payout - show the full jackpot that was won
                    return runningTotal;
                  }
                  
                  // Deduct weekly payout if there's a winner (but not Queen of Hearts)
                  if (week.winner_name && week.weekly_payout && week.card_selected !== 'Queen of Hearts') {
                    runningTotal -= week.weekly_payout;
                  }
                  
                  return runningTotal;
                }, 0))}
              </div>
              {game.end_date && (
                <div>
                  <span className="text-muted-foreground">Profit:</span> {formatCurrency(game.actual_organization_net_profit)}
                </div>
              )}
            </div>
            
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDeleteConfirm(game.id, 'game');
              }}
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center">
              {expandedGame === game.id ? (
                <ChevronUp className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {expandedGame === game.id && (
        <CardContent className="p-0 border-t">
          <WeekManagement
            game={game}
            expandedWeek={expandedWeek}
            onToggleWeek={onToggleWeek}
            onOpenWeekForm={onOpenWeekForm}
            onGeneratePdfReport={onGeneratePdfReport}
            currentGameId={currentGameId}
            setCurrentGameId={setCurrentGameId}
            games={games}
            setGames={setGames}
            onRefreshData={onRefreshData}
            onOpenExpenseModal={handleDailyExpense}
            onOpenDonationModal={handleDailyDonation}
            onDeleteWeek={(weekId) => onOpenDeleteConfirm(weekId, 'week')}
          />
          
          <ExpenseSection
            game={game}
            expandedExpenses={expandedExpenses}
            onToggleExpenses={onToggleExpenses}
            onOpenExpenseModal={onOpenExpenseModal}
            onOpenDeleteConfirm={onOpenDeleteConfirm}
          />
        </CardContent>
      )}
    </Card>
  );
};
