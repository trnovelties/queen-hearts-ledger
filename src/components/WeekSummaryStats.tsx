
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
      <div className="flex flex-wrap gap-2 justify-start px-14">
        {/* Basic Stats */}
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-sm text-gray-600">Tickets Sold</p>
          <p className="text-base font-semibold text-[#1F4E4A]">{weekTotalTickets}</p>
        </div>
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-sm text-gray-600">Ticket Sales</p>
          <p className="text-base font-semibold text-[#1F4E4A]">{formatCurrency(weekTotalSales)}</p>
        </div>

        {/* Organization Combined Card */}
        <div className="text-center bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm w-auto">
          <p className="text-sm text-green-700 font-medium mb-1">Organization</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Current</p>
              <p className="text-base font-semibold text-green-600">{formatCurrency(weekOrganizationTotal)}</p>
            </div>
            <div className="border-l border-green-200 pl-2 flex-1">
              <p className="text-sm text-gray-600">Cumulative</p>
              <p className="text-base font-semibold text-green-700">{formatCurrency(cumulativeOrganizationNet)}</p>
            </div>
          </div>
        </div>

        {/* Jackpot Pool moved after ORG cumulative */}
        <div className="text-center bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <p className="text-sm text-gray-600">Jackpot Pool</p>
          <p className="text-base font-semibold text-blue-600">{formatCurrency(weekJackpotTotal)}</p>
        </div>

        {/* Jackpot Combined Card */}
        <div className="text-center bg-purple-50 border border-purple-200 rounded-lg p-2 shadow-sm w-auto">
          <p className="text-sm text-purple-700 font-medium mb-1">Jackpot</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {hasWinner ? 'Final' : 'Current'}
              </p>
              <p className="text-base font-semibold text-purple-600">{formatCurrency(displayedEndingJackpot)}</p>
            </div>
            <div className="border-l border-purple-200 pl-2 flex-1">
              <p className="text-sm text-gray-600">Cumulative</p>
              <p className="text-base font-semibold text-purple-700">{formatCurrency(cumulativeCurrentJackpot)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
