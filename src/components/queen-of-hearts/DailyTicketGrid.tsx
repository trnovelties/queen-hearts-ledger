
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface DailyTicketGridProps {
  ticketSales: any[];
  weekStartDate: string;
  weekEndDate: string;
}

export function DailyTicketGrid({ ticketSales, weekStartDate, weekEndDate }: DailyTicketGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Group sales by date
  const salesByDate = ticketSales.reduce((acc, sale) => {
    acc[sale.date] = sale;
    return acc;
  }, {});

  // Generate array of dates for the week
  const startDate = new Date(weekStartDate);
  const endDate = new Date(weekEndDate);
  const dates = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().split('T')[0]);
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <h4 className="font-semibold text-[#1F4E4A] mb-3">Daily Ticket Sales</h4>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {dates.map((date) => {
            const sale = salesByDate[date];
            const hasData = !!sale;
            
            return (
              <div
                key={date}
                className={`p-2 rounded text-center ${
                  hasData 
                    ? 'bg-[#A1E96C]/20 border border-[#A1E96C]' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="font-medium text-[#132E2C] mb-1">
                  {formatDate(date)}
                </div>
                {hasData ? (
                  <>
                    <div className="font-bold text-[#1F4E4A]">
                      {sale.tickets_sold}
                    </div>
                    <div className="text-[#132E2C]/60">tickets</div>
                    <div className="font-semibold text-[#A1E96C] mt-1">
                      {formatCurrency(sale.amount_collected)}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 py-3">No sales</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
