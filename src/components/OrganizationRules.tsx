import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Download, FileText, Save, Edit } from "lucide-react";
import jsPDF from 'jspdf';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import queenCardImage from '@/assets/queen-of-hearts-card.png';

interface OrganizationConfig {
  ticket_price: number;
  jackpot_percentage: number;
  organization_percentage: number;
  minimum_starting_jackpot: number;
  penalty_percentage: number;
  card_payouts: any;
}

export function OrganizationRules() {
  const { getCurrentUserId } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [organizationConfig, setOrganizationConfig] = useState<OrganizationConfig | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [customRules, setCustomRules] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

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

      // Fetch custom rules
      const { data: rulesData } = await supabase
        .from('organization_rules')
        .select('rules_content')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (rulesData) {
        setCustomRules(rulesData.rules_content || '');
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!organizationConfig) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const lineHeight = 5;

      // Load the Queen card image
      const img = new Image();
      img.src = queenCardImage;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Page 1 - Header matching Figma layout (595x842 A4)
      const cardWidth = 33; // 117 points from Figma
      const cardHeight = 24; // 86 points from Figma (scaled proportionally)
      const headerTop = 18; // Padding top from Figma
      
      // Calculate center position for the horizontal layout
      const textFrameWidth = 77; // 277 points from Figma (scaled to fit jsPDF)
      const headerContentWidth = cardWidth + 20 + textFrameWidth + 20 + cardWidth; // images + spacing + text + spacing + image
      const headerStartX = (pageWidth - headerContentWidth) / 2;
      
      // Add left Queen card image
      doc.addImage(img, 'PNG', headerStartX, headerTop, cardWidth, cardHeight);
      
      // Text frame positioned between images
      const textFrameX = headerStartX + cardWidth + 20; // 20px spacing from Figma
      const textFrameY = headerTop; // Align with top of images
      
      // Organization name (black text, 20px bold, center aligned within text frame)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(organizationName.toUpperCase(), textFrameX + textFrameWidth / 2, textFrameY + 10, { align: 'center' });

      // "Rules for the Queen of Hearts" subtitle (black, 18px medium, center aligned within text frame)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Rules for the Queen of Hearts', textFrameX + textFrameWidth / 2, textFrameY + 22, { align: 'center' });

      // Add right Queen card image
      doc.addImage(img, 'PNG', textFrameX + textFrameWidth + 20, headerTop, cardWidth, cardHeight);

      // Draw horizontal line (26px spacing after header frame from Figma)
      const lineY = headerTop + cardHeight + 7;
      doc.setLineWidth(0.5);
      doc.line(margin, lineY, pageWidth - margin, lineY);

      // Start content with 26px gap after line (matching Figma itemSpacing)
      let yPos = lineY + 10;

      // Content bullets (12px from Figma)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const printRuleWithRedText = (text: string, currentY: number) => {
        const fragments = text.split(/(\$\d+\.\d+|\d+%|[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/);
        let xPos = margin;
        const maxWidth = pageWidth - 2 * margin;
        
        fragments.forEach((fragment) => {
          if (fragment.match(/\$\d+\.\d+|\d+%/)) {
            doc.setTextColor(255, 0, 0);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          doc.text(fragment, xPos, currentY);
          xPos += doc.getTextWidth(fragment);
        });
        
        doc.setTextColor(0, 0, 0);
      };

      // Rule 1
      const rule1 = `• To be eligible to play you must be a current dues paying member in good standing and/or a spouse of a current dues paying member in good standing, and/or a current holder of a widower membership card.`;
      const lines1 = doc.splitTextToSize(rule1, pageWidth - 2 * margin);
      doc.text(lines1, margin, yPos);
      yPos += lines1.length * lineHeight + 2;

      // Rule 2
      const rule2 = `• Suggested donation for each ticket is $${organizationConfig.ticket_price.toFixed(2)} (CASH ONLY). Altered and/or torn tickets will be discarded and disqualified.`;
      const lines2 = doc.splitTextToSize(rule2, pageWidth - 2 * margin);
      doc.text(lines2, margin, yPos);
      yPos += lines2.length * lineHeight + 2;

      // Rule 3
      doc.text(`• A new, standard 52 card deck, plus two jokers, for a total of 54 cards will be used.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule 4
      const rule4 = `• Tickets may be available anytime the ${organizationName} is open; however, tickets will stop being available 30 minutes before the drawing. Each ticket must have the name of the eligible player and Slot Number to be selected. An eligible player's signature to win. An eligible player's phone number on the ticket is optional.`;
      const lines4 = doc.splitTextToSize(rule4, pageWidth - 2 * margin);
      doc.text(lines4, margin, yPos);
      yPos += lines4.length * lineHeight + 2;

      // Rule 5
      const rule5Text = `• Each Monday at 7:30 p.m., a ticket will be drawn, and the prize will be from the funds collected from the prior week. The ${organizationName}. DRAWINGS MAY NOT BE HELD ON HOLIDAYS OR SPECIAL FUNCTIONS AND WILL BE POSTED IN THE ${organizationName} PRIOR TO THE EVENT. THERE WILL BE NO EXCEPTIONS TO THE CANCELATION POLICY OTHER THAN A WRITTEN DIRECTIVE.`;
      const rule5Lines = doc.splitTextToSize(rule5Text, pageWidth - 2 * margin);
      doc.text(rule5Lines, margin, yPos);
      yPos += rule5Lines.length * lineHeight + 2;

      // Rule 6
      const minJackpot = organizationConfig.minimum_starting_jackpot.toFixed(2);
      const jackpotPct = organizationConfig.jackpot_percentage;
      
      const rule6 = `• The total prize jackpot will accumulate weekly until the Queen of Hearts is drawn. The jackpot will start with $${minJackpot} and will increase once the ticket acquired surpass the starting amount. The jackpot amount will be at ${jackpotPct}% of tickets acquired above and beyond the original $${minJackpot} jackpot.`;
      const lines6 = doc.splitTextToSize(rule6, pageWidth - 2 * margin);
      doc.text(lines6, margin, yPos);
      yPos += lines6.length * lineHeight + 2;

      // Rule 7
      const penaltyPct = 100 - (organizationConfig.penalty_percentage || 10);
      const rule7 = `• If your ticket is drawn from the tumbler, the slot number indicated on the back of the chosen ticket will be revealed. If the Queen of Hearts, the winner will receive the jackpot money, which will be ${jackpotPct}% of money generated (if not present, the winner will receive ${penaltyPct}% of the jackpot money.`;
      const lines7 = doc.splitTextToSize(rule7, pageWidth - 2 * margin);
      doc.text(lines7, margin, yPos);
      yPos += lines7.length * lineHeight + 2;

      // Rule 8
      doc.text(`• If the Queen of Hearts is not drawn, the winning payouts are as follows:`, margin, yPos);
      yPos += lineHeight + 2;

      // Card payouts (black text, no bullets, single line spacing)
      const payout2to10 = (organizationConfig.card_payouts['2 of Hearts'] || 25).toFixed(2);
      const payoutJackKing = (organizationConfig.card_payouts['Jack of Hearts'] || 30).toFixed(2);
      const payoutAce = (organizationConfig.card_payouts['Ace of Hearts'] || 35).toFixed(2);
      const payoutQueen = (organizationConfig.card_payouts['Queen of Spades'] || 40).toFixed(2);
      const payoutJoker = (organizationConfig.card_payouts['Joker'] || 50).toFixed(2);
      
      yPos += 2; // Small spacing before payouts
      doc.text(`2'-10's= $${payout2to10}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Jack's and Kings= $${payoutJackKing}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Ace's= $${payoutAce}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Queens (except Queen of Hearts)= $${payoutQueen}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Joker's= $${payoutJoker}`, margin, yPos);
      yPos += lineHeight + 4;

      // Check if we need a new page before continuing
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      // Rule: Prize payments
      doc.setFont('helvetica', 'bold');
      doc.text(`**Prize payments will be taken from the prize money and not the organization's portion in`, margin, yPos);
      yPos += lineHeight;
      doc.text(`accordance with IRS rules.**`, margin, yPos);
      yPos += lineHeight + 2;
      doc.setFont('helvetica', 'normal');

      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      // Rule: Ineligible person
      const lines2_1 = doc.splitTextToSize(`• If an ineligible person's card is drawn, that card will be discarded and there will be no payout for that person. A valid ticket will be drawn again for an eligible person to choose a new card that night. If by chance an ineligible person chooses the Queen of Hearts, a new game will begin the following week.`, pageWidth - 2 * margin);
      doc.text(lines2_1, margin, yPos);
      yPos += lines2_1.length * lineHeight + 2;

      // Rule: Slot not identified
      const lines2_2 = doc.splitTextToSize(`• If a ticket is chosen and the slot number is not identified, then that ticket will be discarded and a new ticket will be drawn from the tumbler.`, pageWidth - 2 * margin);
      doc.text(lines2_2, margin, yPos);
      yPos += lines2_2.length * lineHeight + 2;

      // Rule: Slot already selected
      const lines2_3 = doc.splitTextToSize(`• If a ticket is chosen and the slot written on the ticket has already been selected, then that ticket will be discarded and a new ticket will be drawn from the tumbler.`, pageWidth - 2 * margin);
      doc.text(lines2_3, margin, yPos);
      yPos += lines2_3.length * lineHeight + 2;

      // Rule: Card removed from play
      const lines2_4 = doc.splitTextToSize(`• Once a card is selected, that card will be removed from play and displayed face up on the board in the slot from which it came. Each week after the drawing, all tickets will be discarded, and new tickets will be available starting the following day.`, pageWidth - 2 * margin);
      doc.text(lines2_4, margin, yPos);
      yPos += lines2_4.length * lineHeight + 2;

      // Rule: Payouts
      const payoutRule = `• All payouts will be paid by ${organizationName} check the following week. The Queen of Hearts jackpot will be paid out by ${organizationName} check within 30 days from the drawing as long as all IRS documentation has been completed.`;
      const payoutLines = doc.splitTextToSize(payoutRule, pageWidth - 2 * margin);
      doc.text(payoutLines, margin, yPos);
      yPos += payoutLines.length * lineHeight + 2;

      // Rule: Game board locked
      doc.text(`• The Game board will be locked once the game is completed each week.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule: Organization portion
      const orgPortionRule = `• The ${organizationName} portion of the money generated will go to our general and fundraising operations.`;
      const orgPortionLines = doc.splitTextToSize(orgPortionRule, pageWidth - 2 * margin);
      doc.text(orgPortionLines, margin, yPos);
      yPos += orgPortionLines.length * lineHeight + 2;

      // Rule: IRS
      const irsRule = `• In accordance with the IRS, winnings over $600 will receive a W-2G to report winnings. Taxes on any prize over $5,000 will be assessed and Federal Withholding reported to the IRS by the ${organizationName} to conform to all federal, state and ${organizationName} laws and policies. The winner must provide photo identification, a valid membership card and tax information so that all appropriate IRS documents (including IRS Form W-2G and Form 5754, if issued by the ${organizationName}. Form W-2G will vary year by year and will be the responsibility of the winner to pay (winner needs to verify the amount required to be witheld for the year in which winnings are awarded). A winner from an out of state may also have state taxes withheld in accordance with the laws of that state.`;
      const irsLines = doc.splitTextToSize(irsRule, pageWidth - 2 * margin);
      doc.text(irsLines, margin, yPos);
      yPos += irsLines.length * lineHeight + 2;

      // Rule: Start new game
      const lines2_last = doc.splitTextToSize(`• To start a new game of Queen of Hearts, a Queen of Hearts committee member will place a new set of cards in the Game board. The Queen of Hearts committee members are allowed to play the Queen of Hearts Game.`, pageWidth - 2 * margin);
      doc.text(lines2_last, margin, yPos);
      yPos += lines2_last.length * lineHeight + 2;

      // Rule: Winner posted
      const lines2_final = doc.splitTextToSize(`• Each week the winner will be posted listing the number of the winning ticket (slot number) and the amount won.`, pageWidth - 2 * margin);
      doc.text(lines2_final, margin, yPos);

      const fileName = `${organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_rules.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Success",
        description: "Rules PDF downloaded successfully."
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

  const saveCustomRules = async () => {
    try {
      setIsSaving(true);
      const userId = getCurrentUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('organization_rules')
        .upsert({
          user_id: userId,
          organization_name: organizationName,
          rules_content: customRules,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom rules saved successfully."
      });
    } catch (error) {
      console.error('Error saving custom rules:', error);
      toast({
        title: "Error",
        description: "Failed to save custom rules.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateCustomRulesPDF = () => {
    if (!customRules.trim()) {
      toast({
        title: "No Content",
        description: "Please add custom rules before generating PDF.",
        variant: "destructive"
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(organizationName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Custom Queen of Hearts Rules', pageWidth / 2, 30, { align: 'center' });

      // Line
      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);

      // Content - strip HTML tags and format
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = customRules;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(textContent, pageWidth - 2 * margin);
      doc.text(lines, margin, 45);

      const fileName = `${organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_custom_rules.pdf`;
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Custom rules PDF downloaded successfully."
      });
    } catch (error) {
      console.error('Error generating custom rules PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate custom rules PDF.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <CardLoading message="Loading organization rules..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Queen of Hearts Rules</CardTitle>
          </div>
          <CardDescription>
            Manage your organization's Queen of Hearts game rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auto-generated" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto-generated">Official Rules</TabsTrigger>
              <TabsTrigger value="custom">Custom Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="auto-generated" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download professionally formatted rules automatically populated with your organization's settings.
              </p>
              <Button
                variant="default" 
                onClick={generatePDF}
                className="flex items-center gap-2"
                disabled={!organizationConfig}
              >
                <Download className="h-4 w-4" />
                Download Auto-Generated PDF
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create and edit custom rules specific to your organization.
              </p>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={customRules}
                  onChange={setCustomRules}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                  className="min-h-[300px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={saveCustomRules}
                  className="flex items-center gap-2"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Custom Rules'}
                </Button>
                <Button
                  variant="outline"
                  onClick={generateCustomRulesPDF}
                  className="flex items-center gap-2"
                  disabled={!customRules.trim()}
                >
                  <Download className="h-4 w-4" />
                  Download Custom PDF
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
