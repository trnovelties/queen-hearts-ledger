import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, formatDateStringForDisplay, formatDateStringShort } from '@/lib/dateUtils';

export const usePdfReports = () => {
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const generateGamePdfReport = async (game: any) => {
    try {
      toast({
        title: "Generating Professional PDF Report",
        description: `Creating comprehensive black & white report for ${game.name}...`,
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 25;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Helper function to check if we need a new page
      const checkNewPage = (spaceNeeded: number = 20) => {
        if (yPosition + spaceNeeded > pageHeight - 25) {
          doc.addPage();
          yPosition = 25;
          return true;
        }
        return false;
      };

      // Helper function to add a professional section header
      const addSectionHeader = (title: string, size: number = 14) => {
        checkNewPage(20);
        yPosition += 5;
        
        // Header background box
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition - 2, contentWidth, 10, 'F');
        
        // Header border
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(margin, yPosition - 2, contentWidth, 10);
        
        // Header text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin + 3, yPosition + 5);
        yPosition += 15;
      };

      // Helper function to add data rows
      const addDataRow = (label: string, value: string, bold: boolean = false) => {
        checkNewPage(8);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(label, margin + 3, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 65, yPosition);
        yPosition += 6;
      };

      // Helper function to create professional tables
      const createTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
        const startX = margin + (contentWidth - tableWidth) / 2;
        
        // Table header
        doc.setFillColor(220, 220, 220);
        doc.rect(startX, yPosition, tableWidth, 8, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(startX, yPosition, tableWidth, 8);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        let xPos = startX + 1;
        headers.forEach((header, index) => {
          doc.text(header, xPos, yPosition + 5);
          if (index < headers.length - 1) {
            doc.line(xPos + colWidths[index] - 1, yPosition, xPos + colWidths[index] - 1, yPosition + 8);
          }
          xPos += colWidths[index];
        });
        yPosition += 8;
        
        // Table rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        
        rows.forEach((row, rowIndex) => {
          checkNewPage(8);
          
          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(startX, yPosition, tableWidth, 7, 'F');
          }
          
          // Row border
          doc.setLineWidth(0.3);
          doc.rect(startX, yPosition, tableWidth, 7);
          
          xPos = startX + 1;
          row.forEach((cell, cellIndex) => {
            doc.text(cell, xPos, yPosition + 4.5);
            if (cellIndex < row.length - 1) {
              doc.line(xPos + colWidths[cellIndex] - 1, yPosition, xPos + colWidths[cellIndex] - 1, yPosition + 7);
            }
            xPos += colWidths[cellIndex];
          });
          yPosition += 7;
        });
        yPosition += 10;
      };

      // Professional Document Header
      doc.setLineWidth(2);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, 15, contentWidth, 25);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('QUEEN OF HEARTS', pageWidth / 2, 25, { align: 'center' });
      doc.text('COMPREHENSIVE GAME REPORT', pageWidth / 2, 32, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(game.name, pageWidth / 2, 38, { align: 'center' });
      yPosition = 50;

      // Report Information Box
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, yPosition, contentWidth, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Report Generated: ${formatDateStringForDisplay(getTodayDateString())}`, margin + 3, yPosition + 5);
      doc.text(`Status: ${game.end_date ? 'COMPLETED' : 'IN PROGRESS'}`, margin + 3, yPosition + 10);
      doc.text(`Total Weeks: ${game.weeks?.length || 0}`, pageWidth - margin - 3, yPosition + 5, { align: 'right' });
      doc.text(`Game #${game.game_number || 'N/A'}`, pageWidth - margin - 3, yPosition + 10, { align: 'right' });
      yPosition += 25;

      // GAME CONFIGURATION
      addSectionHeader('GAME CONFIGURATION', 12);
      const configData = [
        ['Game Number:', `${game.game_number || 'N/A'}`],
        ['Start Date:', formatDateStringForDisplay(game.start_date)],
        ['End Date:', game.end_date ? formatDateStringForDisplay(game.end_date) : 'In Progress'],
        ['Ticket Price:', formatCurrency(game.ticket_price)],
        ['Organization Share:', `${game.organization_percentage}%`],
        ['Jackpot Share:', `${game.jackpot_percentage}%`],
        ['Starting Carryover:', formatCurrency(game.carryover_jackpot)],
        ['Minimum Jackpot:', formatCurrency(game.minimum_starting_jackpot || 0)]
      ];
      
      configData.forEach(([label, value]) => addDataRow(label, value));
      yPosition += 5;

      // FINANCIAL SUMMARY
      addSectionHeader('FINANCIAL SUMMARY', 12);
      const totalTicketsSold = game.weeks?.reduce((sum: number, week: any) => sum + (week.weekly_tickets_sold || 0), 0) || 0;
      const totalPayouts = game.weeks?.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0) || 0;
      
      // Financial Summary Box
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, contentWidth, 45, 'F');
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 45);
      yPosition += 5;
      
      const financialData = [
        ['Total Tickets Sold:', `${totalTicketsSold.toLocaleString()}`],
        ['Total Sales Revenue:', formatCurrency(game.total_sales || 0)],
        ['Total Winner Payouts:', formatCurrency(totalPayouts)],
        ['Total Expenses:', formatCurrency(game.total_expenses || 0)],
        ['Total Donations:', formatCurrency(game.total_donations || 0)],
        ['Organization Net Profit:', formatCurrency(game.organization_net_profit || 0)],
        ['Carryover to Next Game:', formatCurrency(game.jackpot_contribution_to_next_game || 0)]
      ];
      
      financialData.forEach(([label, value]) => addDataRow(label, value, label.includes('Net Profit')));
      yPosition += 10;

      // DETAILED WEEKLY PERFORMANCE
      addSectionHeader('DETAILED WEEKLY PERFORMANCE', 12);
      
      if (game.weeks && game.weeks.length > 0) {
        const weekHeaders = ['Week #', 'Period', 'Tickets', 'Sales', 'Winner', 'Card', 'Payout', 'Present'];
        const weekColWidths = [18, 38, 20, 25, 35, 30, 25, 18];
        
        const weekRows = game.weeks.map((week: any) => [
          `${week.week_number}`,
          `${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)}`,
          `${week.weekly_tickets_sold || 0}`,
          formatCurrency(week.weekly_sales || 0),
          week.winner_name || 'No Winner',
          week.card_selected || 'N/A',
          formatCurrency(week.weekly_payout || 0),
          week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
        ]);
        
        createTable(weekHeaders, weekRows, weekColWidths);
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text('No weekly performance data available.', margin + 3, yPosition);
        yPosition += 15;
      }

      // DAILY TICKET SALES BREAKDOWN (if available)
      if (game.weeks && game.weeks.length > 0) {
        game.weeks.forEach((week: any) => {
          if (week.ticket_sales && week.ticket_sales.length > 0) {
            checkNewPage(30);
            addSectionHeader(`WEEK ${week.week_number} - DAILY BREAKDOWN`, 11);
            
            const dailyHeaders = ['Date', 'Tickets Sold', 'Amount', 'Org. Total', 'Jackpot Total', 'Ending Jackpot'];
            const dailyColWidths = [30, 25, 25, 25, 25, 30];
            
            const dailyRows = week.ticket_sales.map((sale: any) => [
              formatDateStringShort(sale.date),
              `${sale.tickets_sold}`,
              formatCurrency(sale.amount_collected),
              formatCurrency(sale.organization_total),
              formatCurrency(sale.jackpot_total),
              formatCurrency(sale.ending_jackpot_total)
            ]);
            
            createTable(dailyHeaders, dailyRows, dailyColWidths);
          }
        });
      }

      // WINNERS DIRECTORY
      const winners = game.weeks?.filter((week: any) => week.winner_name) || [];
      if (winners.length > 0) {
        addSectionHeader('WINNERS DIRECTORY', 12);
        
        const winnerHeaders = ['Week', 'Winner Name', 'Card Selected', 'Prize Amount', 'Date', 'Present'];
        const winnerColWidths = [20, 40, 30, 30, 30, 20];
        
        const winnerRows = winners.map((week: any) => [
          `${week.week_number}`,
          week.winner_name,
          week.card_selected,
          formatCurrency(week.weekly_payout || 0),
          formatDateStringShort(week.end_date),
          week.winner_present ? 'Yes' : 'No'
        ]);
        
        createTable(winnerHeaders, winnerRows, winnerColWidths);
        
        // Jackpot Winner Highlight
        const jackpotWinner = winners.find((week: any) => week.card_selected === 'Queen of Hearts');
        if (jackpotWinner) {
          yPosition += 5;
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, yPosition, contentWidth, 25, 'F');
          doc.setLineWidth(1);
          doc.rect(margin, yPosition, contentWidth, 25);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text('JACKPOT WINNER', margin + 5, yPosition + 8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`${jackpotWinner.winner_name} - Week ${jackpotWinner.week_number}`, margin + 5, yPosition + 15);
          doc.text(`Prize: ${formatCurrency(jackpotWinner.weekly_payout || 0)}`, margin + 5, yPosition + 21);
          yPosition += 30;
        }
      }

      // EXPENSES & DONATIONS
      if (game.expenses && game.expenses.length > 0) {
        addSectionHeader('EXPENSES & DONATIONS', 12);
        
        const expenseHeaders = ['Date', 'Description', 'Amount', 'Type'];
        const expenseColWidths = [30, 80, 30, 30];
        
        const expenseRows = game.expenses.map((expense: any) => [
          formatDateStringShort(expense.date),
          expense.memo || 'No description',
          formatCurrency(expense.amount),
          expense.is_donation ? 'Donation' : 'Expense'
        ]);
        
        createTable(expenseHeaders, expenseRows, expenseColWidths);
      }

      // SUMMARY STATISTICS
      addSectionHeader('GAME STATISTICS', 12);
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, 35, 'F');
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 35);
      yPosition += 5;
      
      const avgTicketsPerWeek = game.weeks?.length > 0 ? Math.round(totalTicketsSold / game.weeks.length) : 0;
      const avgSalesPerWeek = game.weeks?.length > 0 ? (game.total_sales || 0) / game.weeks.length : 0;
      const profitMargin = game.total_sales > 0 ? ((game.organization_net_profit || 0) / game.total_sales * 100).toFixed(1) : '0.0';
      
      const statsData = [
        ['Average Tickets per Week:', `${avgTicketsPerWeek}`],
        ['Average Sales per Week:', formatCurrency(avgSalesPerWeek)],
        ['Organization Profit Margin:', `${profitMargin}%`],
        ['Total Weeks Played:', `${game.weeks?.length || 0}`],
        ['Game Duration:', game.end_date ? `${game.weeks?.length || 0} weeks` : 'Ongoing']
      ];
      
      statsData.forEach(([label, value]) => addDataRow(label, value));
      yPosition += 5;

      // Professional Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text(`Queen of Hearts Game Report - ${game.name}`, margin, pageHeight - 12);
        doc.text(`Generated: ${formatDateStringForDisplay(getTodayDateString())}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
        
        // Confidential notice
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text('This report contains confidential financial information.', pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Save the PDF with professional naming
      const fileName = `QOH-${game.name.replace(/\s+/g, '-')}-Report-${getTodayDateString()}.pdf`;
      doc.save(fileName);

      toast({
        title: "Professional Report Generated",
        description: `Comprehensive black & white report for ${game.name} has been downloaded.`,
      });
    } catch (error: any) {
      console.error('Error generating comprehensive game PDF:', error);
      toast({
        title: "Error",
        description: `Failed to generate report: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    generateGamePdfReport
  };
};
