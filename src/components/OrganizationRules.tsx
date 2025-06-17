
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Save, X } from "lucide-react";

interface OrganizationRulesData {
  id?: string;
  organization_name: string;
  rules_content: string;
  startup_costs: string;
}

export function OrganizationRules() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rulesData, setRulesData] = useState<OrganizationRulesData>({
    organization_name: "YOUR ORGANIZATION NAME HERE",
    rules_content: `To be eligible to play you must be as current member card, spouse card, or widow/widower card in good standing.
Suggested donation for each ticket is $2.00. Altered and/or torn tickets will be discarded and disqualified.
A new, standard 52 card deck, plus two jokers, for a total of 54 cards will be used.
Tickets may be purchased anytime the ORGANIZATION NAME HERE is open however, ticket sales will stop 30 minutes before the drawing. Each ticket purchased must have Name of Member, Member's Contact Phone Number, and Slot Number to be selected, especially if the person is not present to win.
On each Monday at 7:30 p.m., a ticket will be drawn and the prize will be from the funds collected from the prior drawing. The ORGANIZATION NAME HERE clock by the bar/wall will be the official clock. DRAWINGS WILL NOT BE HELD ON HOLIDAYS OR DURING ORGANIZATION FUNCTIONS AND MUST BE POSTED IN THE ORGANIZATION PRIOR TO THE EVENT. THERE WILL BE NO EXCEPTIONS TO THE CANCELATION POLICY OTHER THAN AN ACT OF GOD.
The total prize jackpot will accumulate weekly until the Queen of Hearts is drawn. The jackpot amount will be based on ticket sales from the previous drawing.
If your ticket is drawn from the tumbler, you will choose a card from the case. If the card is the Queen of Hearts, the winner will receive 60% of the jackpot money (if not present, the winner will receive 50% of the jackpot money. Next-start-up will be the money collected from that night's ticket sales. (For example: The jackpot is $2,345 and the night of the drawing $546 in tickets were sold, if the Queen of Hearts is chosen that evening, the jackpot for the next weeks drawing would be $546)
If the Queen of Hearts is not drawn, the winning distributions are as follows:
2'-10's= $25.00
Jack's and King's= $30.00
Ace's= $35.00
Queens (except Queen of Hearts)= $40.00
Joker's= $50.00
**Prize payments will be taken from the prize money and not the organizations portion in accordance to the IRS rules**
If an ineligible person draws a card, that card will be discarded and there will be no distribution to that person, a new ticket will be drawn for an eligible person to choose a new card that night. If by chance an ineligible person chooses the Queen of Hearts, a new game will begin the following week.
Once a card is selected, that card will be removed from play and displayed face up on the board in the slot from which it came. Each week after the drawing, all tickets will be discarded and new tickets will be sold the following week.
All distributions besides the Queen of Hearts will be paid the night of the next drawing. The Queen of Hearts jackpot will be paid out by organization check by the next drawing date.
The Game board will be locked once the game is completed each week.
The organization's portion of the money generated with go to our organization's operations, which include our charitable operations.
In accordance with the IRS, winnings over $600 will receive a W-2G to report winnings. Taxes on any prize over $5,000 will be assessed and Federal Withholding transferred to the IRS by the organization to conform to all local, state, and federal policies. The winner must provide photo identification, a valid membership card and tax information so that all appropriate IRS documents (including IRS Form W-2G and Form 5754) can be issued by the organization. The assessed tax will vary year by year and will be the responsibility of the winner to pay (winner needs to verify the amount of tax required for the year in which the winnings were awarded). A winner from an out of state organization may also have state taxes withheld in accordance with the laws of that state.
To start a new game of Queen of Hearts, a Queen of Hearts committee member (minimum of 3 members) will place a new set of cards in the Game board.
Each week's winner will be posted listing the number of the winning ticket and the amount they won.`,
    startup_costs: `INITIAL START-UP COSTS FOR THE QUEEN OF HEARTS
(all costs are estimated)

Queen of Hearts Board- $100.00
Game Tickets- $13.99 per roll of 1000- $200.00 (10 rolls plus tax and shipping)
Ticket Barrel- $0.00
Rules Board- $100.00
Locked Game Board Case- $400.00
Standard Deck of Cards- $50.00
Miscellaneous Expenses- $250.00

TOTAL ESTIMATED START UP COSTS- $1,100.00`
  });

  useEffect(() => {
    fetchRulesData();
  }, []);

  const fetchRulesData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_rules')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rules:', error);
        return;
      }
      
      if (data) {
        setRulesData({
          id: data.id,
          organization_name: data.organization_name || rulesData.organization_name,
          rules_content: data.rules_content || rulesData.rules_content,
          startup_costs: data.startup_costs || rulesData.startup_costs
        });
      }
    } catch (error: any) {
      console.error('Error in fetchRulesData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const saveData = {
        organization_name: rulesData.organization_name,
        rules_content: rulesData.rules_content,
        startup_costs: rulesData.startup_costs,
        updated_at: new Date().toISOString()
      };

      let result;
      if (rulesData.id) {
        result = await supabase
          .from('organization_rules')
          .update(saveData)
          .eq('id', rulesData.id)
          .select();
      } else {
        result = await supabase
          .from('organization_rules')
          .insert(saveData)
          .select();
        
        if (result.data && result.data.length > 0) {
          setRulesData(prev => ({ ...prev, id: result.data[0].id }));
        }
      }
        
      if (result.error) {
        throw result.error;
      }
      
      setEditing(false);
      toast({
        title: "Rules Saved",
        description: "Organization rules have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving rules:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save organization rules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    fetchRulesData(); // Reset to original data
  };

  const formatDisplayText = (text: string, orgName: string) => {
    return text.replace(/ORGANIZATION NAME HERE/g, orgName);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Organization Rules</CardTitle>
              <CardDescription>
                Manage your Queen of Hearts game rules and startup costs
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button onClick={handleSave} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Organization Name</label>
            {editing ? (
              <Input
                value={rulesData.organization_name}
                onChange={(e) => setRulesData(prev => ({ ...prev, organization_name: e.target.value }))}
                placeholder="Enter your organization name"
              />
            ) : (
              <p className="text-lg font-semibold text-primary">{rulesData.organization_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Game Rules</label>
            {editing ? (
              <Textarea
                value={rulesData.rules_content}
                onChange={(e) => setRulesData(prev => ({ ...prev, rules_content: e.target.value }))}
                placeholder="Enter game rules"
                className="min-h-[400px]"
              />
            ) : (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-4">{rulesData.organization_name}</h3>
                <h4 className="font-semibold mb-3">Rules for the Queen of Hearts</h4>
                <div className="whitespace-pre-wrap text-sm">
                  {formatDisplayText(rulesData.rules_content, rulesData.organization_name)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Startup Costs</label>
            {editing ? (
              <Textarea
                value={rulesData.startup_costs}
                onChange={(e) => setRulesData(prev => ({ ...prev, startup_costs: e.target.value }))}
                placeholder="Enter startup costs breakdown"
                className="min-h-[200px]"
              />
            ) : (
              <div className="bg-muted p-4 rounded-lg">
                <div className="whitespace-pre-wrap text-sm font-mono">
                  {rulesData.startup_costs}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
