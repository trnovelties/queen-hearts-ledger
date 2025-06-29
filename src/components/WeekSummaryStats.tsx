
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-700">{weekTotalTickets}</div>
        <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
        <div className="text-sm text-green-600 font-medium">Total Sales</div>
      </div>
      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
        <div className="text-sm text-purple-600 font-medium">Organization Net</div>
      </div>
      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
        <div className="text-sm text-orange-600 font-medium">Jackpot Total</div>
      </div>
      <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="text-2xl font-bold text-indigo-700">{formatCurrency(displayedEndingJackpot)}</div>
        <div className="text-sm text-indigo-600 font-medium">
          {hasWinner ? 'Ending Jackpot' : 'Current Jackpot'}
        </div>
      </div>
    </div>
  );
};
