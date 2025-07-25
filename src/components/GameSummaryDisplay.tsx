import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle, Info } from "lucide-react";
interface GameSummaryDisplayProps {
  game: any;
  formatCurrency: (amount: number) => string;
}
export const GameSummaryDisplay = ({
  game,
  formatCurrency
}: GameSummaryDisplayProps) => {
  if (!game.end_date) {
    return null; // Only show for completed games
  }

  // Calculate total tickets sold across all weeks
  const totalTicketsSold = game.weeks.reduce((total: number, week: any) => {
    const weekTicketsSold = week.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.tickets_sold || 0), 0) || 0;
    return total + weekTicketsSold;
  }, 0);

  // No longer needed - using database values directly

  // Use database values directly instead of recalculating
  const weeklyPayoutsDistributed = game.weekly_payouts_distributed || 0;
  const finalJackpotPayout = game.final_jackpot_payout || 0;
  const netJackpotContributions = game.net_available_for_final_winner || 0;
  const jackpotShortfall = game.jackpot_shortfall_covered || 0;
  const totalPayouts = game.total_payouts || 0;

  // Use the database value directly
  const actualOrganizationNetProfit = game.actual_organization_net_profit || 0;
  const isProfitable = actualOrganizationNetProfit >= 0;
  const hasShortfall = jackpotShortfall > 0;
  return <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
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

          {/* Actual Organization Net Profit */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-5 w-5 ${isProfitable ? 'text-green-600' : 'text-red-600'}`} />
              <h4 className="font-semibold text-gray-700">Actual Organization Net Profit</h4>
              {hasShortfall && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(actualOrganizationNetProfit)}
              </p>
              <p className="text-sm text-gray-600">After jackpot shortfall coverage</p>
            </div>
          </div>

          {/* Total Payouts */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-700">Total Distribution</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPayouts)}</p>
              <p className="text-sm text-gray-600">Weekly + Final jackpot distributions</p>
            </div>
          </div>
        </div>

        {/* Jackpot Analysis Section - Only show if there's a shortfall */}
        {hasShortfall && <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-orange-800">Jackpot Shortfall Analysis</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Jackpot Contributions:</p>
                <p className="font-medium text-gray-800">{formatCurrency(game.total_jackpot_contributions || 0)}</p>
              </div>
              <div>
                <p className="text-gray-600">Weekly Distributions Distributed:</p>
                <p className="font-medium text-gray-800">{formatCurrency(weeklyPayoutsDistributed)}</p>
              </div>
              <div>
                <p className="text-gray-600">Net Available for Final Winner:</p>
                <p className="font-medium text-gray-800">{formatCurrency(netJackpotContributions)}</p>
              </div>
              <div>
                <p className="text-gray-600">Shortfall Covered by Organization:</p>
                <p className="font-medium text-orange-600">{formatCurrency(jackpotShortfall)}</p>
              </div>
            </div>
          </div>}

        {/* Detailed Financial Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Financial Summary */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Financial Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Organization Net (Before Shortfall):</span>
                <span className="font-medium">{formatCurrency(game.organization_net_profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Regular Expenses:</span>
                <span className="font-medium">{formatCurrency(game.total_expenses)}</span>
              </div>
              {hasShortfall && <div className="flex justify-between text-orange-600">
                  <span>Shortfall Coverage (Additional Expense):</span>
                  <span className="font-medium">{formatCurrency(jackpotShortfall)}</span>
                </div>}
              <div className="flex justify-between">
                <span className="text-gray-600">Total Donations:</span>
                <span className="font-medium">{formatCurrency(game.total_donations)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Actual Organization Net Profit:</span>
                <div className="flex items-center gap-1">
                  {isProfitable ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  <span className={`font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(actualOrganizationNetProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Game Details */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Game Completion Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Minimum Starting Jackpot:</span>
                <span className="font-medium">{formatCurrency(game.minimum_starting_jackpot || 500)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Jackpot Contributions:</span>
                <span className="font-medium text-green-600">{formatCurrency(game.total_jackpot_contributions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly Distributions Distributed:</span>
                <span className="font-medium text-red-600">{formatCurrency(weeklyPayoutsDistributed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Carryover from Previous:</span>
                <span className="font-medium">{formatCurrency(game.carryover_jackpot || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next game Contribution:</span>
                <span className="font-medium text-red-600">{formatCurrency(game.jackpot_contribution_to_next_game || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-bold">Net Available for Final Winner:</span>
                <span className="font-bold text-green-600">{formatCurrency(netJackpotContributions)}</span>
              </div>
              {jackpotShortfall > 0 && <div className="flex justify-between">
                  <span className="text-gray-600">Final Winner Actually Received:</span>
                  <span className="font-bold text-green-600">{formatCurrency(finalJackpotPayout)}</span>
                </div>}
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
            with {totalTicketsSold.toLocaleString()} tickets sold. Total distributions were {formatCurrency(totalPayouts)}.
            {hasShortfall && <> The organization covered a {formatCurrency(jackpotShortfall)} shortfall to meet the jackpot obligation.</>}
            The actual organization net profit after all expenses, donations{hasShortfall ? ', and jackpot shortfall coverage' : ''} is {formatCurrency(actualOrganizationNetProfit)}. 
            {isProfitable ? 'The organization maintained profitability.' : 'The organization experienced a net loss due to jackpot obligations exceeding available funds.'}
          </p>
        </div>
      </CardContent>
    </Card>;
};