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
        description: `Creating report for ${game.name}...`,
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add title and report information
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${game.name} - Detailed Report`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Report Date: ${formatDateStringForDisplay(getTodayDateString())}`, 20, yPosition);
      yPosition += 10;

      // Game details section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Game Information', 20, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Start Date: ${formatDateStringForDisplay(game.start_date)}`, 20, yPosition);
      yPosition += 7;

      if (game.end_date) {
        doc.text(`End Date: ${formatDateStringForDisplay(game.end_date)}`, 20, yPosition);
        yPosition += 7;
      }

      doc.text(`Ticket Price: ${formatCurrency(game.ticket_price)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Organization Percentage: ${game.organization_percentage}%`, 20, yPosition);
      yPosition += 7;
      doc.text(`Jackpot Percentage: ${game.jackpot_percentage}%`, 20, yPosition);
      yPosition += 7;
      doc.text(`Carryover Jackpot: ${formatCurrency(game.carryover_jackpot)}`, 20, yPosition);
      yPosition += 15;

      // Weeks information section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Weeks Information', 20, yPosition);
      yPosition += 8;

      if (game.weeks && game.weeks.length > 0) {
        game.weeks.forEach((week: any) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Week ${week.week_number} (${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)})`, 20, yPosition);
          yPosition += 7;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`  Total Sales: ${formatCurrency(week.weekly_sales)}`, 20, yPosition);
          yPosition += 5;
          doc.text(`  Tickets Sold: ${week.weekly_tickets_sold}`, 20, yPosition);
          yPosition += 10;
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text('No weeks recorded for this game.', 20, yPosition);
        yPosition += 10;
      }

      // Expenses and donations section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Expenses and Donations', 20, yPosition);
      yPosition += 8;

      if (game.expenses && game.expenses.length > 0) {
        game.expenses.forEach((expense: any) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`  ${formatDateStringShort(expense.date)} - ${expense.memo} - ${formatCurrency(expense.amount)} (${expense.is_donation ? 'Donation' : 'Expense'})`, 20, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text('No expenses or donations recorded for this game.', 20, yPosition);
        yPosition += 10;
      }

      // Summary section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Summary', 20, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Total Sales: ${formatCurrency(game.total_sales)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Expenses: ${formatCurrency(game.total_expenses)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Donations: ${formatCurrency(game.total_donations)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Organization Net Profit: ${formatCurrency(game.organization_net_profit)}`, 20, yPosition);
      yPosition += 10;

      // Check if we need to add a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      // Add logo or any other footer information
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text('Queen of Hearts Game Report', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      const fileName = `${game.name.replace(/\s+/g, '-')}-report-${getTodayDateString()}.pdf`;
      doc.save(fileName);

      toast({
        title: "Report Generated",
        description: `${game.name} report has been downloaded successfully.`,
      });
    } catch (error: any) {
      console.error('Error generating game PDF:', error);
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
