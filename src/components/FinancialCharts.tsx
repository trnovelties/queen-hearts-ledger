import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { 
  ComposedChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  AreaChart
} from "recharts";
import { Tables } from "@/integrations/supabase/types";
import { formatDateStringForShortDisplay } from "@/lib/dateUtils";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

interface FinancialChartsProps {
  games: GameSummary[];
  reportType: "weekly" | "game" | "cumulative";
  selectedGame?: string;
}

export function FinancialCharts({ games, reportType, selectedGame }: FinancialChartsProps) {
  const [selectedJackpotGame, setSelectedJackpotGame] = useState<string>("");
  
  // Update selectedJackpotGame when games data is available
  useEffect(() => {
    if (games.length > 0 && !selectedJackpotGame) {
      const game1 = games.find(game => game.name === "Game 1");
      setSelectedJackpotGame(game1?.id || games[0]?.id || "");
    }
  }, [games, selectedJackpotGame]);
  
  const [selectedMetric, setSelectedMetric] = useState<"income" | "expense">("expense");
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate jackpot increase data for selected game
  const generateJackpotIncreaseData = () => {
    const selectedGameData = games.find(game => game.id === selectedJackpotGame);
    if (!selectedGameData) return [];

    const sortedWeeks = selectedGameData.weeks.sort((a, b) => a.week_number - b.week_number);
    
    return sortedWeeks.map((week, index) => {
      // Calculate jackpot increase: current week's ending jackpot - previous week's ending jackpot
      const previousWeek = index > 0 ? sortedWeeks[index - 1] : null;
      const jackpotIncrease = previousWeek 
        ? (week.ending_jackpot || 0) - (previousWeek.ending_jackpot || 0)
        : week.ending_jackpot || 0;

      return {
        name: `Week ${week.week_number}`,
        weekNumber: week.week_number,
        jackpotIncrease: Math.max(0, jackpotIncrease), // Ensure non-negative
        endingJackpot: week.ending_jackpot || 0,
        startDate: formatDateStringForShortDisplay(week.start_date)
      };
    });
  };

  // Generate chart data based on report type
  const generateChartData = () => {
    if (reportType === "weekly") {
      const weeklyData: { [key: string]: any } = {};
      
      games.forEach(game => {
        game.weeks.forEach(week => {
          const weekKey = selectedGame === "all" ? 
            `${game.name} - Week ${week.week_number}` : 
            `Week ${week.week_number} (${formatDateStringForShortDisplay(week.start_date)})`;
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              name: weekKey,
              Revenue: 0,
              Distributions: 0,
              Expenses: 0,
              Donations: 0,
              NetProfit: 0,
              TicketsSold: 0,
              gameName: game.name,
              weekNumber: week.week_number,
              startDate: week.start_date
            };
          }
          
          weeklyData[weekKey].Revenue += week.weekly_sales;
          weeklyData[weekKey].Distributions += week.weekly_payout;
          weeklyData[weekKey].TicketsSold += week.weekly_tickets_sold;
        });
        
        // Add expenses for each week
        game.expenses.forEach(expense => {
          const expenseWeek = game.weeks.find(week => 
            expense.date >= week.start_date && expense.date <= week.end_date
          );
          
          if (expenseWeek) {
            const weekKey = selectedGame === "all" ? 
              `${game.name} - Week ${expenseWeek.week_number}` : 
              `Week ${expenseWeek.week_number} (${formatDateStringForShortDisplay(expenseWeek.start_date)})`;
            
            if (weeklyData[weekKey]) {
              if (expense.is_donation) {
                weeklyData[weekKey].Donations += expense.amount;
              } else {
                weeklyData[weekKey].Expenses += expense.amount;
              }
            }
          }
        });
      });
      
      // Calculate net profit for each week
      Object.values(weeklyData).forEach((week: any) => {
        const orgPortion = week.Revenue * 0.4; // Assuming 40% organization share
        week.NetProfit = orgPortion - week.Expenses - week.Donations;
      });
      
      // Sort by date for better visualization
      return Object.values(weeklyData).sort((a: any, b: any) => {
        if (a.gameName !== b.gameName) {
          return a.gameName.localeCompare(b.gameName);
        }
        return a.weekNumber - b.weekNumber;
      });
    }
    
    if (reportType === "game") {
      return games.map(game => ({
        name: game.name,
        Revenue: game.total_sales,
        Distributions: game.total_jackpot_contributions || 0,
        Expenses: game.total_expenses,
        Donations: game.total_donations,
        NetProfit: game.actual_organization_net_profit || 0,
        TicketsSold: Math.round(game.total_sales / (game.ticket_price || 2)),
        WeeksPlayed: game.weeks.length,
        AvgWeeklyRevenue: game.weeks.length > 0 ? game.total_sales / game.weeks.length : 0
      }));
    }
    
    // Cumulative data
    return [{
      name: "Total Performance",
      Revenue: games.reduce((sum, game) => sum + game.total_sales, 0),
      Distributions: games.reduce((sum, game) => sum + game.total_payouts, 0),
      Expenses: games.reduce((sum, game) => sum + game.total_expenses, 0),
      Donations: games.reduce((sum, game) => sum + game.total_donations, 0),
      NetProfit: games.reduce((sum, game) => sum + game.organization_net_profit, 0),
      TicketsSold: games.reduce((sum, game) => sum + Math.round(game.total_sales / (game.ticket_price || 2)), 0),
      TotalGames: games.length,
      TotalWeeks: games.reduce((sum, game) => sum + game.weeks.length, 0)
    }];
  };

  const chartData = generateChartData();

  // Expense breakdown data for pie chart
  const expenseBreakdown = [
    { 
      name: 'Donations', 
      value: games.reduce((sum, game) => sum + game.total_donations, 0),
      color: '#8b5cf6'
    },
    { 
      name: 'Expenses', 
      value: games.reduce((sum, game) => sum + game.total_expenses, 0),
      color: '#ef4444'
    },
    { 
      name: 'Net Profit', 
      value: games.reduce((sum, game) => sum + game.organization_net_profit, 0),
      color: '#1F4E4A'
    }
  ];

  const chartColors = {
    primary: '#1F4E4A',
    secondary: '#A1E96C',
    accent: '#132E2C',
    expense: '#ef4444',
    donation: '#8b5cf6',
    profit: '#10b981'
  };

  // Performance trend data for line chart
  const generatePerformanceTrend = () => {
    if (reportType === "weekly" && chartData.length > 1) {
      return chartData.map((week: any, index: number) => ({
        ...week,
        CumulativeRevenue: chartData.slice(0, index + 1).reduce((sum: number, w: any) => sum + w.Revenue, 0),
        CumulativeProfit: chartData.slice(0, index + 1).reduce((sum: number, w: any) => sum + w.NetProfit, 0)
      }));
    }
    return chartData;
  };

  const trendData = generatePerformanceTrend();

  return (
    <div className="space-y-6">
      {/* Game Comparison Chart */}
      <Card className="bg-white border-[#1F4E4A]/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-[#1F4E4A] font-inter">
              {reportType === "weekly" ? "Weekly Performance" : 
               reportType === "game" ? "Game Comparison" : 
               "Overall Performance"}
            </CardTitle>
            <CardDescription>
              {selectedMetric === "income" ? "Income (Net Profit) analysis" : "Expense (Distribution) analysis"}
            </CardDescription>
          </div>
          <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as "income" | "expense")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F4E4A20" />
                <XAxis 
                  dataKey="name" 
                  stroke="#132E2C" 
                  fontSize={12}
                  tick={{ fill: "#132E2C" }}
                  angle={reportType === "weekly" ? -45 : 0}
                  textAnchor={reportType === "weekly" ? "end" : "middle"}
                  height={reportType === "weekly" ? 60 : 30}
                />
                <YAxis 
                  stroke="#132E2C" 
                  fontSize={12}
                  tick={{ fill: "#132E2C" }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #1F4E4A20',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                {selectedMetric === "income" ? (
                  <Line 
                    type="monotone" 
                    dataKey="NetProfit" 
                    stroke={chartColors.secondary} 
                    strokeWidth={3}
                    dot={{ fill: chartColors.secondary, r: 5 }}
                    name="Income (Net Profit)"
                  />
                ) : (
                  <Bar 
                    dataKey="Distributions" 
                    fill={chartColors.primary} 
                    radius={[4, 4, 0, 0]}
                    name="Expense (Distribution)"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Jackpot Increase Analysis */}
      <Card className="bg-white border-[#1F4E4A]/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-[#1F4E4A] font-inter">
              Jackpot Increase Per Week
            </CardTitle>
            <CardDescription>
              Track weekly jackpot growth for selected game
            </CardDescription>
          </div>
          <Select value={selectedJackpotGame} onValueChange={setSelectedJackpotGame}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generateJackpotIncreaseData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#999"
                  tick={{ fill: "#999", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#999" 
                  tick={{ fill: "#999", fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label: string) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="jackpotIncrease" 
                  stroke="#1F4E4A" 
                  strokeWidth={3}
                  dot={{ fill: "#1F4E4A", r: 5 }}
                  name="Jackpot Increase"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics for Weekly View */}
      {reportType === "weekly" && (
        <Card className="bg-white border-[#1F4E4A]/10">
          <CardHeader>
            <CardTitle className="text-[#1F4E4A] font-inter">Weekly Performance Metrics</CardTitle>
            <CardDescription>Detailed week-by-week performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[#F7F8FC] rounded-lg">
                <div className="text-2xl font-bold text-[#1F4E4A]">
                  {chartData.length}
                </div>
                <div className="text-sm text-[#132E2C]/70">Total Weeks</div>
              </div>
              <div className="text-center p-4 bg-[#F7F8FC] rounded-lg">
                <div className="text-2xl font-bold text-[#1F4E4A]">
                  {formatCurrency(chartData.reduce((sum: number, week: any) => sum + week.Revenue, 0) / Math.max(chartData.length, 1))}
                </div>
                <div className="text-sm text-[#132E2C]/70">Avg Weekly Revenue</div>
              </div>
              <div className="text-center p-4 bg-[#F7F8FC] rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(chartData.reduce((sum: number, week: any) => sum + week.NetProfit, 0) / Math.max(chartData.length, 1))}
                </div>
                <div className="text-sm text-[#132E2C]/70">Avg Weekly Profit</div>
              </div>
              <div className="text-center p-4 bg-[#F7F8FC] rounded-lg">
                <div className="text-2xl font-bold text-[#1F4E4A]">
                  {Math.round(chartData.reduce((sum: number, week: any) => sum + week.TicketsSold, 0) / Math.max(chartData.length, 1)).toLocaleString()}
                </div>
                <div className="text-sm text-[#132E2C]/70">Avg Weekly Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
