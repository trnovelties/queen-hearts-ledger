
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
  cumulativeJackpotPool: number;
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
  cumulativeCurrentJackpot,
  cumulativeJackpotPool
}: WeekSummaryStatsProps) => {
  return (
    <div className="mt-4">
      {/* Single Row Layout with Grouped Cards */}
      <div className="flex flex-wrap gap-6 justify-start">
        {/* Ticket Stats Combined Card */}
        <div className="text-center bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 shadow-sm w-auto">
          <p className="text-sm text-blue-700 font-medium mb-1">Ticket Stats</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Sold</p>
              <p className="text-base font-semibold text-blue-600">{weekTotalTickets}</p>
            </div>
            <div className="border-l border-blue-200 pl-2 flex-1">
              <p className="text-sm text-gray-600 mb-1">Sales</p>
              <p className="text-base font-semibold text-blue-700">{formatCurrency(weekTotalSales)}</p>
            </div>
          </div>
        </div>

        {/* Jackpot Pool Combined Card */}
        <div className="text-center bg-purple-50 border border-purple-200 rounded-lg py-2 px-3 shadow-sm w-auto">
          <p className="text-sm text-purple-700 font-medium mb-1">Jackpot Pool</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Current</p>
              <p className="text-base font-semibold text-purple-600">{formatCurrency(weekJackpotTotal)}</p>
            </div>
            <div className="border-l border-purple-200 pl-2 flex-1">
              <p className="text-sm text-gray-600 mb-1">Cumulative</p>
              <p className="text-base font-semibold text-purple-700">{formatCurrency(cumulativeJackpotPool)}</p>
            </div>
          </div>
        </div>

        {/* Organization Combined Card */}
        <div className="text-center bg-green-50 border border-green-200 rounded-lg py-2 px-3 shadow-sm w-auto">
          <p className="text-sm text-green-700 font-medium mb-1">Organization</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Current</p>
              <p className="text-base font-semibold text-green-600">{formatCurrency(weekOrganizationTotal)}</p>
            </div>
            <div className="border-l border-green-200 pl-2 flex-1">
              <p className="text-sm text-gray-600 mb-1">Cumulative</p>
              <p className="text-base font-semibold text-green-700">{formatCurrency(cumulativeOrganizationNet)}</p>
            </div>
          </div>
        </div>

        {/* Ending Jackpot Combined Card */}
        <div className="text-center bg-purple-50 border border-purple-200 rounded-lg py-2 px-3 shadow-sm w-auto">
          <p className="text-sm text-purple-700 font-medium mb-1">Ending Jackpot</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Current</p>
              <p className="text-base font-semibold text-purple-600">{formatCurrency(displayedEndingJackpot)}</p>
            </div>
            <div className="border-l border-purple-200 pl-2 flex-1">
              <p className="text-sm text-gray-600 mb-1">Cumulative</p>
              <p className="text-base font-semibold text-purple-700">{formatCurrency(cumulativeCurrentJackpot)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
