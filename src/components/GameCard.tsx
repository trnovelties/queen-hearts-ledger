
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
            <div className="text-sm hidden md:flex space-x-4">
              <div>
                <span className="text-muted-foreground">Start:</span> {formatDateStringForDisplay(gameStartDate)}
                {gameEndDate && (
                  <>
                    <span className="ml-4 text-muted-foreground">End:</span> {formatDateStringForDisplay(gameEndDate)}
                  </>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Total Tickets Sold:</span> {game.weeks.reduce((total: number, week: any) => total + (week.weekly_tickets_sold || 0), 0).toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Total Sales:</span> {formatCurrency(game.total_sales)}
                {game.carryover_jackpot > 0 && (
                  <span className="text-xs text-muted-foreground/70 ml-1">
                    (includes {formatCurrency(game.carryover_jackpot)} from previous game)
                  </span>
                )}
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
