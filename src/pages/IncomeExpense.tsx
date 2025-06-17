import { useState, useEffect } from "react";
import { format } from 'date-fns';
import { DateRange } from "react-day-picker";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, File, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface GameSummary {
  id: string;
  game_number: number;
  game_name: string;
  week_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  created_at: string;
  total_tickets_sold: number;
  total_sales: number;
  total_distributions: number;
  total_expenses: number;
  total_donations: number;
  organization_total_portion: number;
  jackpot_total_portion: number;
  organization_net_profit: number;
}

export default function IncomeExpense() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // Start of the year
    to: new Date(), // Today
  });
  const [gameType, setGameType] = useState("all");
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTicketsSold, setTotalTicketsSold] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalDistributions, setTotalDistributions] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);
  const [organizationTotalPortion, setOrganizationTotalPortion] = useState(0);
  const [jackpotTotalPortion, setJackpotTotalPortion] = useState(0);
  const [organizationNetProfit, setOrganizationNetProfit] = useState(0);
  const [filteredGames, setFilteredGames] = useState<GameSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGameTypes();
    fetchGameSummaries();
  }, []);

  useEffect(() => {
    filterGames();
  }, [gameSummaries, date, gameType, searchTerm]);

  const fetchGameTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('game_types')
        .select('name')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        const types = data.map(item => item.name);
        setGameTypes(['all', ...types]);
      }
    } catch (error: any) {
      console.error("Error fetching game types:", error);
      toast({
        title: "Error",
        description: "Failed to load game types.",
        variant: "destructive",
      });
    }
  };

  const fetchGameSummaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_summaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setGameSummaries(data);
      }
    } catch (error: any) {
      console.error("Error fetching game summaries:", error);
      toast({
        title: "Error",
        description: "Failed to load game summaries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGames = () => {
    if (!date?.from || !date?.to) {
      return;
    }

    const startDate = new Date(date.from);
    const endDate = new Date(date.to);

    const filtered = gameSummaries.filter((game) => {
      const gameDate = new Date(game.created_at);
      const isWithinRange = gameDate >= startDate && gameDate <= endDate;
      const isMatchingType = gameType === "all" || game.game_name === gameType;
      const isMatchingSearch = searchTerm === "" || game.game_name.toLowerCase().includes(searchTerm.toLowerCase());

      return isWithinRange && isMatchingType && isMatchingSearch;
    });

    setFilteredGames(filtered);
    calculateTotals(filtered);
  };

  const calculateTotals = (games: GameSummary[]) => {
    const newTotalTicketsSold = games.reduce((acc, game) => acc + game.total_tickets_sold, 0);
    const newTotalSales = games.reduce((acc, game) => acc + game.total_sales, 0);
    const newTotalDistributions = games.reduce((acc, game) => acc + game.total_distributions, 0);
    const newTotalExpenses = games.reduce((acc, game) => acc + game.total_expenses, 0);
    const newTotalDonations = games.reduce((acc, game) => acc + game.total_donations, 0);
    const newOrganizationTotalPortion = games.reduce((acc, game) => acc + game.organization_total_portion, 0);
    const newJackpotTotalPortion = games.reduce((acc, game) => acc + game.jackpot_total_portion, 0);
    const newOrganizationNetProfit = games.reduce((acc, game) => acc + game.organization_net_profit, 0);

    setTotalTicketsSold(newTotalTicketsSold);
    setTotalSales(newTotalSales);
    setTotalDistributions(newTotalDistributions);
    setTotalExpenses(newTotalExpenses);
    setTotalDonations(newTotalDonations);
    setOrganizationTotalPortion(newOrganizationTotalPortion);
    setJackpotTotalPortion(newJackpotTotalPortion);
    setOrganizationNetProfit(newOrganizationNetProfit);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateRange = (dateRange: DateRange | undefined): string => {
    if (!dateRange?.from || !dateRange?.to) {
      return "No date selected";
    }

    const fromDate = format(dateRange.from, 'MMM d, yyyy');
    const toDate = format(dateRange.to, 'MMM d, yyyy');

    return `${fromDate} - ${toDate}`;
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Header
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const headerText = 'Income & Expense Report';
      const headerWidth = pdf.getTextWidth(headerText);
      const headerX = (pageWidth - headerWidth) / 2;
      pdf.text(headerText, headerX, yPosition);
      yPosition += 15;

      // Organization Name
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      const orgName = profile?.organization_name || 'Organization Name';
      const orgWidth = pdf.getTextWidth(orgName);
      const orgX = (pageWidth - orgWidth) / 2;
      pdf.text(orgName, orgX, yPosition);
      yPosition += 10;

      // Date Range
      pdf.setFontSize(12);
      const dateRangeText = `Date Range: ${formatDateRange(date)}`;
      const dateRangeWidth = pdf.getTextWidth(dateRangeText);
      const dateRangeX = (pageWidth - dateRangeWidth) / 2;
      pdf.text(dateRangeText, dateRangeX, yPosition);
      yPosition += 10;

      // Summary Table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const summaryTableData = [
        ['Total Tickets Sold', totalTicketsSold.toString()],
        ['Total Sales', formatCurrency(totalSales)],
        ['Total Distributions', formatCurrency(totalDistributions)],
        ['Total Expenses', formatCurrency(totalExpenses)],
        ['Total Donations', formatCurrency(totalDonations)],
        ['Organization Total Portion', formatCurrency(organizationTotalPortion)],
        ['Jackpot Total Portion', formatCurrency(jackpotTotalPortion)],
        ['Organization Net Profit', formatCurrency(organizationNetProfit)],
      ];

      pdf.autoTable({
        body: summaryTableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        columnStyles: { 0: { fontStyle: 'bold' } },
        styles: {
          fontSize: 12,
          textColor: [0, 0, 0],
          cellPadding: 3,
          overflow: 'linebreak',
          lineWidth: 0.2,
        },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Game Summaries Table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Game Summaries', margin, yPosition);
      yPosition += 8;

      const gameSummariesHeaders = ['Game', 'Tickets Sold', 'Sales', 'Distributions', 'Expenses', 'Donations', 'Org. Portion', 'Jackpot Portion', 'Net Profit'];
      const gameSummariesData = filteredGames.map(game => [
        game.game_name,
        game.total_tickets_sold.toString(),
        formatCurrency(game.total_sales),
        formatCurrency(game.total_distributions),
        formatCurrency(game.total_expenses),
        formatCurrency(game.total_donations),
        formatCurrency(game.organization_total_portion),
        formatCurrency(game.jackpot_total_portion),
        formatCurrency(game.organization_net_profit),
      ]);

      pdf.autoTable({
        head: [gameSummariesHeaders],
        body: gameSummariesData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: 3,
          overflow: 'linebreak',
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
        },
      });

      // Add a timestamp to the filename
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const filename = `IncomeExpenseReport_${timestamp}.pdf`;

      // Output the PDF
      pdf.save(filename);

      toast({
        title: "Export Successful",
        description: "Income & Expense report generated successfully.",
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Income & Expense</h1>
        <p className="text-muted-foreground">
          View and manage income and expense reports for your organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter games by date range, game type, and search term
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={
                      "w-full justify-start text-left font-normal" +
                      (date?.from ? "pl-3.5" : "text-muted-foreground")
                    }
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      formatDateRange(date)
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    pagedNavigation
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Game Type</Label>
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a game type" />
                </SelectTrigger>
                <SelectContent>
                  {gameTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search</Label>
              <Input
                type="text"
                placeholder="Search by game name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            Summary of income and expenses for the selected games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Tickets Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTicketsSold}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalSales)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalDistributions)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalDonations)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Total Portion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(organizationTotalPortion)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jackpot Total Portion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(jackpotTotalPortion)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(organizationNetProfit)}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Summaries</CardTitle>
          <CardDescription>
            Detailed summaries for each game within the selected filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Game</TableHead>
                    <TableHead className="text-left">Tickets Sold</TableHead>
                    <TableHead className="text-left">Sales</TableHead>
                    <TableHead className="text-left">Distributions</TableHead>
                    <TableHead className="text-left">Expenses</TableHead>
                    <TableHead className="text-left">Donations</TableHead>
                    <TableHead className="text-left">Org. Portion</TableHead>
                    <TableHead className="text-left">Jackpot Portion</TableHead>
                    <TableHead className="text-left">Net Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">{game.game_name}</TableCell>
                      <TableCell>{game.total_tickets_sold}</TableCell>
                      <TableCell>{formatCurrency(game.total_sales)}</TableCell>
                      <TableCell>{formatCurrency(game.total_distributions)}</TableCell>
                      <TableCell>{formatCurrency(game.total_expenses)}</TableCell>
                      <TableCell>{formatCurrency(game.total_donations)}</TableCell>
                      <TableCell>
                        {formatCurrency(game.organization_total_portion)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(game.jackpot_total_portion)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(game.organization_net_profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={10} className="text-right">
                      <Button onClick={generatePDF}>
                        Export Report <Download className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4">No games found for the selected filters.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
