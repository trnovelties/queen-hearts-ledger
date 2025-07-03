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
        title: "Generating PDF",
        description: `Creating comprehensive report for ${game.name}...`,
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 20;

      // Helper function to check if we need a new page
      const checkNewPage = (spaceNeeded: number = 20) => {
        if (yPosition + spaceNeeded > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      };

      // Helper function to add a section header
      const addSectionHeader = (title: string) => {
        checkNewPage(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(31, 78, 74); // Brand color
        doc.text(title, margin, yPosition);
        yPosition += 10;
        // Add underline
        doc.setLineWidth(0.5);
        doc.setDrawColor(31, 78, 74);
        doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
        yPosition += 5;
      };

      // Header with logo space and title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(31, 78, 74);
      doc.text('QUEEN OF HEARTS GAME REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(19, 46, 44);
      doc.text(game.name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Report Generated: ${formatDateStringForDisplay(getTodayDateString())}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Game Overview Section
      addSectionHeader('GAME OVERVIEW');
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const gameOverview = [
        [`Game Number:`, `${game.game_number || 'N/A'}`],
        [`Start Date:`, formatDateStringForDisplay(game.start_date)],
        [`End Date:`, game.end_date ? formatDateStringForDisplay(game.end_date) : 'In Progress'],
        [`Game Status:`, game.end_date ? 'Completed' : 'Active'],
        [`Ticket Price:`, formatCurrency(game.ticket_price)],
        [`Organization Share:`, `${game.organization_percentage}%`],
        [`Jackpot Share:`, `${game.jackpot_percentage}%`],
        [`Starting Carryover:`, formatCurrency(game.carryover_jackpot)],
        [`Minimum Jackpot:`, formatCurrency(game.minimum_starting_jackpot || 0)]
      ];

      gameOverview.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Financial Summary Section
      addSectionHeader('FINANCIAL SUMMARY');
      
      const totalTicketsSold = game.weeks?.reduce((sum: number, week: any) => sum + (week.weekly_tickets_sold || 0), 0) || 0;
      const totalPayouts = game.weeks?.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0) || 0;

      const financialData = [
        [`Total Tickets Sold:`, `${totalTicketsSold.toLocaleString()}`],
        [`Total Sales:`, formatCurrency(game.total_sales || 0)],
        [`Total Payouts:`, formatCurrency(totalPayouts)],
        [`Total Expenses:`, formatCurrency(game.total_expenses || 0)],
        [`Total Donations:`, formatCurrency(game.total_donations || 0)],
        [`Organization Net Profit:`, formatCurrency(game.organization_net_profit || 0)],
        [`Final Carryover:`, formatCurrency(game.jackpot_contribution_to_next_game || 0)]
      ];

      financialData.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, yPosition);
        doc.setFont("helvetica", "normal");
        if (label.includes('Net Profit')) {
          doc.setTextColor(0, 128, 0); // Green for profit
        } else if (label.includes('Expenses') || label.includes('Payouts')) {
          doc.setTextColor(200, 0, 0); // Red for expenses
        } else {
          doc.setTextColor(0, 0, 0);
        }
        doc.text(value, margin + 60, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 6;
      });
      yPosition += 15;

      // Weekly Results Section
      addSectionHeader('WEEKLY RESULTS');
      
      if (game.weeks && game.weeks.length > 0) {
        // Table headers
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(31, 78, 74);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
        
        const headers = ['Week', 'Dates', 'Tickets', 'Sales', 'Winner', 'Card', 'Payout', 'Present'];
        const colWidths = [15, 35, 20, 25, 35, 25, 25, 15];
        let xPosition = margin + 2;
        
        headers.forEach((header, index) => {
          doc.text(header, xPosition, yPosition + 5);
          xPosition += colWidths[index];
        });
        yPosition += 8;

        // Table rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);

        game.weeks.forEach((week: any, index: number) => {
          checkNewPage(10);
          
          // Alternate row colors
          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
          }

          xPosition = margin + 2;
          const rowData = [
            `${week.week_number}`,
            `${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)}`,
            `${week.weekly_tickets_sold || 0}`,
            formatCurrency(week.weekly_sales || 0),
            week.winner_name || 'No Winner',
            week.card_selected || 'N/A',
            formatCurrency(week.weekly_payout || 0),
            week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
          ];

          rowData.forEach((data, colIndex) => {
            doc.text(data, xPosition, yPosition + 5);
            xPosition += colWidths[colIndex];
          });
          yPosition += 8;
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.text('No weekly data available for this game.', margin, yPosition);
      }
      yPosition += 15;

      // Winners Summary Section
      addSectionHeader('WINNERS SUMMARY');
      
      const winners = game.weeks?.filter((week: any) => week.winner_name) || [];
      if (winners.length > 0) {
        winners.forEach((week: any) => {
          checkNewPage(15);
          doc.setFont("helvetica", "bold");
          doc.text(`Week ${week.week_number}:`, margin, yPosition);
          doc.setFont("helvetica", "normal");
          doc.text(`${week.winner_name} - ${week.card_selected} - ${formatCurrency(week.weekly_payout || 0)}`, margin + 25, yPosition);
          yPosition += 6;
          
          if (week.card_selected === 'Queen of Hearts') {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(200, 0, 0);
            doc.text('🎉 JACKPOT WINNER! 🎉', margin + 25, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 6;
          }
        });

        // Final Winner Section
        const finalWinner = winners.find((week: any) => week.card_selected === 'Queen of Hearts');
        if (finalWinner) {
          yPosition += 10;
          addSectionHeader('FINAL JACKPOT WINNER');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Winner: ${finalWinner.winner_name}`, margin, yPosition);
          yPosition += 8;
          doc.text(`Week: ${finalWinner.week_number}`, margin, yPosition);
          yPosition += 8;
          doc.text(`Card: Queen of Hearts`, margin, yPosition);
          yPosition += 8;
          doc.text(`Prize Amount: ${formatCurrency(finalWinner.weekly_payout || 0)}`, margin, yPosition);
          yPosition += 8;
          doc.text(`Date: ${formatDateStringForDisplay(finalWinner.end_date)}`, margin, yPosition);
          yPosition += 8;
          doc.text(`Present: ${finalWinner.winner_present ? 'Yes' : 'No'}`, margin, yPosition);
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.text('No winners recorded for this game.', margin, yPosition);
      }
      yPosition += 15;

      // Expenses and Donations Section
      if (game.expenses && game.expenses.length > 0) {
        addSectionHeader('EXPENSES & DONATIONS');
        
        const expenses = game.expenses.filter((exp: any) => !exp.is_donation);
        const donations = game.expenses.filter((exp: any) => exp.is_donation);

        if (expenses.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text('Expenses:', margin, yPosition);
          yPosition += 8;
          
          expenses.forEach((expense: any) => {
            checkNewPage(8);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`${formatDateStringShort(expense.date)} - ${expense.memo || 'No description'} - ${formatCurrency(expense.amount)}`, margin + 5, yPosition);
            yPosition += 6;
          });
          yPosition += 5;
        }

        if (donations.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text('Donations:', margin, yPosition);
          yPosition += 8;
          
          donations.forEach((donation: any) => {
            checkNewPage(8);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`${formatDateStringShort(donation.date)} - ${donation.memo || 'No description'} - ${formatCurrency(donation.amount)}`, margin + 5, yPosition);
            yPosition += 6;
          });
        }
      }

      // Footer on every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Queen of Hearts Game Report - ${game.name}`, margin, pageHeight - 15);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        doc.text(`Generated: ${formatDateStringForDisplay(getTodayDateString())}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }

      // Save the PDF
      const fileName = `${game.name.replace(/\s+/g, '-')}-comprehensive-report-${getTodayDateString()}.pdf`;
      doc.save(fileName);

      toast({
        title: "Professional Report Generated",
        description: `Comprehensive report for ${game.name} has been downloaded successfully.`,
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
