
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus } from "lucide-react";

// Sample data for demonstration
const sampleGames = [
  {
    id: "game11",
    name: "Game 11",
    startDate: "2023-08-21",
    endDate: "2024-04-21",
    totalSales: 26552,
    totalPayouts: 14461.6,
    totalExpenses: 1485.08,
    totalDonations: 5994,
    lodgeNetProfit: 4611.36,
    carryoverJackpot: 1606.84,
    weeks: [
      {
        id: "week35",
        weekNumber: 35,
        startDate: "2024-04-15",
        endDate: "2024-04-21",
        ticketsSold: 1748,
        weeklySales: 3496,
        lodgePortion: 1398.4,
        jackpotPortion: 2097.6,
        weeklyPayout: 14461.6,
        endingJackpot: 1606.84,
        winnerName: "Buddy Dickson",
        slotChosen: 31,
        cardSelected: "Queen of Hearts",
        winnerPresent: true
      },
      // More weeks would be here
    ],
    expenses: [
      {
        id: "exp1",
        date: "2024-04-15",
        amount: 50,
        memo: "Ticket rolls",
        type: "Expense"
      },
      {
        id: "exp2",
        date: "2024-04-15",
        amount: 500,
        memo: "Toys for Tots",
        type: "Donation"
      }
      // More expenses would be here
    ]
  },
  {
    id: "game12",
    name: "Game 12",
    startDate: "2024-04-22",
    endDate: null,
    totalSales: 3200,
    totalPayouts: 1100,
    totalExpenses: 220.5,
    totalDonations: 800,
    lodgeNetProfit: 1079.5,
    carryoverJackpot: 0,
    weeks: [
      {
        id: "week1",
        weekNumber: 1,
        startDate: "2024-04-22",
        endDate: "2024-04-28",
        ticketsSold: 980,
        weeklySales: 1960,
        lodgePortion: 784,
        jackpotPortion: 1176,
        weeklyPayout: 50,
        endingJackpot: 1126,
        winnerName: "Jane Smith",
        slotChosen: 12,
        cardSelected: "10 of Clubs",
        winnerPresent: true
      }
      // More weeks would be here
    ],
    expenses: [
      {
        id: "exp3",
        date: "2024-04-25",
        amount: 45.5,
        memo: "Supplies",
        type: "Expense"
      }
      // More expenses would be here
    ]
  }
];

// Total cumulative data across all games
const cumulativeData = {
  totalSales: 204276,
  totalPayouts: 122442,
  totalExpenses: 17924.23,
  totalDonations: 59467.6,
  lodgeNetProfit: 4442.17,
  lodgePortion: 81710.4, // 40% of total sales
  expensesPercentage: 21.9,
  donationsPercentage: 72.67,
  lodgeNetPercentage: 5.43
};

export default function IncomeExpense() {
  const [selectedGame, setSelectedGame] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("game");
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseDetails, setExpenseDetails] = useState({
    gameId: "",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    memo: "",
    isDonation: false
  });
  
  // Chart data based on selected filters
  const chartData = selectedGame === "all" 
    ? sampleGames.map(game => ({
        name: game.name,
        Sales: game.totalSales,
        Payouts: game.totalPayouts,
        Expenses: game.totalExpenses,
        Donations: game.totalDonations
      }))
    : sampleGames
        .filter(game => game.id === selectedGame)
        .flatMap(game => game.weeks.map(week => ({
          name: `Week ${week.weekNumber}`,
          Sales: week.weeklySales,
          Payouts: week.weeklyPayout,
          // Approximating expenses and donations per week for this demo
          Expenses: game.totalExpenses / game.weeks.length,
          Donations: game.totalDonations / game.weeks.length
        })));

  // Filter games by selected game and date range
  const filteredGames = selectedGame === "all" 
    ? sampleGames 
    : sampleGames.filter(game => game.id === selectedGame);

  // Handle adding a new expense/donation
  const handleAddExpense = () => {
    console.log("Adding expense:", expenseDetails);
    setAddExpenseOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <Label htmlFor="gameSelect">Game</Label>
          <Select 
            value={selectedGame} 
            onValueChange={setSelectedGame}
          >
            <SelectTrigger id="gameSelect" className="w-full">
              <SelectValue placeholder="Select Game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {sampleGames.map(game => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="reportType">Report Type</Label>
          <Select 
            value={reportType} 
            onValueChange={setReportType}
          >
            <SelectTrigger id="reportType" className="w-full">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="game">Game</SelectItem>
              <SelectItem value="cumulative">Cumulative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex space-x-4">
          <div className="w-1/2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-1/2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline">Export as PDF</Button>
        
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Expense/Donation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense or Donation</DialogTitle>
              <DialogDescription>
                Record a new expense or donation for a game.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expenseGame" className="col-span-1">Game</Label>
                <Select
                  value={expenseDetails.gameId}
                  onValueChange={(value) => setExpenseDetails({
                    ...expenseDetails,
                    gameId: value
                  })}
                >
                  <SelectTrigger id="expenseGame" className="col-span-3">
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleGames.map(game => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expenseDate" className="col-span-1">Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDetails.date}
                  onChange={(e) => setExpenseDetails({
                    ...expenseDetails,
                    date: e.target.value
                  })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expenseAmount" className="col-span-1">Amount ($)</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseDetails.amount}
                  onChange={(e) => setExpenseDetails({
                    ...expenseDetails,
                    amount: parseFloat(e.target.value)
                  })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expenseMemo" className="col-span-1">Memo</Label>
                <Input
                  id="expenseMemo"
                  value={expenseDetails.memo}
                  onChange={(e) => setExpenseDetails({
                    ...expenseDetails,
                    memo: e.target.value
                  })}
                  className="col-span-3"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDonation"
                  checked={expenseDetails.isDonation}
                  onChange={(e) => setExpenseDetails({
                    ...expenseDetails,
                    isDonation: e.target.checked
                  })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isDonation">This is a donation</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" onClick={handleAddExpense}>Add Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>
            Visualization of sales, payouts, expenses, and donations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Sales" fill="#1F4E4A" />
                <Bar dataKey="Payouts" fill="#A1E96C" />
                <Bar dataKey="Expenses" fill="#F97316" />
                <Bar dataKey="Donations" fill="#0EA5E9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Game Cards List */}
      <div className="space-y-4">
        {filteredGames.map((game) => (
          <Card key={game.id} className="overflow-hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value={game.id} className="border-none">
                <CardHeader className="p-0 border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-accent/50 hover:no-underline">
                    <div className="flex flex-col text-left">
                      <CardTitle className="text-lg">{game.name}</CardTitle>
                      <CardDescription>
                        {game.startDate} to {game.endDate || "Present"} • 
                        Sales: ${game.totalSales.toFixed(2)} • 
                        Net: ${game.lodgeNetProfit.toFixed(2)}
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-4">
                    {/* Weeks Table */}
                    <h3 className="font-medium mb-2">Weekly Data</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-2 py-2 text-left">Week</th>
                            <th className="px-2 py-2 text-left">Date Range</th>
                            <th className="px-2 py-2 text-right">Tickets</th>
                            <th className="px-2 py-2 text-right">Sales</th>
                            <th className="px-2 py-2 text-right">Lodge</th>
                            <th className="px-2 py-2 text-right">Jackpot</th>
                            <th className="px-2 py-2 text-right">Payout</th>
                            <th className="px-2 py-2 text-right">Ending Jackpot</th>
                            <th className="px-2 py-2 text-left">Winner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {game.weeks.map((week) => (
                            <tr key={week.id} className="border-b hover:bg-muted/50">
                              <td className="px-2 py-2">Week {week.weekNumber}</td>
                              <td className="px-2 py-2">{week.startDate} - {week.endDate}</td>
                              <td className="px-2 py-2 text-right">{week.ticketsSold}</td>
                              <td className="px-2 py-2 text-right">${week.weeklySales.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">${week.lodgePortion.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">${week.jackpotPortion.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">${week.weeklyPayout.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">${week.endingJackpot.toFixed(2)}</td>
                              <td className="px-2 py-2">
                                {week.winnerName} ({week.cardSelected})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Expenses Table */}
                    <h3 className="font-medium mb-2">Expenses & Donations</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-2 py-2 text-left">Date</th>
                            <th className="px-2 py-2 text-right">Amount</th>
                            <th className="px-2 py-2 text-left">Memo</th>
                            <th className="px-2 py-2 text-left">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {game.expenses.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-4">
                                No expenses or donations recorded
                              </td>
                            </tr>
                          ) : (
                            game.expenses.map((expense) => (
                              <tr key={expense.id} className="border-b hover:bg-muted/50">
                                <td className="px-2 py-2">{expense.date}</td>
                                <td className="px-2 py-2 text-right">${expense.amount.toFixed(2)}</td>
                                <td className="px-2 py-2">{expense.memo}</td>
                                <td className="px-2 py-2">
                                  <span className={expense.type === "Donation" ? "text-blue-600" : "text-orange-600"}>
                                    {expense.type}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Game Summary */}
                    <h3 className="font-medium mb-2">Game Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Total Sales</div>
                        <div className="font-medium text-lg">${game.totalSales.toFixed(2)}</div>
                      </div>
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Total Payouts</div>
                        <div className="font-medium text-lg">${game.totalPayouts.toFixed(2)}</div>
                      </div>
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Total Expenses</div>
                        <div className="font-medium text-lg">${game.totalExpenses.toFixed(2)}</div>
                      </div>
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Total Donations</div>
                        <div className="font-medium text-lg">${game.totalDonations.toFixed(2)}</div>
                      </div>
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Lodge Net Profit</div>
                        <div className="font-medium text-lg">${game.lodgeNetProfit.toFixed(2)}</div>
                      </div>
                      <div className="bg-accent p-3 rounded-md">
                        <div className="text-muted-foreground">Carryover Jackpot</div>
                        <div className="font-medium text-lg">${game.carryoverJackpot.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        ))}
      </div>
      
      {/* Cumulative Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cumulative Summary</CardTitle>
          <CardDescription>
            Overall financial summary across all games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-accent p-3 rounded-md">
              <div className="text-muted-foreground">Total Sales</div>
              <div className="font-medium text-lg">${cumulativeData.totalSales.toFixed(2)}</div>
            </div>
            <div className="bg-accent p-3 rounded-md">
              <div className="text-muted-foreground">Total Payouts</div>
              <div className="font-medium text-lg">${cumulativeData.totalPayouts.toFixed(2)}</div>
            </div>
            <div className="bg-accent p-3 rounded-md">
              <div className="text-muted-foreground">Total Expenses</div>
              <div className="font-medium text-lg">${cumulativeData.totalExpenses.toFixed(2)}</div>
            </div>
            <div className="bg-accent p-3 rounded-md">
              <div className="text-muted-foreground">Total Donations</div>
              <div className="font-medium text-lg">${cumulativeData.totalDonations.toFixed(2)}</div>
            </div>
            <div className="bg-accent p-3 rounded-md">
              <div className="text-muted-foreground">Lodge Net Profit</div>
              <div className="font-medium text-lg">${cumulativeData.lodgeNetProfit.toFixed(2)}</div>
            </div>
          </div>
          
          <h3 className="font-medium mb-2">Lodge Portion Allocation</h3>
          <div className="bg-muted/30 p-4 rounded-md">
            <div className="mb-2">
              <span className="font-medium">Lodge Portion:</span> ${cumulativeData.lodgePortion.toFixed(2)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Donations</span>
                  <span>${cumulativeData.totalDonations.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 mb-1">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{width: `${cumulativeData.donationsPercentage}%`}}
                  ></div>
                </div>
                <div className="text-xs text-right">{cumulativeData.donationsPercentage}%</div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Expenses</span>
                  <span>${cumulativeData.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 mb-1">
                  <div 
                    className="bg-orange-500 h-2.5 rounded-full" 
                    style={{width: `${cumulativeData.expensesPercentage}%`}}
                  ></div>
                </div>
                <div className="text-xs text-right">{cumulativeData.expensesPercentage}%</div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Lodge Net</span>
                  <span>${cumulativeData.lodgeNetProfit.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 mb-1">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{width: `${cumulativeData.lodgeNetPercentage}%`}}
                  ></div>
                </div>
                <div className="text-xs text-right">{cumulativeData.lodgeNetPercentage}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
