import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTodayDateString, formatDateStringForDisplay, formatDateStringShort } from '@/lib/dateUtils';

export const usePdfReports = () => {
  const { toast } = useToast();

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const safeString = (value: any, fallback: string = 'N/A') => {
    return value?.toString() || fallback;
  };

  const generateGamePdfReport = async (game: any) => {
    try {
      toast({
        title: "Generating Professional PDF Report",
        description: `Creating comprehensive report for ${game.name}...`,
      });

      // Fetch comprehensive game data with all related tables
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          weeks!inner(
            *,
            ticket_sales(*)
          ),
          expenses(*)
        `)
        .eq('id', game.id)
        .single();

      if (gameError) {
        console.error('Error fetching comprehensive game data:', gameError);
        throw new Error('Failed to fetch complete game data');
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // 10mm padding on all sides as requested
      const margin = 10;
      let yPosition = margin + 15;
      const contentWidth = pageWidth - 2 * margin;

      // Helper function to check if we need a new page with proper 10mm bottom margin
      const checkNewPage = (spaceNeeded: number = 20) => {
        if (yPosition + spaceNeeded > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin + 15;
          return true;
        }
        return false;
      };

      // Helper function to add a professional section header
      const addSectionHeader = (title: string, size: number = 12) => {
        checkNewPage(25);
        yPosition += 8;
        
        // Header background box
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition - 3, contentWidth, 12, 'F');
        
        // Header border
        doc.setLineWidth(0.8);
        doc.setDrawColor(0, 0, 0);
        doc.rect(margin, yPosition - 3, contentWidth, 12);
        
        // Header text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin + 4, yPosition + 5);
        yPosition += 18;
      };

      // Helper function to add data rows with consistent spacing
      const addDataRow = (label: string, value: string, bold: boolean = false, indent: number = 0) => {
        checkNewPage(8);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Wrap long text properly
        const maxLabelWidth = 80;
        const maxValueWidth = 90;
        
        const labelLines = doc.splitTextToSize(label, maxLabelWidth);
        const valueLines = doc.splitTextToSize(value, maxValueWidth);
        
        const maxLines = Math.max(labelLines.length, valueLines.length);
        
        labelLines.forEach((line: string, index: number) => {
          doc.text(line, margin + 4 + indent, yPosition + (index * 6));
        });
        
        doc.setFont("helvetica", "normal");
        valueLines.forEach((line: string, index: number) => {
          doc.text(line, margin + 90, yPosition + (index * 6));
        });
        
        yPosition += maxLines * 6 + 2;
      };

      // Helper function to add footer line
      const addFooterLine = () => {
        doc.setLineWidth(0.5);
        doc.setDrawColor(150, 150, 150);
        doc.line(margin, pageHeight - margin - 15, pageWidth - margin, pageHeight - margin - 15);
      };

      // Helper function to create responsive tables with proper overflow handling
      const createTable = (headers: string[], rows: string[][], colWidths: number[], title?: string) => {
        if (title) {
          checkNewPage(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(title, margin + 2, yPosition);
          yPosition += 8;
        }
        
        checkNewPage(20);
        
        const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
        const startX = margin;
        
        // Ensure table fits on page
        if (tableWidth > contentWidth) {
          const scaleFactor = contentWidth / tableWidth;
          colWidths = colWidths.map(width => width * scaleFactor);
        }
        
        // Table header
        doc.setFillColor(230, 230, 230);
        doc.rect(startX, yPosition, contentWidth, 10, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(startX, yPosition, contentWidth, 10);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        let xPos = startX + 2;
        headers.forEach((header, index) => {
          // Wrap header text if needed
          const headerLines = doc.splitTextToSize(header, colWidths[index] - 4);
          headerLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, xPos, yPosition + 4 + (lineIndex * 3));
          });
          
          if (index < headers.length - 1) {
            doc.line(xPos + colWidths[index] - 2, yPosition, xPos + colWidths[index] - 2, yPosition + 10);
          }
          xPos += colWidths[index];
        });
        yPosition += 10;
        
        // Table rows with proper text wrapping
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        
        rows.forEach((row, rowIndex) => {
          // Calculate row height based on wrapped text
          let maxRowHeight = 8;
          const cellContents: string[][] = [];
          
          row.forEach((cell, cellIndex) => {
            const cellText = doc.splitTextToSize(cell, colWidths[cellIndex] - 4);
            cellContents.push(cellText);
            maxRowHeight = Math.max(maxRowHeight, cellText.length * 4 + 4);
          });
          
          checkNewPage(maxRowHeight);
          
          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(startX, yPosition, contentWidth, maxRowHeight, 'F');
          }
          
          // Row border
          doc.setLineWidth(0.3);
          doc.rect(startX, yPosition, contentWidth, maxRowHeight);
          
          xPos = startX + 2;
          cellContents.forEach((cellLines, cellIndex) => {
            cellLines.forEach((line: string, lineIndex: number) => {
              doc.text(line, xPos, yPosition + 6 + (lineIndex * 4));
            });
            
            if (cellIndex < cellContents.length - 1) {
              doc.line(xPos + colWidths[cellIndex] - 2, yPosition, xPos + colWidths[cellIndex] - 2, yPosition + maxRowHeight);
            }
            xPos += colWidths[cellIndex];
          });
          yPosition += maxRowHeight;
        });
        yPosition += 8;
      };

      // Professional Document Header with proper 10mm top margin and centered alignment
      doc.setLineWidth(1.5);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, margin, contentWidth, 35);
      
      // Create centered header text block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('QUEEN OF HEARTS', pageWidth / 2, margin + 10, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('COMPREHENSIVE GAME REPORT', pageWidth / 2, margin + 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(safeString(gameData.name), pageWidth / 2, margin + 30, { align: 'center' });
      
      yPosition = margin + 45;

      // Report Information Box with better structure
      doc.setLineWidth(0.5);
      doc.setDrawColor(100, 100, 100);
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, 18, 'FD');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Report Generated: ${formatDateStringForDisplay(getTodayDateString())}`, margin + 4, yPosition + 5);
      doc.text(`Status: ${gameData.end_date ? 'COMPLETED' : 'IN PROGRESS'}`, margin + 4, yPosition + 10);
      doc.text(`Game Duration: ${formatDateStringForDisplay(gameData.start_date)} - ${gameData.end_date ? formatDateStringForDisplay(gameData.end_date) : 'Ongoing'}`, margin + 4, yPosition + 15);
      
      doc.text(`Total Weeks: ${gameData.weeks?.length || 0}`, pageWidth - margin - 4, yPosition + 5, { align: 'right' });
      doc.text(`Game #${safeString(gameData.game_number)}`, pageWidth - margin - 4, yPosition + 10, { align: 'right' });
      
      yPosition += 25;

      // GAME CONFIGURATION
      addSectionHeader('GAME CONFIGURATION');
      
      // Configuration box with proper padding and structure
      const configBoxHeight = 65;
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, yPosition, contentWidth, configBoxHeight, 'F');
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, configBoxHeight);
      
      // Configuration data with proper structure and spacing
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const leftColX = margin + 10;
      const rightColX = margin + 110;
      const valueOffsetLeft = 40;
      const valueOffsetRight = 50;
      const startY = yPosition + 12;
      const lineSpacing = 10;
      
      // Left column with proper alignment and spacing
      doc.text('Game Number:', leftColX, startY);
      doc.text('Start Date:', leftColX, startY + lineSpacing);
      doc.text('End Date:', leftColX, startY + (lineSpacing * 2));
      doc.text('Total Weeks:', leftColX, startY + (lineSpacing * 3));
      doc.text('Ticket Price:', leftColX, startY + (lineSpacing * 4));
      
      // Right column with proper alignment and spacing
      doc.text('Organization Share:', rightColX, startY);
      doc.text('Jackpot Share:', rightColX, startY + lineSpacing);
      doc.text('Starting Carryover:', rightColX, startY + (lineSpacing * 2));
      doc.text('Minimum Jackpot:', rightColX, startY + (lineSpacing * 3));
      doc.text('Game Status:', rightColX, startY + (lineSpacing * 4));
      
      // Values with consistent alignment
      doc.setFont("helvetica", "normal");
      doc.text(safeString(gameData.game_number), leftColX + valueOffsetLeft, startY);
      doc.text(formatDateStringForDisplay(gameData.start_date), leftColX + valueOffsetLeft, startY + lineSpacing);
      doc.text(gameData.end_date ? formatDateStringForDisplay(gameData.end_date) : 'In Progress', leftColX + valueOffsetLeft, startY + (lineSpacing * 2));
      doc.text(safeString(gameData.weeks?.length), leftColX + valueOffsetLeft, startY + (lineSpacing * 3));
      doc.text(formatCurrency(gameData.ticket_price), leftColX + valueOffsetLeft, startY + (lineSpacing * 4));
      
      doc.text(`${gameData.organization_percentage || 40}%`, rightColX + valueOffsetRight, startY);
      doc.text(`${gameData.jackpot_percentage || 60}%`, rightColX + valueOffsetRight, startY + lineSpacing);
      doc.text(formatCurrency(gameData.carryover_jackpot), rightColX + valueOffsetRight, startY + (lineSpacing * 2));
      doc.text(formatCurrency(gameData.minimum_starting_jackpot), rightColX + valueOffsetRight, startY + (lineSpacing * 3));
      doc.text(gameData.end_date ? 'Completed' : 'Active', rightColX + valueOffsetRight, startY + (lineSpacing * 4));
      
      yPosition += configBoxHeight + 10;

      // FINANCIAL SUMMARY - Calculate from actual data
      addSectionHeader('FINANCIAL SUMMARY');
      
      // Calculate accurate totals from all ticket sales data
      let totalTicketsSold = 0;
      let totalSalesRevenue = 0;
      
      gameData.weeks?.forEach((week: any) => {
        if (week.ticket_sales && week.ticket_sales.length > 0) {
          week.ticket_sales.forEach((sale: any) => {
            totalTicketsSold += sale.tickets_sold || 0;
            totalSalesRevenue += sale.amount_collected || 0;
          });
        } else {
          // Fallback to week totals if ticket_sales not available
          totalTicketsSold += week.weekly_tickets_sold || 0;
          totalSalesRevenue += week.weekly_sales || 0;
        }
      });
      
      const totalDistributions = gameData.weeks?.reduce((sum: number, week: any) => {
        return sum + (week.weekly_payout || 0);
      }, 0) || 0;
      
      const totalExpenses = gameData.expenses?.reduce((sum: number, expense: any) => {
        return sum + (expense.is_donation ? 0 : (expense.amount || 0));
      }, 0) || 0;
      
      const totalDonations = gameData.expenses?.reduce((sum: number, expense: any) => {
        return sum + (expense.is_donation ? (expense.amount || 0) : 0);
      }, 0) || 0;
      
      // Calculate organization net profit from actual game data
      const organizationNetProfit = gameData.organization_net_profit || 0;
      
      // Calculate next game contribution from the database field
      const nextGameContribution = gameData.jackpot_contribution_to_next_game || 0;
      
      // Calculate actual game distributions (total distributions minus next game contribution)
      const actualGameDistributions = totalDistributions - nextGameContribution;
      
      // Financial Summary Box with proper fit-content height
      const financialBoxHeight = 65;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, contentWidth, financialBoxHeight, 'F');
      doc.setLineWidth(0.8);
      doc.rect(margin, yPosition, contentWidth, financialBoxHeight);
      
      // Financial data with proper padding
      const financialStartY = yPosition + 8;
      const financialLeftX = margin + 8;
      const financialValueX = margin + 120;
      const financialLineSpacing = 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const financialItems = [
        ['Total Tickets Sold:', `${totalTicketsSold.toLocaleString()} tickets`],
        ['Total Sales Revenue:', formatCurrency(totalSalesRevenue)],
        ['Total Winner Distributions:', formatCurrency(actualGameDistributions)],
        ['Total Expenses:', formatCurrency(totalExpenses)],
        ['Total Donations:', formatCurrency(totalDonations)],
        ['Organization Net Profit:', formatCurrency(organizationNetProfit)],
        ['Next game Contribution:', formatCurrency(nextGameContribution)]
      ];
      
      financialItems.forEach(([label, value], index) => {
        const yPos = financialStartY + (index * financialLineSpacing);
        doc.setFont("helvetica", "bold");
        doc.text(label, financialLeftX, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, financialValueX, yPos);
      });
      
      yPosition += financialBoxHeight + 10;

      // DETAILED WEEKLY PERFORMANCE
      addSectionHeader('DETAILED WEEKLY PERFORMANCE');
      
      if (gameData.weeks && gameData.weeks.length > 0) {
        const weekHeaders = ['Week', 'Period', 'Tickets', 'Sales', 'Winner', 'Slot', 'Card', 'Payout', 'Present'];
        const weekColWidths = [16, 42, 18, 23, 32, 18, 28, 23, 16];
        
        const weekRows = gameData.weeks
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .map((week: any) => {
            // Calculate week totals from ticket_sales data
            let weekTickets = 0;
            let weekSales = 0;
            
            if (week.ticket_sales && week.ticket_sales.length > 0) {
              week.ticket_sales.forEach((sale: any) => {
                weekTickets += sale.tickets_sold || 0;
                weekSales += sale.amount_collected || 0;
              });
            } else {
              // Fallback to week totals if ticket_sales not available
              weekTickets = week.weekly_tickets_sold || 0;
              weekSales = week.weekly_sales || 0;
            }
            
            return [
              safeString(week.week_number),
              `${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)}`,
              safeString(weekTickets),
              formatCurrency(weekSales),
              safeString(week.winner_name, 'No Winner'),
              safeString(week.slot_chosen, 'N/A'),
              safeString(week.card_selected, 'N/A'),
              formatCurrency(week.weekly_payout || 0),
              week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
            ];
          });
        
        createTable(weekHeaders, weekRows, weekColWidths, 'Weekly Performance Summary');
        
        // Ensure we have enough space for the Performance Totals section
        checkNewPage(60);
        
        // Add weekly totals summary
        const weeklyTotalsHeaders = ['Total Weeks', 'Total Tickets', 'Total Sales', 'Total Payouts', 'Avg. per Week'];
        const avgTicketsPerWeek = gameData.weeks.length > 0 ? Math.round(totalTicketsSold / gameData.weeks.length) : 0;
        const avgSalesPerWeek = gameData.weeks.length > 0 ? totalSalesRevenue / gameData.weeks.length : 0;
        
        // Calculate actual payouts (total payouts minus next game contribution)
        const actualTotalPayouts = totalDistributions - nextGameContribution;
        const payoutDisplay = `${formatCurrency(totalDistributions)} - ${formatCurrency(nextGameContribution)} = ${formatCurrency(actualTotalPayouts)}`;
        
        const weeklyTotalsRows = [[
          safeString(gameData.weeks.length),
          totalTicketsSold.toLocaleString(),
          formatCurrency(totalSalesRevenue),
          payoutDisplay,
          `${avgTicketsPerWeek} tickets / ${formatCurrency(avgSalesPerWeek)}`
        ]];
        
        const weeklyTotalsColWidths = [25, 25, 25, 60, 65];
        createTable(weeklyTotalsHeaders, weeklyTotalsRows, weeklyTotalsColWidths, 'Performance Totals');
        
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('No weekly performance data available for this game.', margin + 4, yPosition);
        yPosition += 20;
      }

      // Start Page 3 for DAILY TICKET SALES BREAKDOWN
      if (doc.getNumberOfPages() < 3) {
        doc.addPage();
        yPosition = 30; // 30px gap from top
        addFooterLine(); // Add footer line to previous page
      }
      
      // DAILY TICKET SALES BREAKDOWN
      const weeksWithSales = gameData.weeks?.filter((week: any) => week.ticket_sales && week.ticket_sales.length > 0) || [];
      
      if (weeksWithSales.length > 0) {
        addSectionHeader('DAILY TICKET SALES BREAKDOWN');
        
        weeksWithSales
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .forEach((week: any) => {
            // Check if we need more space for the complete week table (estimate 80px for header + table)
            const estimatedWeekHeight = 80;
            if (yPosition + estimatedWeekHeight > pageHeight - margin - 30) {
              addFooterLine();
              doc.addPage();
              yPosition = 30; // 30px gap from top
            }
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`Week ${week.week_number} Daily Sales (${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)})`, margin + 2, yPosition);
            yPosition += 10;
            
            const dailyHeaders = ['Date', 'Tickets', 'Amount', 'Org. Total', 'Jackpot Total', 'End Jackpot'];
            const dailyColWidths = [30, 22, 28, 28, 28, 30];
            
            const dailyRows = week.ticket_sales
              .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((sale: any) => [
                formatDateStringShort(sale.date),
                safeString(sale.tickets_sold),
                formatCurrency(sale.amount_collected),
                formatCurrency(sale.organization_total),
                formatCurrency(sale.jackpot_total),
                formatCurrency(sale.ending_jackpot_total)
              ]);
            
            createTable(dailyHeaders, dailyRows, dailyColWidths);
          });
        
      }

      // WINNERS DIRECTORY
      const winners = gameData.weeks?.filter((week: any) => week.winner_name && week.winner_name.trim() !== '') || [];
      if (winners.length > 0) {
        addSectionHeader('WINNERS DIRECTORY');
        
        const winnerHeaders = ['Week', 'Winner Name', 'Slot', 'Card', 'Payout', 'Date', 'Present'];
        const winnerColWidths = [16, 40, 16, 26, 26, 26, 16];
        
        const winnerRows = winners
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .map((week: any) => [
            safeString(week.week_number),
            safeString(week.winner_name),
            safeString(week.slot_chosen, 'N/A'),
            safeString(week.card_selected),
            formatCurrency(week.weekly_payout),
            formatDateStringShort(week.end_date),
            week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
          ]);
        
        createTable(winnerHeaders, winnerRows, winnerColWidths, 'Game Winners');
        
        // Jackpot Winner Special Section
        const jackpotWinner = winners.find((week: any) => week.card_selected === 'Queen of Hearts');
        if (jackpotWinner) {
          // Move to next page
          addFooterLine();
          doc.addPage();
          yPosition = 30; // 30px gap from top
          
          // Add centered header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text('JACKPOT WINNER', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 20;
          
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPosition, contentWidth, 30, 'F');
          doc.setLineWidth(1.2);
          doc.setDrawColor(200, 0, 0);
          doc.rect(margin, yPosition, contentWidth, 30);
          
          // Calculate jackpot value: ending_jackpot + weekly_payout - next game contribution
          // This gives us the actual jackpot amount available for the winner
          const actualJackpotPayout = (jackpotWinner.ending_jackpot || 0) + (jackpotWinner.weekly_payout || 0) - (gameData.jackpot_contribution_to_next_game || 0);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(`Winner: ${jackpotWinner.winner_name}`, margin + 5, yPosition + 18);
          doc.text(`Week: ${jackpotWinner.week_number}`, margin + 5, yPosition + 25);
          doc.text(`Jackpot: ${formatCurrency(actualJackpotPayout)}`, pageWidth - margin - 5, yPosition + 18, { align: 'right' });
          doc.text(`Date: ${formatDateStringShort(jackpotWinner.end_date)}`, pageWidth - margin - 5, yPosition + 25, { align: 'right' });
          yPosition += 40;
        }
      }

      // EXPENSES & DONATIONS
      if (gameData.expenses && gameData.expenses.length > 0) {
        addSectionHeader('EXPENSES & DONATIONS');
        
        const expenseHeaders = ['Date', 'Description', 'Amount', 'Type'];
        const expenseColWidths = [25, 85, 25, 25];
        
        const expenseRows = gameData.expenses
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((expense: any) => [
            formatDateStringShort(expense.date),
            safeString(expense.memo, 'No description provided'),
            formatCurrency(expense.amount),
            expense.is_donation ? 'Donation' : 'Expense'
          ]);
        
        createTable(expenseHeaders, expenseRows, expenseColWidths, 'Financial Transactions');
        
        // Expenses vs Donations Summary
        const expenseTotal = gameData.expenses.reduce((sum: number, exp: any) => sum + (exp.is_donation ? 0 : (exp.amount || 0)), 0);
        const donationTotal = gameData.expenses.reduce((sum: number, exp: any) => sum + (exp.is_donation ? (exp.amount || 0) : 0), 0);
        
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, yPosition, contentWidth, 35, 'F');
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition, contentWidth, 35);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text('Summary:', margin + 6, yPosition + 8);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Donations: ${formatCurrency(donationTotal)}`, margin + 6, yPosition + 16);
        doc.text(`Total Expenses: ${formatCurrency(expenseTotal)}`, margin + 6, yPosition + 24);
        doc.text(`Combined Total: ${formatCurrency(expenseTotal + donationTotal)}`, margin + 6, yPosition + 32, { align: 'left' });
        
        yPosition += 40;
      } else {
        addSectionHeader('EXPENSES & DONATIONS');
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('No expenses or donations recorded for this game.', margin + 4, yPosition);
        yPosition += 20;
      }

      // Add space before footer to prevent content overlap
      yPosition += 30;


      // Professional Footer with 10mm bottom margin
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line with proper margin
        doc.setLineWidth(0.5);
        doc.setDrawColor(150, 150, 150);
        doc.line(margin, pageHeight - margin - 15, pageWidth - margin, pageHeight - margin - 15);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Footer content with proper spacing
        doc.text(`Queen of Hearts Report - ${safeString(gameData.name)}`, margin, pageHeight - margin - 8);
        doc.text(`Generated: ${formatDateStringForDisplay(getTodayDateString())}`, pageWidth / 2, pageHeight - margin - 8, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - margin - 8, { align: 'right' });
        
        // Confidential notice
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('This report contains confidential financial information - Handle with care', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });
      }

      // Save with professional naming convention
      const gameNameClean = safeString(gameData.name).replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `QOH-Game-${gameNameClean}-Report-${getTodayDateString()}.pdf`;
      doc.save(fileName);

      toast({
        title: "Professional Report Generated Successfully",
        description: `Comprehensive report for ${gameData.name} downloaded as ${fileName}`,
      });
      
    } catch (error: any) {
      console.error('Error generating comprehensive game PDF:', error);
      
      // Detailed error handling
      let errorMessage = 'Failed to generate PDF report';
      if (error.message?.includes('fetch')) {
        errorMessage = 'Failed to fetch game data from database';
      } else if (error.message?.includes('PDF')) {
        errorMessage = 'Error during PDF generation';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "PDF Generation Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    generateGamePdfReport
  };
};
