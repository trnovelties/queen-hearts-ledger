import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, TrendingDown, Trophy, DollarSign } from "lucide-react";
import { formatDateStringForMediumDisplay } from "@/lib/dateUtils";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

interface GameComparisonTableProps {
  games: GameSummary[];
  formatCurrency: (amount: number) => string;
}

export function GameComparisonTable({ games, formatCurrency }: GameComparisonTableProps) {
  // Calculate performance metrics for each game
  const gameMetrics = games.map(game => {
    const profitMargin = game.total_sales > 0 ? 
      ((game.organization_net_profit / game.total_sales) * 100) : 0;
    
    const roi = game.total_expenses > 0 ? 
      ((game.organization_net_profit / game.total_expenses) * 100) : 0;
    
    const payoutEfficiency = game.total_sales > 0 ?
      ((game.total_payouts / (game.total_sales * (game.jackpot_percentage / 100))) * 100) : 0;
    
    const avgWeeklyRevenue = game.weeks.length > 0 ?
      game.total_sales / game.weeks.length : 0;
    
    const ticketsSold = Math.round(game.total_sales / (game.ticket_price || 2));
    
    return {
      ...game,
      profitMargin,
      roi,
      payoutEfficiency,
      avgWeeklyRevenue,
      ticketsSold,
      duration: game.weeks.length
    };
  });

  // Sort by total sales (descending)
  const sortedGames = gameMetrics.sort((a, b) => b.total_sales - a.total_sales);

  const getPerformanceColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      return value > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return value < 100 ? 'text-green-600' : 'text-red-600';
    }
  };

  const getStatusBadge = (game: any) => {
    if (game.end_date) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <Trophy className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-[#A1E96C]/20 text-[#132E2C] border-[#A1E96C]/30">
        <DollarSign className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <Card className="bg-white border-[#1F4E4A]/10">
      <CardHeader>
        <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Game Performance Comparison
        </CardTitle>
        <CardDescription>
          Detailed performance metrics and comparison across all games
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1F4E4A]/20">
                <TableHead className="font-semibold text-[#132E2C]">Game</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Duration</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Revenue</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Tickets Sold</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Distributions</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Net Profit</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Profit Margin</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">ROI</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Avg Weekly</TableHead>
                <TableHead className="font-semibold text-[#132E2C]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGames.map((game, index) => (
                <TableRow 
                  key={game.id} 
                  className={`border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/50 transition-colors ${
                    index === 0 ? 'bg-[#A1E96C]/5' : ''
                  }`}
                >
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-semibold text-[#1F4E4A]">{game.name}</span>
                      </div>
                      <div className="text-xs text-[#132E2C]/60">
                        {formatDateStringForMediumDisplay(game.start_date)}
                        {game.end_date && ` - ${formatDateStringForMediumDisplay(game.end_date)}`}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <div className="font-semibold text-[#1F4E4A]">{game.duration}</div>
                      <div className="text-xs text-[#132E2C]/60">weeks</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-semibold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <div className="font-semibold text-[#1F4E4A]">{game.ticketsSold.toLocaleString()}</div>
                      <div className="text-xs text-[#132E2C]/60">tickets</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-semibold text-[#1F4E4A]">{formatCurrency(game.total_payouts)}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className={`font-semibold ${getPerformanceColor(game.organization_net_profit)}`}>
                      {formatCurrency(game.organization_net_profit)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {game.profitMargin >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`font-semibold ${getPerformanceColor(game.profitMargin)}`}>
                        {game.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {game.roi >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`font-semibold ${getPerformanceColor(game.roi)}`}>
                        {game.roi.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-semibold text-[#1F4E4A]">{formatCurrency(game.avgWeeklyRevenue)}</div>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(game)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Performance Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F7F8FC] rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-[#1F4E4A]">
              {formatCurrency(sortedGames.reduce((sum, game) => sum + game.total_sales, 0))}
            </div>
            <div className="text-sm text-[#132E2C]/70">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(sortedGames.reduce((sum, game) => sum + game.organization_net_profit, 0))}
            </div>
            <div className="text-sm text-[#132E2C]/70">Total Net Profit</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#1F4E4A]">
              {sortedGames.filter(game => !game.end_date).length}
            </div>
            <div className="text-sm text-[#132E2C]/70">Active Games</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
