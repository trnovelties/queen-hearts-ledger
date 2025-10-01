import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Download, Edit, FileText, CheckCircle2 } from "lucide-react";
import jsPDF from 'jspdf';

interface OrganizationRule {
  id: string;
  organization_name: string;
  rules_content: string;
  rule_type?: 'professional' | 'custom';
}

interface OrganizationConfig {
  ticket_price: number;
  jackpot_percentage: number;
  organization_percentage: number;
  minimum_starting_jackpot: number;
  card_payouts: any;
}

const PROFESSIONAL_TEMPLATE = `QUEEN OF HEARTS GAME RULES

1. TICKET SALES
   • Tickets are [TICKET_PRICE] each
   • Tickets must be purchased before the drawing
   • All ticket sales are final - no refunds

2. DRAWING SCHEDULE
   • Drawing held every Monday at 7:00 PM
   • Jackpot freezes at end of Sunday for Monday night drawing
   • Tickets sold on Monday contribute to next week's jackpot
   • Winner must be present at the time of drawing to claim prize

3. GAME MECHANICS
   • Winner selects one slot from the remaining slots on the board
   • Card behind selected slot is revealed
   • If Queen of Hearts is revealed, winner receives the full jackpot
   • If any other card is revealed, winner receives predetermined payout for that card
   • Selected slot and card are removed from play

4. PRIZE STRUCTURE
   • [JACKPOT_PERCENTAGE]% of ticket sales go to jackpot fund
   • [ORGANIZATION_PERCENTAGE]% of ticket sales go to [ORGANIZATION_NAME]
   • Minimum starting jackpot: [MINIMUM_STARTING_JACKPOT]
   
   Card Payouts:
   • 2's through 10's (any suit): [PAYOUT_2_10]
   • Jacks (any suit): [PAYOUT_JACK]
   • Kings (any suit): [PAYOUT_KING]
   • Aces (any suit): [PAYOUT_ACE]
   • Queens (except Queen of Hearts): [PAYOUT_QUEEN]
   • Joker: [PAYOUT_JOKER]
   • Queen of Hearts: Full Jackpot

5. WINNER ABSENCE PENALTY
   • If winner is not present at drawing, a [PENALTY_PERCENTAGE]% penalty applies
   • Penalty amount is [PENALTY_DISPOSITION]

6. JACKPOT CALCULATION
   • Jackpot contributions accumulate weekly
   • Once contributions exceed minimum jackpot, displayed jackpot = contributions + carryover
   • Until minimum is reached, displayed jackpot = minimum + carryover

7. NEW GAME START
   • When Queen of Hearts is won, current game ends
   • New game begins with minimum starting jackpot plus any carryover
   • All 54 slots are reset (52 cards + 2 Jokers)

8. ELIGIBILITY
   • Must be 18 years or older to participate
   • Employees and immediate family members of [ORGANIZATION_NAME] are eligible to participate

9. LEGAL COMPLIANCE
   • This game is conducted in accordance with [STATE] charitable gaming laws
   • [ORGANIZATION_NAME] holds all required permits and licenses

10. DISPUTE RESOLUTION
    • All decisions by [ORGANIZATION_NAME] officials are final
    • Any disputes must be reported immediately at time of drawing`;

export function OrganizationRules() {
  const { getCurrentUserId } = useAdmin();
  const [professionalRules, setProfessionalRules] = useState<OrganizationRule | null>(null);
  const [customRules, setCustomRules] = useState<OrganizationRule | null>(null);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationConfig, setOrganizationConfig] = useState<OrganizationConfig | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [customFormData, setCustomFormData] = useState({
    organization_name: '',
    rules_content: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const replacePlaceholders = (template: string, orgName: string, config: OrganizationConfig): string => {
    let result = template;
    
    result = result.replace(/\[ORGANIZATION_NAME\]/g, orgName);
    result = result.replace(/\[TICKET_PRICE\]/g, `$${config.ticket_price.toFixed(2)}`);
    result = result.replace(/\[JACKPOT_PERCENTAGE\]/g, `${config.jackpot_percentage}`);
    result = result.replace(/\[ORGANIZATION_PERCENTAGE\]/g, `${config.organization_percentage}`);
    result = result.replace(/\[MINIMUM_STARTING_JACKPOT\]/g, `$${config.minimum_starting_jackpot.toFixed(2)}`);
    
    const cardPayouts = config.card_payouts;
    result = result.replace(/\[PAYOUT_2_10\]/g, `$${(cardPayouts['2 of Hearts'] || 25).toFixed(2)}`);
    result = result.replace(/\[PAYOUT_JACK\]/g, `$${(cardPayouts['Jack of Hearts'] || 30).toFixed(2)}`);
    result = result.replace(/\[PAYOUT_KING\]/g, `$${(cardPayouts['King of Hearts'] || 35).toFixed(2)}`);
    result = result.replace(/\[PAYOUT_ACE\]/g, `$${(cardPayouts['Ace of Hearts'] || 40).toFixed(2)}`);
    result = result.replace(/\[PAYOUT_QUEEN\]/g, `$${(cardPayouts['Queen of Spades'] || 50).toFixed(2)}`);
    result = result.replace(/\[PAYOUT_JOKER\]/g, `$${(cardPayouts['Joker'] || 100).toFixed(2)}`);
    
    result = result.replace(/\[PENALTY_PERCENTAGE\]/g, '10');
    result = result.replace(/\[PENALTY_DISPOSITION\]/g, 'added to next game\'s jackpot');
    result = result.replace(/\[STATE\]/g, 'applicable state');
    
    return result;
  };

  const fetchAllData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Fetch user organization name
      const { data: userData } = await supabase
        .from('users')
        .select('organization_name')
        .eq('id', userId)
        .single();
      
      const orgName = userData?.organization_name || 'YOUR ORGANIZATION NAME HERE';
      setOrganizationName(orgName);

      // Fetch organization configurations
      const { data: configData } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (configData) {
        setOrganizationConfig(configData);
      }

      // Fetch existing rules
      const { data: rulesData } = await supabase
        .from('organization_rules')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (rulesData && rulesData.length > 0) {
        const profRule = rulesData.find(r => r.rule_type === 'professional');
        const custRule = rulesData.find(r => r.rule_type === 'custom');
        
        if (profRule) setProfessionalRules(profRule);
        if (custRule) {
          setCustomRules(custRule);
          setCustomFormData({
            organization_name: custRule.organization_name || orgName,
            rules_content: custRule.rules_content
          });
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateProfessionalPDF = () => {
    if (!organizationConfig) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(organizationName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      doc.setFontSize(16);
      doc.setTextColor(220, 38, 127);
      doc.text('Queen of Hearts Game Rules', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      // Rules Content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const populatedRules = replacePlaceholders(PROFESSIONAL_TEMPLATE, organizationName, organizationConfig);
      const rulesLines = populatedRules.split('\n');
      const margin = 20;
      const lineHeight = 5;

      rulesLines.forEach((line) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        const trimmedLine = line.trim();
        
        if (trimmedLine.match(/^\d+\./)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          const wrappedLines = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin);
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * lineHeight + 3;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        } else if (trimmedLine.startsWith('•')) {
          const wrappedLines = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin - 5);
          doc.text(wrappedLines, margin + 5, yPosition);
          yPosition += wrappedLines.length * lineHeight + 1;
        } else if (trimmedLine.length > 0) {
          const wrappedLines = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin);
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * lineHeight + 2;
        } else {
          yPosition += 4;
        }
      });

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      const footerText = 'These rules are provided for informational purposes. Please consult your organization\'s bylaws and local regulations.';
      const footerLines = doc.splitTextToSize(footerText, pageWidth - 40);
      doc.text(footerLines, pageWidth / 2, pageHeight - 15, { align: 'center' });

      const fileName = `${organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_professional_rules.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Success",
        description: "Professional rules PDF downloaded successfully."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    }
  };

  const generateCustomPDF = () => {
    if (!customRules) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(customRules.organization_name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(16);
      doc.setTextColor(220, 38, 127);
      doc.text('Custom Game Rules', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const rulesLines = customRules.rules_content.split('\n').filter(line => line.trim());
      const margin = 20;
      const lineHeight = 6;

      rulesLines.forEach((line) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        const wrappedLines = doc.splitTextToSize(line.trim(), pageWidth - 2 * margin);
        doc.text(wrappedLines, margin, yPosition);
        yPosition += wrappedLines.length * lineHeight + 2;
      });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const disclaimerText = 'These rules are provided for informational purposes. Please consult your organization\'s bylaws and local regulations.';
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 40);
      doc.text(disclaimerLines, pageWidth / 2, pageHeight - 15, { align: 'center' });

      const fileName = `${customRules.organization_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_custom_rules.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Success",
        description: "Custom rules PDF downloaded successfully."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    }
  };

  const handleSaveCustom = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      if (customRules?.id) {
        const { error } = await supabase
          .from('organization_rules')
          .update({
            organization_name: customFormData.organization_name,
            rules_content: customFormData.rules_content,
            updated_at: new Date().toISOString()
          })
          .eq('id', customRules.id)
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_rules')
          .insert([{
            ...customFormData,
            user_id: userId,
            rule_type: 'custom'
          }]);
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Custom rules saved successfully."
      });
      
      setIsEditingCustom(false);
      fetchAllData();
    } catch (error) {
      console.error('Error saving custom rules:', error);
      toast({
        title: "Error",
        description: "Failed to save custom rules.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <CardLoading message="Loading organization rules..." />;
  }

  const populatedProfessionalRules = organizationConfig 
    ? replacePlaceholders(PROFESSIONAL_TEMPLATE, organizationName, organizationConfig)
    : PROFESSIONAL_TEMPLATE;

  return (
    <div className="space-y-6">
      {/* Card 1: Professional Template */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Professional Rules Template</CardTitle>
          </div>
          <CardDescription>
            Comprehensive pre-populated rules based on your organization's configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-sm">Auto-populated with your settings</span>
            </div>
            <div className="whitespace-pre-line text-sm text-foreground max-h-96 overflow-y-auto">
              {populatedProfessionalRules}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={generateProfessionalPDF}
              className="flex items-center gap-2"
              disabled={!organizationConfig}
            >
              <Download className="h-4 w-4" />
              Download Professional PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Custom Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            <CardTitle>Custom Rules</CardTitle>
          </div>
          <CardDescription>
            Create your own custom rules if you need specific requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditingCustom ? (
            <>
              <div className="bg-muted p-6 rounded-lg">
                {customRules ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">{customRules.organization_name}</h3>
                    <div className="whitespace-pre-line text-sm text-muted-foreground mt-4">
                      {customRules.rules_content}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom rules created yet.</p>
                )}
              </div>

              <div className="flex gap-2">
                {customRules && (
                  <Button 
                    variant="outline" 
                    onClick={generateCustomPDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Custom PDF
                  </Button>
                )}
                
                <Button 
                  onClick={() => setIsEditingCustom(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {customRules ? 'Edit' : 'Create'} Custom Rules
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom_org_name">Organization Name</Label>
                <input
                  id="custom_org_name"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={customFormData.organization_name}
                  onChange={(e) => setCustomFormData({
                    ...customFormData,
                    organization_name: e.target.value
                  })}
                  placeholder="Enter your organization name"
                />
              </div>

              <div>
                <Label htmlFor="custom_rules_content">Custom Rules</Label>
                <Textarea
                  id="custom_rules_content"
                  value={customFormData.rules_content}
                  onChange={(e) => setCustomFormData({
                    ...customFormData,
                    rules_content: e.target.value
                  })}
                  placeholder="Enter your custom game rules..."
                  rows={12}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCustom}>
                  Save Custom Rules
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditingCustom(false);
                    if (customRules) {
                      setCustomFormData({
                        organization_name: customRules.organization_name,
                        rules_content: customRules.rules_content
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
