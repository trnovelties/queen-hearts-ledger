
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatDateStringForDisplay } from '@/lib/dateUtils';

interface ExpenseSectionProps {
  game: any;
  expandedExpenses: string | null;
  onToggleExpenses: (gameId: string) => void;
  onOpenExpenseModal: (gameId: string, gameName: string) => void;
  onOpenDeleteConfirm: (id: string, type: "game" | "week" | "entry" | "expense") => void;
}

export const ExpenseSection = ({
  game,
  expandedExpenses,
  onToggleExpenses,
  onOpenExpenseModal,
  onOpenDeleteConfirm
}: ExpenseSectionProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-4 border-t">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => onToggleExpenses(game.id)}>
        <h3 className="text-lg font-semibold flex items-center">
          Expenses & Donations
          <div className="ml-2">
            {expandedExpenses === game.id ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </h3>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onOpenExpenseModal(game.id, game.name);
          }}
          size="sm"
          variant="outline"
          className="text-sm"
        >
          Add Expense/Donation
        </Button>
      </div>
      
      {expandedExpenses === game.id && (
        <>
          {game.expenses && game.expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {game.expenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDateStringForDisplay(expense.date)}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{expense.is_donation ? 'Donation' : 'Expense'}</TableCell>
                      <TableCell>{expense.memo}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => onOpenDeleteConfirm(expense.id, 'expense')}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No expenses or donations recorded yet.</p>
          )}
        </>
      )}
    </div>
  );
};
