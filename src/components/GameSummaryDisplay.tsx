
import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, DollarSign, Users, Target } from "lucide-react";

interface GameSummaryDisplayProps {
  game: any;
  formatCurrency: (amount: number) => string;
}

export const GameSummaryDisplay = ({ game, formatCurrency }: GameSummaryDisplayProps) => {
  if (!game.end_date) {
    return null; // Only show for completed games
  }

  // Calculate total tickets sold across all weeks
  const totalTicketsSold = game.weeks.reduce((total: number, week: any) => {
    return total + (week.weekly_tickets_sold || 0);
  }, 0);

  // Calculate total jackpot pool from all weeks' contributions
  const totalJackpotPool = game.weeks.reduce((total: number, week: any) => {
    const weekJackpotContributions = week.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
    return total + weekJackpotContributions;
  }, 0) + (game.carryover_jackpot || 0);

  const isProfitable = game.game_profit_loss >= 0;

  return (
    <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">{game.name}</h3>
              <p className="text-sm text-gray-600">
                {formatDateStringForDisplay(game.start_date)} - {formatDateStringForDisplay(game.end_date)}
              </p>
            </div>
          </div>
          <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1">
            GAME COMPLETED
          </Badge>
        </div>

        {/* Main Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Ticket Sales Summary */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-700">Total Sales</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(game.total_sales)}</p>
              <p className="text-sm text-gray-600">{totalTicketsSold.toLocaleString()} tickets sold</p>
            </div>
          </div>

          {/* Organization Net Profit */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-700">Organization Net</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</p>
              <p className="text-sm text-gray-600">After expenses & donations</p>
            </div>
          </div>

          {/* Total Jackpot Pool */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-700">Total Jackpot Pool</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalJackpotPool)}</p>
              <p className="text-sm text-gray-600">Including carryover</p>
            </div>
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Payouts & Expenses */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Financial Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Payouts:</span>
                <span className="font-medium">{formatCurrency(game.total_payouts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Expenses:</span>
                <span className="font-medium">{formatCurrency(game.total_expenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Donations:</span>
                <span className="font-medium">{formatCurrency(game.total_donations)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Game Profit/Loss:</span>
                <div className="flex items-center gap-1">
                  {isProfitable ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(game.game_profit_loss))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Next Game Contribution */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Game Completion Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Jackpot Contribution to Next Game:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(game.jackpot_contribution_to_next_game)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Game Duration:</span>
                <span className="font-medium">{game.weeks.length} weeks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Organization Percentage:</span>
                <span className="font-medium">{game.organization_percentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Jackpot Percentage:</span>
                <span className="font-medium">{game.jackpot_percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Game Summary:</strong> This {game.weeks.length}-week game generated {formatCurrency(game.total_sales)} in total sales 
            with {totalTicketsSold.toLocaleString()} tickets sold. The organization earned a net profit of {formatCurrency(game.organization_net_profit)} 
            after all expenses and donations. {isProfitable ? 'The game was profitable overall.' : 'The game resulted in a net loss due to jackpot payouts.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
