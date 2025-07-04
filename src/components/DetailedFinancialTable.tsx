
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { 
  Receipt, 
  DollarSign, 
  Users, 
  Calendar,
  Target,
  Banknote,
  Award
} from "lucide-react";
import { formatDateStringForDisplay } from "@/lib/dateUtils";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

interface DetailedFinancialTableProps {
  games: GameSummary[];
  formatCurrency: (amount: number) => string;
}

export function DetailedFinancialTable({ games, formatCurrency }: DetailedFinancialTableProps) {
  return (
    <div className="space-y-6">
      {games.map(game => (
        <Card key={game.id} className="bg-white border-[#1F4E4A]/10 overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {game.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Started: {formatDateStringForDisplay(game.start_date)}
                  {game.end_date && ` | Ended: ${formatDateStringForDisplay(game.end_date)}`}
                </CardDescription>
              </div>
              <Badge 
                variant={game.end_date ? "secondary" : "default"}
                className={game.end_date ? 
                  "bg-gray-100 text-gray-800" : 
                  "bg-[#A1E96C]/20 text-[#132E2C] border-[#A1E96C]/30"
                }
              >
                {game.end_date ? 'Completed' : 'Active'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 p-4 bg-[#F7F8FC] rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <DollarSign className="h-4 w-4 text-[#1F4E4A]" />
                </div>
                <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                <div className="text-xs text-[#132E2C]/70">Total Sales</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-lg font-bold text-orange-600">{formatCurrency(game.total_jackpot_contributions || 0)}</div>
                <div className="text-xs text-[#132E2C]/70">Jackpot Contributions</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(game.net_available_for_final_winner || 0)}</div>
                <div className="text-xs text-[#132E2C]/70">Winner Received</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Receipt className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                <div className="text-xs text-[#132E2C]/70">Expenses</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Banknote className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-lg font-bold text-purple-600">{formatCurrency(game.total_donations)}</div>
                <div className="text-xs text-[#132E2C]/70">Donations</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</div>
                <div className="text-xs text-[#132E2C]/70">Net Profit</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Calendar className="h-4 w-4 text-[#1F4E4A]" />
                </div>
                <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.carryover_jackpot)}</div>
                <div className="text-xs text-[#132E2C]/70">Carryover</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
