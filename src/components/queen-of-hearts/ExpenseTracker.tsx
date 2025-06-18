
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ExpenseModal } from "../ExpenseModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface ExpenseTrackerProps {
  gameId: string;
  gameName: string;
  expenses: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onExpenseUpdated: () => void;
  isArchived?: boolean;
}

export function ExpenseTracker({
  gameId,
  gameName,
  expenses,
  isExpanded,
  onToggleExpand,
  onExpenseUpdated,
  isArchived = false
}: ExpenseTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });

      onExpenseUpdated();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setExpenseToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalExpenses = expenses.filter(e => !e.is_donation).reduce((sum, e) => sum + e.amount, 0);
  const totalDonations = expenses.filter(e => e.is_donation).reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Card className="border-l-4 border-l-[#A1E96C] bg-[#F7F8FC]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              <CardTitle className="text-sm font-semibold text-[#1F4E4A]">
                Expenses & Donations ({expenses.length})
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right text-xs">
                <div className="font-semibold text-[#1F4E4A]">
                  {formatCurrency(totalExpenses + totalDonations)}
                </div>
                <div className="text-[#132E2C]/60">Total</div>
              </div>
              {!isArchived && (
                <Button
                  onClick={() => setShowExpenseModal(true)}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg">
                <div className="text-center">
                  <div className="font-bold text-[#1F4E4A]">{formatCurrency(totalExpenses)}</div>
                  <div className="text-xs text-[#132E2C]/60">Expenses</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[#1F4E4A]">{formatCurrency(totalDonations)}</div>
                  <div className="text-xs text-[#132E2C]/60">Donations</div>
                </div>
              </div>

              {expenses.length > 0 ? (
                <div className="space-y-1">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant={expense.is_donation ? "default" : "outline"} className="text-xs">
                          {expense.is_donation ? "Donation" : "Expense"}
                        </Badge>
                        <span className="text-sm">{formatDate(expense.date)}</span>
                        {expense.memo && (
                          <span className="text-sm text-[#132E2C]/60">- {expense.memo}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1F4E4A]">
                          {formatCurrency(expense.amount)}
                        </span>
                        {!isArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setExpenseToDelete(expense);
                              setShowDeleteDialog(true);
                            }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[#132E2C]/60 text-sm">
                  No expenses or donations recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <ExpenseModal
        open={showExpenseModal}
        onOpenChange={(open) => {
          setShowExpenseModal(open);
          if (!open) onExpenseUpdated();
        }}
        gameId={gameId}
        gameName={gameName}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        description={`Are you sure you want to delete this ${expenseToDelete?.is_donation ? 'donation' : 'expense'}?`}
        isLoading={isLoading}
      />
    </>
  );
}
