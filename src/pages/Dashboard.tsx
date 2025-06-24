
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameManagement } from "@/components/GameManagement";
import { FinancialOverview } from "@/components/FinancialOverview";
import { WinnerInformation } from "@/components/WinnerInformation";
import { GameComparisonTable } from "@/components/GameComparisonTable";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { FinancialCharts } from "@/components/FinancialCharts";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { formatDateStringShort } from "@/lib/dateUtils";

export default function Dashboard() {
  const { user } = useAuth();
  const { getCurrentUserId, viewingOrganization, isViewingOtherOrganization } = useAdmin();
  const [games, setGames] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, viewingOrganization, isViewingOtherOrganization]);

  const fetchDashboardData = async () => {
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      console.log('=== DASHBOARD DATA FETCH DEBUG ===');
      console.log('Current user ID:', currentUserId);
      console.log('Is viewing other org:', isViewingOtherOrganization);
      console.log('Viewing organization:', viewingOrganization);

      // Fetch games with all related data
      let gameQuery = supabase
        .from('games')
        .select(`
          *,
          weeks (*),
          ticket_sales (*),
          expenses (*)
        `);

      if (isViewingOtherOrganization && viewingOrganization) {
        gameQuery = gameQuery.eq('user_id', viewingOrganization.id);
      } else {
        gameQuery = gameQuery.eq('user_id', currentUserId);
      }

      const { data: gamesData, error: gamesError } = await gameQuery.order('game_number', { ascending: false });

      if (gamesError) {
        console.error('Error fetching games:', gamesError);
        throw gamesError;
      }

      console.log('=== GAMES DATA FETCH RESULT ===');
      console.log('Raw games data:', gamesData);

      // Process games data and extract winners using timezone-neutral date handling
      const processedGames = gamesData || [];
      const allWinners: any[] = [];

      processedGames.forEach(game => {
        console.log(`=== PROCESSING GAME: ${game.name} ===`);
        console.log('Game start_date from DB:', game.start_date);
        console.log('Game start_date type:', typeof game.start_date);
        
        if (game.weeks) {
          game.weeks.forEach((week: any) => {
            console.log(`=== PROCESSING WEEK ${week.week_number} ===`);
            console.log('Week start_date from DB:', week.start_date);
            console.log('Week start_date type:', typeof week.start_date);
            
            if (week.winner_name && week.card_selected && week.weekly_payout > 0) {
              console.log('Found winner, processing date...');
              console.log('Winner date raw from week.start_date:', week.start_date);
              
              // Use timezone-neutral string formatting - NO Date objects
              const formattedDate = formatDateStringShort(week.start_date);
              console.log('Formatted winner date result:', formattedDate);
              
              allWinners.push({
                name: week.winner_name,
                slot: week.slot_chosen,
                card: week.card_selected,
                amount: week.weekly_payout,
                present: week.winner_present,
                date: week.start_date, // Keep as raw string for consistent handling
                gameName: game.name,
                gameNumber: game.game_number,
                weekNumber: week.week_number
              });
            }
          });
        }
      });

      console.log('=== FINAL PROCESSED DATA ===');
      console.log('Total games processed:', processedGames.length);
      console.log('Total winners found:', allWinners.length);
      console.log('Winners sample:', allWinners.slice(0, 2));

      // Sort winners by date (most recent first) using string comparison
      allWinners.sort((a, b) => {
        // Since dates are in YYYY-MM-DD format, string comparison works perfectly
        return b.date.localeCompare(a.date);
      });

      setGames(processedGames);
      setWinners(allWinners);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Please log in to view the dashboard.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#1F4E4A] font-inter mb-2">
          {isViewingOtherOrganization 
            ? `${viewingOrganization?.organization_name || 'Organization'} Dashboard`
            : 'Queen of Hearts Dashboard'
          }
        </h1>
        <p className="text-[#132E2C]/70 text-lg">
          {isViewingOtherOrganization
            ? `Viewing data for: ${viewingOrganization?.email}`
            : 'Comprehensive overview of your fundraising activities'
          }
        </p>
      </div>

      {/* Financial Overview */}
      <FinancialOverview games={games} formatCurrency={formatCurrency} />

      {/* Winner Information */}
      {winners.length > 0 && (
        <WinnerInformation winners={winners} formatCurrency={formatCurrency} />
      )}

      {/* Game Comparison Table */}
      {games.length > 0 && (
        <GameComparisonTable games={games} formatCurrency={formatCurrency} />
      )}

      {/* Financial Charts */}
      {games.length > 0 && (
        <FinancialCharts games={games} />
      )}

      {/* Detailed Financial Table */}
      {games.length > 0 && (
        <DetailedFinancialTable games={games} formatCurrency={formatCurrency} />
      )}

      {/* Game Management */}
      <GameManagement />
    </div>
  );
}
