
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  HeartHandshake,
  Receipt,
  Percent,
  Calendar,
  BarChart3
} from "lucide-react";

interface FinancialOverviewProps {
  summary: {
    totalTicketsSold: number;
    totalSales: number;
    totalDistributions: number;
    totalExpenses: number;
    totalDonations: number;
    organizationTotalPortion: number;
    jackpotTotalPortion: number;
    organizationNetProfit: number;
    filteredGames: any[];
  };
  formatCurrency: (amount: number) => string;
}

export function FinancialOverview({ summary, formatCurrency }: FinancialOverviewProps) {
  // Calculate key performance indicators
  const profitMargin = summary.totalSales > 0 ? 
    ((summary.organizationNetProfit / summary.totalSales) * 100) : 0;
  
  const expenseRatio = summary.organizationTotalPortion > 0 ? 
    ((summary.totalExpenses / summary.organizationTotalPortion) * 100) : 0;
  
  const donationRatio = summary.organizationTotalPortion > 0 ? 
    ((summary.totalDonations / summary.organizationTotalPortion) * 100) : 0;
  
  const distributionEfficiency = summary.jackpotTotalPortion > 0 ? 
    ((summary.totalDistributions / summary.jackpotTotalPortion) * 100) : 0;

  const avgTicketPrice = summary.totalTicketsSold > 0 ? 
    summary.totalSales / summary.totalTicketsSold : 0;

  const totalGames = summary.filteredGames.length;
  const avgGameRevenue = totalGames > 0 ? summary.totalSales / totalGames : 0;

  // KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend = 0, 
    subtitle = "",
    variant = "default",
    percentage = 0,
    colorScheme = "blue"
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    subtitle?: string;
    variant?: "default" | "revenue" | "expense" | "profit" | "success";
    percentage?: number;
    colorScheme?: "blue" | "green" | "red" | "purple" | "orange";
  }) => {
    const colorStyles = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-900",
        icon: "text-blue-600",
        iconBg: "bg-blue-100"
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-900",
        icon: "text-green-600",
        iconBg: "bg-green-100"
      },
      red: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-900",
        icon: "text-red-600",
        iconBg: "bg-red-100"
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-900",
        icon: "text-purple-600",
        iconBg: "bg-purple-100"
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-900",
        icon: "text-orange-600",
        iconBg: "bg-orange-100"
      }
    };

    const colors = colorStyles[colorScheme];

    return (
      <Card className={`${colors.bg} ${colors.border} border-2 hover:shadow-lg transition-all duration-300`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-[#132E2C]/60 uppercase tracking-wider">{title}</p>
                {percentage > 0 && (
                  <Badge variant="secondary" className="text-xs bg-white/80 text-[#132E2C]">
                    {percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${colors.text} font-inter truncate`}>
                {typeof value === 'number' ? formatCurrency(value) : value}
              </p>
              {subtitle && (
                <p className="text-xs sm:text-sm text-[#132E2C]/60 font-medium">{subtitle}</p>
              )}
              {trend !== 0 && (
                <div className={`flex items-center text-xs sm:text-sm font-semibold ${
                  trend > 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {trend > 0 ? (
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {Math.abs(trend).toFixed(1)}% vs last period
                </div>
              )}
            </div>
            <div className={`p-2 sm:p-3 lg:p-4 rounded-xl ${colors.iconBg} flex-shrink-0`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 ${colors.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main KPI Grid - 3 columns, 2 rows for 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <KPICard
          title="Tickets Sold"
          value={summary.totalTicketsSold.toLocaleString()}
          icon={Users}
          colorScheme="blue"
          subtitle={`Avg. ${formatCurrency(avgTicketPrice)} per ticket`}
        />
        <KPICard
          title="Total Sales"
          value={summary.totalSales}
          icon={DollarSign}
          colorScheme="green"
          subtitle={`${totalGames} games tracked`}
        />
        <KPICard
          title="Organization Net"
          value={summary.organizationNetProfit}
          icon={TrendingUp}
          colorScheme="purple"
          percentage={profitMargin}
          subtitle="After expenses & donations"
        />
        <KPICard
          title="Jackpot Total"
          value={summary.jackpotTotalPortion}
          icon={Trophy}
          colorScheme="orange"
          subtitle={`${distributionEfficiency.toFixed(1)}% distribution efficiency`}
        />
        <KPICard
          title="Total Expenses"
          value={summary.totalExpenses}
          icon={Receipt}
          colorScheme="red"
          percentage={expenseRatio}
          subtitle="Operating expenses"
        />
        <KPICard
          title="Total Donations"
          value={summary.totalDonations}
          icon={HeartHandshake}
          colorScheme="purple"
          percentage={donationRatio}
          subtitle="Community donations"
        />
      </div>

      {/* Detailed Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Analysis */}
        <Card className="bg-gradient-to-br from-[#A1E96C]/10 to-[#A1E96C]/5 border-[#A1E96C]/30 border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-3">
              <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
              Revenue Analysis
            </CardTitle>
            <CardDescription>Total income and ticket sales performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Total Tickets</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{summary.totalTicketsSold.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Gross Revenue</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{formatCurrency(summary.totalSales)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Avg per Game</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{formatCurrency(avgGameRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Analysis */}
        <Card className="bg-white border-[#1F4E4A]/20 border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-3">
              <Target className="h-5 w-5 sm:h-6 sm:w-6" />
              Distribution Management
            </CardTitle>
            <CardDescription>Winner distributions and jackpot management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-[#F7F8FC] rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Jackpot Portion</span>
                </div>
                <span className="font-bold text-orange-600 text-sm sm:text-lg">{formatCurrency(summary.jackpotTotalPortion)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-[#F7F8FC] rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Total Distributions</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{formatCurrency(summary.totalDistributions)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-[#A1E96C]/10 rounded-lg border border-[#A1E96C]/30">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Efficiency</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{distributionEfficiency.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Impact */}
        <Card className="bg-gradient-to-br from-[#1F4E4A]/10 to-[#132E2C]/5 border-[#1F4E4A]/30 border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-3">
              <HeartHandshake className="h-5 w-5 sm:h-6 sm:w-6" />
              Organization Impact
            </CardTitle>
            <CardDescription>Expenses, donations, and net profit breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Org. Share</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-lg">{formatCurrency(summary.organizationTotalPortion)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Donations ({donationRatio.toFixed(1)}%)</span>
                </div>
                <span className="font-bold text-purple-600 text-sm sm:text-lg">{formatCurrency(summary.totalDonations)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white/80 rounded-lg border">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                  <span className="font-semibold text-[#132E2C] text-sm sm:text-base">Expenses ({expenseRatio.toFixed(1)}%)</span>
                </div>
                <span className="font-bold text-red-600 text-sm sm:text-lg">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-[#A1E96C]/20 rounded-lg border-2 border-[#A1E96C]/50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#1F4E4A] flex-shrink-0" />
                  <span className="font-bold text-[#132E2C] text-sm sm:text-base">Net Profit</span>
                </div>
                <span className="font-bold text-[#1F4E4A] text-sm sm:text-xl">{formatCurrency(summary.organizationNetProfit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
