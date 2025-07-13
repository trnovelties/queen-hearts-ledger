
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
    <div className="space-y-6 mt-4">
      {/* Basic Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Tickets Sold</p>
          <p className="text-lg font-semibold text-[#1F4E4A]">{weekTotalTickets}</p>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Ticket Sales</p>
          <p className="text-lg font-semibold text-[#1F4E4A]">{formatCurrency(weekTotalSales)}</p>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Jackpot Pool</p>
          <p className="text-lg font-semibold text-blue-600">{formatCurrency(weekJackpotTotal)}</p>
        </div>
      </div>

      {/* Organization Net Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 text-center">
          ORGANIZATION NET
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Current</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(weekOrganizationTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Cumulative</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(cumulativeOrganizationNet)}</p>
          </div>
        </div>
      </div>

      {/* Current Jackpot Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 text-center">
          CURRENT JACKPOT
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {hasWinner ? 'Final' : 'Current'}
            </p>
            <p className="text-lg font-semibold text-purple-600">{formatCurrency(displayedEndingJackpot)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Cumulative</p>
            <p className="text-lg font-semibold text-purple-700">{formatCurrency(cumulativeCurrentJackpot)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
