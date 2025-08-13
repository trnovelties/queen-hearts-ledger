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

      // Professional Document Header with proper 10mm top margin
      doc.setLineWidth(1.5);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, margin, contentWidth, 30);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('QUEEN OF HEARTS', pageWidth / 2, margin + 12, { align: 'center' });
      doc.text('COMPREHENSIVE GAME REPORT', pageWidth / 2, margin + 20, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(safeString(gameData.name), pageWidth / 2, margin + 28, { align: 'center' });
      
      yPosition = margin + 40;

      // Report Information Box with better structure
      doc.setLineWidth(0.5);
      doc.setDrawColor(100, 100, 100);
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, 20, 'FD');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Report Generated: ${formatDateStringForDisplay(getTodayDateString())}`, margin + 4, yPosition + 6);
      doc.text(`Status: ${gameData.end_date ? 'COMPLETED' : 'IN PROGRESS'}`, margin + 4, yPosition + 12);
      doc.text(`Game Duration: ${formatDateStringForDisplay(gameData.start_date)} - ${gameData.end_date ? formatDateStringForDisplay(gameData.end_date) : 'Ongoing'}`, margin + 4, yPosition + 18);
      
      doc.text(`Total Weeks: ${gameData.weeks?.length || 0}`, pageWidth - margin - 4, yPosition + 6, { align: 'right' });
      doc.text(`Game #${safeString(gameData.game_number)}`, pageWidth - margin - 4, yPosition + 12, { align: 'right' });
      doc.text(`Game Type: Queen of Hearts`, pageWidth - margin - 4, yPosition + 18, { align: 'right' });
      
      yPosition += 30;

      // GAME CONFIGURATION
      addSectionHeader('GAME CONFIGURATION');
      
      // Create configuration grid with better layout
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, yPosition, contentWidth, 60, 'F');
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 60);
      yPosition += 5;
      
      const configRows = [
        ['Game Number:', safeString(gameData.game_number), 'Start Date:', formatDateStringForDisplay(gameData.start_date)],
        ['End Date:', gameData.end_date ? formatDateStringForDisplay(gameData.end_date) : 'In Progress', 'Ticket Price:', formatCurrency(gameData.ticket_price)],
        ['Organization Share:', `${gameData.organization_percentage || 40}%`, 'Jackpot Share:', `${gameData.jackpot_percentage || 60}%`],
        ['Starting Carryover:', formatCurrency(gameData.carryover_jackpot), 'Minimum Jackpot:', formatCurrency(gameData.minimum_starting_jackpot)],
        ['Total Weeks:', safeString(gameData.weeks?.length), 'Game Status:', gameData.end_date ? 'Completed' : 'Active']
      ];
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      configRows.forEach((row, index) => {
        const rowY = yPosition + (index * 10);
        doc.setFont("helvetica", "bold");
        doc.text(row[0], margin + 4, rowY + 3);
        doc.text(row[2], margin + 100, rowY + 3);
        doc.setFont("helvetica", "normal");
        doc.text(row[1], margin + 4, rowY + 8);
        doc.text(row[3], margin + 100, rowY + 8);
      });
      
      yPosition += 70;

      // FINANCIAL SUMMARY - Calculate from actual data
      addSectionHeader('FINANCIAL SUMMARY');
      
      // Calculate accurate totals from fetched data
      const totalTicketsSold = gameData.weeks?.reduce((sum: number, week: any) => {
        return sum + (week.weekly_tickets_sold || 0);
      }, 0) || 0;
      
      const totalSalesRevenue = gameData.weeks?.reduce((sum: number, week: any) => {
        return sum + (week.weekly_sales || 0);
      }, 0) || 0;
      
      const totalDistributions = gameData.weeks?.reduce((sum: number, week: any) => {
        return sum + (week.weekly_payout || 0);
      }, 0) || 0;
      
      const totalExpenses = gameData.expenses?.reduce((sum: number, expense: any) => {
        return sum + (expense.is_donation ? 0 : (expense.amount || 0));
      }, 0) || 0;
      
      const totalDonations = gameData.expenses?.reduce((sum: number, expense: any) => {
        return sum + (expense.is_donation ? (expense.amount || 0) : 0);
      }, 0) || 0;
      
      // Use actual database values or calculate
      const organizationNetProfit = gameData.actual_organization_net_profit || gameData.organization_net_profit || 0;
      const nextGameContribution = gameData.jackpot_contribution_to_next_game || 0;
      
      // Financial Summary Box with professional layout
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, contentWidth, 55, 'F');
      doc.setLineWidth(0.8);
      doc.rect(margin, yPosition, contentWidth, 55);
      yPosition += 8;
      
      const financialData = [
        ['Total Tickets Sold:', `${totalTicketsSold.toLocaleString()} tickets`],
        ['Total Sales Revenue:', formatCurrency(totalSalesRevenue)],
        ['Total Winner Distributions:', formatCurrency(totalDistributions)],
        ['Total Expenses:', formatCurrency(totalExpenses)],
        ['Total Donations:', formatCurrency(totalDonations)],
        ['Organization Net Profit:', formatCurrency(organizationNetProfit)],
        ['Carryover to Next Game:', formatCurrency(nextGameContribution)]
      ];
      
      financialData.forEach(([label, value], index) => {
        const isProfit = label.includes('Net Profit');
        addDataRow(label, value, isProfit);
      });
      
      yPosition += 15;

      // DETAILED WEEKLY PERFORMANCE
      addSectionHeader('DETAILED WEEKLY PERFORMANCE');
      
      if (gameData.weeks && gameData.weeks.length > 0) {
        const weekHeaders = ['Week', 'Period', 'Tickets', 'Sales', 'Winner', 'Card', 'Payout', 'Present'];
        const weekColWidths = [18, 45, 20, 25, 35, 30, 25, 18];
        
        const weekRows = gameData.weeks
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .map((week: any) => [
            safeString(week.week_number),
            `${formatDateStringShort(week.start_date)} - ${formatDateStringShort(week.end_date)}`,
            safeString(week.weekly_tickets_sold),
            formatCurrency(week.weekly_sales),
            safeString(week.winner_name, 'No Winner'),
            safeString(week.card_selected, 'N/A'),
            formatCurrency(week.weekly_payout),
            week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
          ]);
        
        createTable(weekHeaders, weekRows, weekColWidths, 'Weekly Performance Summary');
        
        // Add weekly totals summary
        const weeklyTotalsHeaders = ['Total Weeks', 'Total Tickets', 'Total Sales', 'Total Payouts', 'Avg. per Week'];
        const avgTicketsPerWeek = gameData.weeks.length > 0 ? Math.round(totalTicketsSold / gameData.weeks.length) : 0;
        const avgSalesPerWeek = gameData.weeks.length > 0 ? totalSalesRevenue / gameData.weeks.length : 0;
        
        const weeklyTotalsRows = [[
          safeString(gameData.weeks.length),
          totalTicketsSold.toLocaleString(),
          formatCurrency(totalSalesRevenue),
          formatCurrency(totalDistributions),
          `${avgTicketsPerWeek} tickets / ${formatCurrency(avgSalesPerWeek)}`
        ]];
        
        const weeklyTotalsColWidths = [35, 35, 35, 35, 60];
        createTable(weeklyTotalsHeaders, weeklyTotalsRows, weeklyTotalsColWidths, 'Performance Totals');
        
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('No weekly performance data available for this game.', margin + 4, yPosition);
        yPosition += 20;
      }

      // DAILY TICKET SALES BREAKDOWN
      const weeksWithSales = gameData.weeks?.filter((week: any) => week.ticket_sales && week.ticket_sales.length > 0) || [];
      
      if (weeksWithSales.length > 0) {
        addSectionHeader('DAILY TICKET SALES BREAKDOWN');
        
        weeksWithSales
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .slice(0, 5) // Limit to first 5 weeks to prevent PDF from being too long
          .forEach((week: any) => {
            checkNewPage(40);
            
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
        
        if (weeksWithSales.length > 5) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Note: Showing first 5 weeks only. Total weeks with sales data: ${weeksWithSales.length}`, margin + 4, yPosition);
          yPosition += 15;
        }
      }

      // WINNERS DIRECTORY
      const winners = gameData.weeks?.filter((week: any) => week.winner_name && week.winner_name.trim() !== '') || [];
      if (winners.length > 0) {
        addSectionHeader('WINNERS DIRECTORY');
        
        const winnerHeaders = ['Week', 'Winner Name', 'Card', 'Payout', 'Date', 'Present'];
        const winnerColWidths = [20, 45, 30, 30, 30, 20];
        
        const winnerRows = winners
          .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
          .map((week: any) => [
            safeString(week.week_number),
            safeString(week.winner_name),
            safeString(week.card_selected),
            formatCurrency(week.weekly_payout),
            formatDateStringShort(week.end_date),
            week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : 'N/A'
          ]);
        
        createTable(winnerHeaders, winnerRows, winnerColWidths, 'Game Winners');
        
        // Jackpot Winner Special Section
        const jackpotWinner = winners.find((week: any) => week.card_selected === 'Queen of Hearts');
        if (jackpotWinner) {
          checkNewPage(35);
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPosition, contentWidth, 30, 'F');
          doc.setLineWidth(1.2);
          doc.setDrawColor(200, 0, 0);
          doc.rect(margin, yPosition, contentWidth, 30);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(200, 0, 0);
          doc.text('🏆 JACKPOT WINNER ALERT 🏆', pageWidth / 2, yPosition + 10, { align: 'center' });
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(`Winner: ${jackpotWinner.winner_name}`, margin + 5, yPosition + 18);
          doc.text(`Week: ${jackpotWinner.week_number}`, margin + 5, yPosition + 25);
          doc.text(`Jackpot: ${formatCurrency(jackpotWinner.weekly_payout)}`, pageWidth - margin - 5, yPosition + 18, { align: 'right' });
          doc.text(`Date: ${formatDateStringShort(jackpotWinner.end_date)}`, pageWidth - margin - 5, yPosition + 25, { align: 'right' });
          yPosition += 40;
        }
        
        // Winners Statistics
        const totalWinnerPayouts = winners.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0);
        const avgWinnerPayout = winners.length > 0 ? totalWinnerPayouts / winners.length : 0;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Total Winners: ${winners.length} | Average Payout: ${formatCurrency(avgWinnerPayout)} | Total Distributed: ${formatCurrency(totalWinnerPayouts)}`, margin + 4, yPosition);
        yPosition += 15;
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
        doc.rect(margin, yPosition, contentWidth, 20, 'F');
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition, contentWidth, 20);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text('Summary:', margin + 4, yPosition + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Expenses: ${formatCurrency(expenseTotal)}`, margin + 4, yPosition + 14);
        doc.text(`Total Donations: ${formatCurrency(donationTotal)}`, pageWidth - margin - 4, yPosition + 7, { align: 'right' });
        doc.text(`Combined Total: ${formatCurrency(expenseTotal + donationTotal)}`, pageWidth - margin - 4, yPosition + 14, { align: 'right' });
        
        yPosition += 30;
      } else {
        addSectionHeader('EXPENSES & DONATIONS');
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('No expenses or donations recorded for this game.', margin + 4, yPosition);
        yPosition += 20;
      }

      // COMPREHENSIVE GAME STATISTICS
      addSectionHeader('COMPREHENSIVE GAME STATISTICS');
      
      // Calculate comprehensive statistics
      const avgTicketsPerWeek = gameData.weeks?.length > 0 ? Math.round(totalTicketsSold / gameData.weeks.length) : 0;
      const avgSalesPerWeek = gameData.weeks?.length > 0 ? totalSalesRevenue / gameData.weeks.length : 0;
      const profitMargin = totalSalesRevenue > 0 ? ((organizationNetProfit / totalSalesRevenue) * 100).toFixed(1) : '0.0';
      const payoutRatio = totalSalesRevenue > 0 ? ((totalDistributions / totalSalesRevenue) * 100).toFixed(1) : '0.0';
      
      const gameStartDate = new Date(gameData.start_date);
      const gameEndDate = gameData.end_date ? new Date(gameData.end_date) : new Date();
      const gameDurationDays = Math.ceil((gameEndDate.getTime() - gameStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Statistics Grid
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, 50, 'F');
      doc.setLineWidth(0.8);
      doc.rect(margin, yPosition, contentWidth, 50);
      yPosition += 8;
      
      const statsData = [
        ['Game Performance Metrics:', ''],
        ['Average Tickets per Week:', `${avgTicketsPerWeek} tickets`],
        ['Average Sales per Week:', formatCurrency(avgSalesPerWeek)],
        ['Organization Profit Margin:', `${profitMargin}%`],
        ['Winner Payout Ratio:', `${payoutRatio}%`],
        ['Game Duration:', `${gameDurationDays} days (${gameData.weeks?.length || 0} weeks)`],
        ['Game Status:', gameData.end_date ? 'COMPLETED' : 'ACTIVE'],
        ['Completion Rate:', gameData.end_date ? '100%' : `${Math.round(((gameData.weeks?.length || 0) / 54) * 100)}%`]
      ];
      
      statsData.forEach(([label, value], index) => {
        if (index === 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(label, margin + 4, yPosition);
          yPosition += 8;
        } else {
          addDataRow(label, value, false, 4);
        }
      });
      
      yPosition += 10;

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
