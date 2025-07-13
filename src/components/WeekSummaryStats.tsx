
interface WeekSummaryStatsProps {
  weekTotalTickets: number;
  weekTotalSales: number;
  weekOrganizationTotal: number;
  weekJackpotTotal: number;
  displayedEndingJackpot: number;
  hasWinner: boolean;
  formatCurrency: (amount: number) => string;
  cumulativeOrganizationNet: number;
  cumulativeCurrentJackpot: number;
}

export const WeekSummaryStats = ({
  weekTotalTickets,
  weekTotalSales,
  weekOrganizationTotal,
  weekJackpotTotal,
  displayedEndingJackpot,
  hasWinner,
  formatCurrency,
  cumulativeOrganizationNet,
  cumulativeCurrentJackpot
}: WeekSummaryStatsProps) => {
  return (
    <div className="mt-4">
      {/* Single Row Layout with Grouped Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {/* Basic Stats */}
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-gray-600">Tickets Sold</p>
          <p className="text-sm font-semibold text-[#1F4E4A]">{weekTotalTickets}</p>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-gray-600">Ticket Sales</p>
          <p className="text-sm font-semibold text-[#1F4E4A]">{formatCurrency(weekTotalSales)}</p>
        </div>

        {/* Organization Net Group */}
        <div className="text-center bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-green-700 font-medium">ORG.</p>
          <p className="text-xs text-gray-600">Current</p>
          <p className="text-sm font-semibold text-green-600">{formatCurrency(weekOrganizationTotal)}</p>
        </div>
        <div className="text-center bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-green-700 font-medium">ORG.</p>
          <p className="text-xs text-gray-600">Cumulative</p>
          <p className="text-sm font-semibold text-green-700">{formatCurrency(cumulativeOrganizationNet)}</p>
        </div>

        {/* Jackpot Pool moved after ORG cumulative */}
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-gray-600">Jackpot Pool</p>
          <p className="text-sm font-semibold text-blue-600">{formatCurrency(weekJackpotTotal)}</p>
        </div>

        {/* Current Jackpot Group */}
        <div className="text-center bg-purple-50 border border-purple-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-purple-700 font-medium">JACKPOT</p>
          <p className="text-xs text-gray-600">
            {hasWinner ? 'Final' : 'Current'}
          </p>
          <p className="text-sm font-semibold text-purple-600">{formatCurrency(displayedEndingJackpot)}</p>
        </div>
        <div className="text-center bg-purple-50 border border-purple-200 rounded-lg p-2 shadow-sm">
          <p className="text-xs text-purple-700 font-medium">JACKPOT</p>
          <p className="text-xs text-gray-600">Cumulative</p>
          <p className="text-sm font-semibold text-purple-700">{formatCurrency(cumulativeCurrentJackpot)}</p>
        </div>
      </div>
    </div>
  );
};
