
interface WeekSummaryStatsProps {
  weekTotalTickets: number;
  weekTotalSales: number;
  weekOrganizationTotal: number;
  weekJackpotTotal: number;
  displayedEndingJackpot: number;
  hasWinner: boolean;
  formatCurrency: (amount: number) => string;
}

export const WeekSummaryStats = ({
  weekTotalTickets,
  weekTotalSales,
  weekOrganizationTotal,
  weekJackpotTotal,
  displayedEndingJackpot,
  hasWinner,
  formatCurrency
}: WeekSummaryStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
      <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">Tickets Sold</p>
        <p className="text-lg font-semibold text-[#1F4E4A]">{weekTotalTickets}</p>
      </div>
      <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">Ticket Sales</p>
        <p className="text-lg font-semibold text-[#1F4E4A]">{formatCurrency(weekTotalSales)}</p>
      </div>
      <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">Organization Net</p>
        <p className="text-lg font-semibold text-green-600">{formatCurrency(weekOrganizationTotal)}</p>
      </div>
      <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">Jackpot Pool</p>
        <p className="text-lg font-semibold text-blue-600">{formatCurrency(weekJackpotTotal)}</p>
      </div>
      <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {hasWinner ? 'Final Jackpot' : 'Current Jackpot'}
        </p>
        <p className="text-lg font-semibold text-purple-600">{formatCurrency(displayedEndingJackpot)}</p>
      </div>
    </div>
  );
};
