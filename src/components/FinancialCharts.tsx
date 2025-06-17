
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export function FinancialCharts({ games, reportType }: FinancialChartsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate chart data based on report type
  const generateChartData = () => {
    if (reportType === "game") {
      return games.map(game => ({
        name: game.name,
        Revenue: game.total_sales,
        Payouts: game.total_payouts,
        Expenses: game.total_expenses,
        Donations: game.total_donations,
        NetProfit: game.organization_net_profit,
        TicketsSold: Math.round(game.total_sales / (game.ticket_price || 2))
      }));
    }
    
    // For weekly analysis, aggregate by weeks
    if (reportType === "weekly") {
      const weeklyData: { [key: string]: any } = {};
      
      games.forEach(game => {
        game.weeks.forEach(week => {
          const weekKey = `Week ${week.week_number}`;
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              name: weekKey,
              Revenue: 0,
              Payouts: 0,
              Expenses: 0,
              Donations: 0,
              NetProfit: 0,
              TicketsSold: 0
            };
          }
          
          weeklyData[weekKey].Revenue += week.weekly_sales;
          weeklyData[weekKey].Payouts += week.weekly_payout;
          weeklyData[weekKey].TicketsSold += week.weekly_tickets_sold;
        });
        
        // Add expenses for this game
        game.expenses.forEach(expense => {
          // Find the week this expense belongs to
          const expenseWeek = game.weeks.find(week => 
            expense.date >= week.start_date && expense.date <= week.end_date
          );
          
          if (expenseWeek) {
            const weekKey = `Week ${expenseWeek.week_number}`;
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
      
      return Object.values(weeklyData);
    }
    
    // Cumulative data
    return [{
      name: "Total",
      Revenue: games.reduce((sum, game) => sum + game.total_sales, 0),
      Payouts: games.reduce((sum, game) => sum + game.total_payouts, 0),
      Expenses: games.reduce((sum, game) => sum + game.total_expenses, 0),
      Donations: games.reduce((sum, game) => sum + game.total_donations, 0),
      NetProfit: games.reduce((sum, game) => sum + game.organization_net_profit, 0),
      TicketsSold: games.reduce((sum, game) => sum + Math.round(game.total_sales / (game.ticket_price || 2)), 0)
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Main Revenue Chart */}
      <Card className="bg-white border-[#1F4E4A]/10">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Revenue Performance</CardTitle>
          <CardDescription>Comprehensive revenue, payouts, and profit analysis</CardDescription>
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
                <Bar 
                  dataKey="Revenue" 
                  fill={chartColors.secondary} 
                  radius={[4, 4, 0, 0]}
                  name="Revenue"
                />
                <Bar 
                  dataKey="Payouts" 
                  fill={chartColors.primary} 
                  radius={[4, 4, 0, 0]}
                  name="Payouts"
                />
                <Line 
                  type="monotone" 
                  dataKey="NetProfit" 
                  stroke={chartColors.profit} 
                  strokeWidth={3}
                  dot={{ fill: chartColors.profit, r: 5 }}
                  name="Net Profit"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card className="bg-white border-[#1F4E4A]/10">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Financial Allocation</CardTitle>
          <CardDescription>How organization funds are distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      {reportType !== "cumulative" && (
        <Card className="bg-white border-[#1F4E4A]/10 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#1F4E4A] font-inter">Performance Trends</CardTitle>
            <CardDescription>Track performance patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.profit} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartColors.profit} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F4E4A20" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#132E2C"
                    tick={{ fill: "#132E2C" }}
                  />
                  <YAxis 
                    stroke="#132E2C" 
                    tick={{ fill: "#132E2C" }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #1F4E4A20',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="Revenue" 
                    stroke={chartColors.secondary} 
                    fillOpacity={1} 
                    fill="url(#revenueGradient)"
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="NetProfit" 
                    stroke={chartColors.profit} 
                    fillOpacity={1} 
                    fill="url(#profitGradient)"
                    name="Net Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
