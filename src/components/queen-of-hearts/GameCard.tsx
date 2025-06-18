
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Calendar, Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WeekManager } from "./WeekManager";
import { ExpenseTracker } from "./ExpenseTracker";
import { WeekForm } from "./WeekForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface GameCardProps {
  game: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  expandedWeek: string | null;
  onToggleWeek: (weekId: string | null) => void;
  expandedExpenses: string | null;
  onToggleExpenses: (gameId: string | null) => void;
  onGameUpdated: () => void;
  isArchived?: boolean;
}

export function GameCard({
  game,
  isExpanded,
  onToggleExpand,
  expandedWeek,
  onToggleWeek,
  expandedExpenses,
  onToggleExpenses,
  onGameUpdated,
  isArchived = false
}: GameCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [weeks, setWeeks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showWeekForm, setShowWeekForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch weeks and expenses when game is expanded
  useEffect(() => {
    if (isExpanded) {
      fetchWeeks();
      fetchExpenses();
    }
  }, [isExpanded, game.id]);

  const fetchWeeks = async () => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', game.id)
        .order('week_number', { ascending: true });

      if (error) throw error;
      setWeeks(data || []);
    } catch (error: any) {
      console.error('Error fetching weeks:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', game.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleArchiveToggle = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('games')
        .update({
          end_date: isArchived ? null : new Date().toISOString().split('T')[0]
        })
        .eq('id', game.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Game ${isArchived ? 'unarchived' : 'archived'} successfully`,
      });

      onGameUpdated();
    } catch (error: any) {
      console.error('Error toggling archive:', error);
      toast({
        title: "Error",
        description: "Failed to update game",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGame = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game deleted successfully",
      });

      onGameUpdated();
    } catch (error: any) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <>
      <Card className="border-[#1F4E4A]/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="p-1 h-8 w-8"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <div>
                <CardTitle className="text-xl text-[#1F4E4A] font-inter">
                  {game.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Game #{game.game_number}
                  </Badge>
                  {isArchived && (
                    <Badge variant="secondary" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right text-sm">
                <div className="font-semibold text-[#1F4E4A]">
                  {formatCurrency(game.total_sales)}
                </div>
                <div className="text-[#132E2C]/60">Total Sales</div>
              </div>
              
              <div className="flex gap-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchiveToggle}
                  disabled={isLoading}
                  className="h-8 px-2"
                >
                  {isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading}
                  className="h-8 px-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#F7F8FC] rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                <div className="text-sm text-[#132E2C]/60">Total Sales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#A1E96C]">{formatCurrency(game.organization_net_profit)}</div>
                <div className="text-sm text-[#132E2C]/60">Net Profit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(game.total_expenses)}</div>
                <div className="text-sm text-[#132E2C]/60">Expenses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(game.total_donations)}</div>
                <div className="text-sm text-[#132E2C]/60">Donations</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowWeekForm(true)}
                  size="sm"
                  className="bg-[#1F4E4A] hover:bg-[#132E2C]"
                  disabled={isArchived}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Week
                </Button>
              </div>

              {weeks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1F4E4A]">Weeks ({weeks.length})</h4>
                  {weeks.map((week) => (
                    <WeekManager
                      key={week.id}
                      week={week}
                      game={game}
                      isExpanded={expandedWeek === week.id}
                      onToggleExpand={() => onToggleWeek(expandedWeek === week.id ? null : week.id)}
                      onWeekUpdated={fetchWeeks}
                      isArchived={isArchived}
                    />
                  ))}
                </div>
              )}

              <ExpenseTracker
                gameId={game.id}
                gameName={game.name}
                expenses={expenses}
                isExpanded={expandedExpenses === game.id}
                onToggleExpand={() => onToggleExpenses(expandedExpenses === game.id ? null : game.id)}
                onExpenseUpdated={fetchExpenses}
                isArchived={isArchived}
              />
            </div>
          </CardContent>
        )}
      </Card>

      <WeekForm
        open={showWeekForm}
        onOpenChange={setShowWeekForm}
        gameId={game.id}
        existingWeeks={weeks}
        onWeekCreated={() => {
          fetchWeeks();
          setShowWeekForm(false);
        }}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteGame}
        title="Delete Game"
        description={`Are you sure you want to delete "${game.name}"? This action cannot be undone and will delete all associated weeks, ticket sales, and expenses.`}
        isLoading={isLoading}
      />
    </>
  );
}
