
  const confirmDelete = async () => {
    try {
      if (deleteType === 'game') {
        // First delete related entries in ticket_sales
        const { data: weeks } = await supabase
          .from('weeks')
          .select('id')
          .eq('game_id', deleteItemId);
        
        if (weeks && weeks.length > 0) {
          const weekIds = weeks.map(week => week.id);
          
          // Delete ticket sales for these weeks
          await supabase
            .from('ticket_sales')
            .delete()
            .in('week_id', weekIds);
            
          // Delete expenses for this game
          await supabase
            .from('expenses')
            .delete()
            .eq('game_id', deleteItemId);
            
          // Delete the weeks
          await supabase
            .from('weeks')
            .delete()
            .in('id', weekIds);
        }
        
        // Finally delete the game
        await supabase
          .from('games')
          .delete()
          .eq('id', deleteItemId);
        
        toast({
          title: "Game Deleted",
          description: "Game and all associated data have been deleted.",
        });
        
      } else if (deleteType === 'week') {
        // First delete related entries in ticket_sales
        await supabase
          .from('ticket_sales')
          .delete()
          .eq('week_id', deleteItemId);
          
        // Then delete the week
        await supabase
          .from('weeks')
          .delete()
          .eq('id', deleteItemId);
          
        toast({
          title: "Week Deleted",
          description: "Week and all associated entries have been deleted.",
        });
        
      } else if (deleteType === 'entry') {
        // Get the entry details before deletion
        const { data: entry } = await supabase
          .from('ticket_sales')
          .select('*')
          .eq('id', deleteItemId)
          .single();
          
        if (entry) {
          const { game_id, week_id, amount_collected, tickets_sold } = entry;
          
          // Get the week and game
          const { data: week } = await supabase
            .from('weeks')
            .select('*')
            .eq('id', week_id)
            .single();
            
          const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();
            
          // Delete the entry
          await supabase
            .from('ticket_sales')
            .delete()
            .eq('id', deleteItemId);
            
          if (week && game) {
            // Update the week
            await supabase
              .from('weeks')
              .update({
                weekly_sales: week.weekly_sales - amount_collected,
                weekly_tickets_sold: week.weekly_tickets_sold - tickets_sold,
              })
              .eq('id', week_id);
              
            // Update the game
            const lodgeTotal = amount_collected * (game.lodge_percentage / 100);
            await supabase
              .from('games')
              .update({
                total_sales: game.total_sales - amount_collected,
                lodge_net_profit: game.lodge_net_profit - lodgeTotal,
              })
              .eq('id', game_id);
          }
          
          toast({
            title: "Entry Deleted",
            description: "Daily entry has been deleted and totals updated.",
          });
        }
      } else if (deleteType === 'expense') {
        // Get the expense details before deletion
        const { data: expense } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', deleteItemId)
          .single();
          
        if (expense) {
          const { game_id, amount, is_donation } = expense;
          
          // Get the game
          const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();
            
          // Delete the expense
          await supabase
            .from('expenses')
            .delete()
            .eq('id', deleteItemId);
            
          if (game) {
            // Update the game totals
            const updatedValues = {
              total_expenses: is_donation ? game.total_expenses : game.total_expenses - amount,
              total_donations: is_donation ? game.total_donations - amount : game.total_donations,
              lodge_net_profit: game.lodge_net_profit + amount, // Adding because we're removing an expense/donation
            };
            
            await supabase
              .from('games')
              .update(updatedValues)
              .eq('id', game_id);
          }
          
          toast({
            title: is_donation ? "Donation Deleted" : "Expense Deleted",
            description: `The ${is_donation ? "donation" : "expense"} has been deleted and totals updated.`,
          });
        }
      }
      
      // Refresh data
      fetchGames();
      
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };
