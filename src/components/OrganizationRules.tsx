import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Download, FileText } from "lucide-react";
import jsPDF from 'jspdf';
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

      // Page 1 - Header matching Figma layout (595x842 A4) - using exact Figma dimensions
      const cardWidth = 117; // Exact from Figma
      const cardHeight = 86; // Exact from Figma
      const textFrameWidth = 277; // Exact from Figma
      const spacing = 20; // Exact from Figma
      const headerTop = 18; // Padding top from Figma
      
      // Calculate center position for the horizontal layout
      const headerContentWidth = cardWidth + spacing + textFrameWidth + spacing + cardWidth; // Total: 551
      const headerStartX = (pageWidth - headerContentWidth) / 2; // (595 - 551) / 2 = 22
      
      // Add left Queen card image
      doc.addImage(img, 'PNG', headerStartX, headerTop, cardWidth, cardHeight);
      
      // Text frame positioned between images
      const textFrameX = headerStartX + cardWidth + spacing;
      const textFrameY = headerTop + 20; // Text frame is 20px down from top (vertically centered in 86px height)
      
      // Organization name (red text, 20px bold, left aligned within text frame)
      doc.setTextColor(255, 0, 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(organizationName.toUpperCase(), textFrameX, textFrameY + 16); // +16 for baseline

      // "Rules for the Queen of Hearts" subtitle (black, 18px medium, center aligned within text frame)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('Rules for the Queen of Hearts', textFrameX + textFrameWidth / 2, textFrameY + 38, { align: 'center' }); // +24 (first text height) + 14 for baseline

      // Add right Queen card image
      doc.addImage(img, 'PNG', textFrameX + textFrameWidth + spacing, headerTop, cardWidth, cardHeight);

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

      // Rule 2 with red price
      doc.text(`• Suggested donation for each ticket is `, margin, yPos);
      const textWidth1 = doc.getTextWidth(`• Suggested donation for each ticket is `);
      doc.setTextColor(255, 0, 0);
      doc.text(`$${organizationConfig.ticket_price.toFixed(2)}`, margin + textWidth1, yPos);
      const priceWidth = doc.getTextWidth(`$${organizationConfig.ticket_price.toFixed(2)}`);
      doc.setTextColor(0, 0, 0);
      doc.text(` (CASH ONLY). Altered and/or torn tickets will be`, margin + textWidth1 + priceWidth, yPos);
      yPos += lineHeight;
      doc.text(`discarded and disqualified.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule 3
      doc.text(`• A new, standard 52 card deck, plus two jokers, for a total of 54 cards will be used.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule 4 with red organization name
      const rule4Part1 = `• Tickets may be available anytime the `;
      doc.text(rule4Part1, margin, yPos);
      const w1 = doc.getTextWidth(rule4Part1);
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, margin + w1, yPos);
      const w2 = doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` is open; however, tickets will stop being`, margin + w1 + w2, yPos);
      yPos += lineHeight;
      const lines4 = doc.splitTextToSize(`available 30 minutes before the drawing. Each ticket must have the name of the eligible player and Slot Number to be selected. An eligible player's signature to win. An eligible player's phone number on the ticket is optional.`, pageWidth - 2 * margin);
      doc.text(lines4, margin, yPos);
      yPos += lines4.length * lineHeight + 2;

      // Rule 5 with red organization names
      const rule5Text = `• Each Monday at 7:30 p.m., a ticket will be drawn, and the prize will be from the funds collected from the prior week. The ${organizationName}. DRAWINGS MAY NOT BE HELD ON HOLIDAYS OR SPECIAL FUNCTIONS AND WILL BE POSTED IN THE ${organizationName} PRIOR TO THE EVENT. THERE WILL BE NO EXCEPTIONS TO THE CANCELATION POLICY OTHER THAN A WRITTEN DIRECTIVE.`;
      const rule5Lines = doc.splitTextToSize(rule5Text, pageWidth - 2 * margin);
      rule5Lines.forEach((line: string) => {
        if (line.includes(organizationName)) {
          const parts = line.split(organizationName);
          let currentX = margin;
          parts.forEach((part, idx) => {
            doc.setTextColor(0, 0, 0);
            doc.text(part, currentX, yPos);
            currentX += doc.getTextWidth(part);
            if (idx < parts.length - 1) {
              doc.setTextColor(255, 0, 0);
              doc.text(organizationName, currentX, yPos);
              currentX += doc.getTextWidth(organizationName);
            }
          });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(line, margin, yPos);
        }
        yPos += lineHeight;
      });
      yPos += 2;

      // Rule 6 with red dollar amounts and percentage
      const minJackpot = organizationConfig.minimum_starting_jackpot.toFixed(2);
      const jackpotPct = organizationConfig.jackpot_percentage;
      
      doc.text(`• The total prize jackpot will accumulate weekly until the Queen of Hearts is drawn. The`, margin, yPos);
      yPos += lineHeight;
      doc.text(`jackpot will start with `, margin, yPos);
      let xp = margin + doc.getTextWidth(`jackpot will start with `);
      doc.setTextColor(255, 0, 0);
      doc.text(`$${minJackpot}`, xp, yPos);
      xp += doc.getTextWidth(`$${minJackpot}`);
      doc.setTextColor(0, 0, 0);
      doc.text(` and will increase once the ticket acquired surpass the starting`, xp, yPos);
      yPos += lineHeight;
      doc.text(`amount.  The jackpot amount will be at `, margin, yPos);
      xp = margin + doc.getTextWidth(`amount.  The jackpot amount will be at `);
      doc.setTextColor(255, 0, 0);
      doc.text(`${jackpotPct}%`, xp, yPos);
      xp += doc.getTextWidth(`${jackpotPct}%`);
      doc.setTextColor(0, 0, 0);
      doc.text(` of tickets acquired above and beyond the original `, xp, yPos);
      yPos += lineHeight;
      doc.setTextColor(255, 0, 0);
      doc.text(`$${minJackpot}`, margin, yPos);
      const dollarW = doc.getTextWidth(`$${minJackpot}`);
      doc.setTextColor(0, 0, 0);
      doc.text(` jackpot.`, margin + dollarW, yPos);
      yPos += lineHeight + 2;

      // Rule 7 with red percentages
      const penaltyPct = 100 - (organizationConfig.penalty_percentage || 10);
      doc.text(`• If your ticket is drawn from the tumbler, the slot number indicated on the back of the chosen`, margin, yPos);
      yPos += lineHeight;
      doc.text(`ticket will be revealed. If the Queen of Hearts, the winner will receive the jackpot money,`, margin, yPos);
      yPos += lineHeight;
      doc.text(`which will be `, margin, yPos);
      xp = margin + doc.getTextWidth(`which will be `);
      doc.setTextColor(255, 0, 0);
      doc.text(`${jackpotPct}%`, xp, yPos);
      xp += doc.getTextWidth(`${jackpotPct}%`);
      doc.setTextColor(0, 0, 0);
      doc.text(` of money generated (if not present, the winner will receive `, xp, yPos);
      yPos += lineHeight;
      doc.setTextColor(255, 0, 0);
      doc.text(`${penaltyPct}%`, margin, yPos);
      const penaltyW = doc.getTextWidth(`${penaltyPct}%`);
      doc.setTextColor(0, 0, 0);
      doc.text(` of the jackpot money.`, margin + penaltyW, yPos);
      yPos += lineHeight + 2;

      // Rule 8
      doc.text(`• If the Queen of Hearts is not drawn, the winning payouts are as follows:`, margin, yPos);
      yPos += lineHeight + 2;

      // Card payouts (in red, no bullets, single line spacing)
      doc.setTextColor(255, 0, 0);
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
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);

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

      // Rule: Payouts with red organization name
      doc.text(`• All payouts will be paid by `, margin, yPos);
      xp = margin + doc.getTextWidth(`• All payouts will be paid by `);
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, xp, yPos);
      xp += doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` check the following week. The Queen of Hearts`, xp, yPos);
      yPos += lineHeight;
      doc.text(`jackpot will be paid out by `, margin, yPos);
      xp = margin + doc.getTextWidth(`jackpot will be paid out by `);
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, xp, yPos);
      xp += doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` check within 30 days from the drawing as long`, xp, yPos);
      yPos += lineHeight;
      doc.text(`as all IRS documentation has been completed.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule: Game board locked
      doc.text(`• The Game board will be locked once the game is completed each week.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule: Organization portion with red text
      doc.text(`• The `, margin, yPos);
      xp = margin + doc.getTextWidth(`• The `);
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, xp, yPos);
      xp += doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` portion of the money generated will go to our general and`, xp, yPos);
      yPos += lineHeight;
      doc.text(`fundraising operations.`, margin, yPos);
      yPos += lineHeight + 2;

      // Rule: IRS with red organization names
      const irsText1 = `• In accordance with the IRS, winnings over $600 will receive a W-2G to report winnings.`;
      doc.text(irsText1, margin, yPos);
      yPos += lineHeight;
      const irsText2 = `Taxes on any prize over $5,000 will be assessed and Federal Withholding reported to the`;
      doc.text(irsText2, margin, yPos);
      yPos += lineHeight;
      doc.text(`IRS by the `, margin, yPos);
      xp = margin + doc.getTextWidth(`IRS by the `);
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, xp, yPos);
      xp += doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` to conform to all federal, state and `, xp, yPos);
      yPos += lineHeight;
      doc.setTextColor(255, 0, 0);
      doc.text(organizationName, margin, yPos);
      const orgW = doc.getTextWidth(organizationName);
      doc.setTextColor(0, 0, 0);
      doc.text(` laws and policies.  The winner must provide photo identification, a valid`, margin + orgW, yPos);
      yPos += lineHeight;
      const irsLines = doc.splitTextToSize(`membership card and tax information so that all appropriate IRS documents (including IRS Form W-2G and Form 5754, if issued by the ${organizationName}. Form W-2G will vary year by year and will be the responsibility of the winner to pay (winner needs to verify the amount required to be witheld for the year in which winnings are awarded). A winner from an out of state may also have state taxes withheld in accordance with the laws of that state.`, pageWidth - 2 * margin);
      irsLines.forEach((line: string) => {
        if (line.includes(organizationName)) {
          const parts = line.split(organizationName);
          let currentX = margin;
          parts.forEach((part, idx) => {
            doc.setTextColor(0, 0, 0);
            doc.text(part, currentX, yPos);
            currentX += doc.getTextWidth(part);
            if (idx < parts.length - 1) {
              doc.setTextColor(255, 0, 0);
              doc.text(organizationName, currentX, yPos);
              currentX += doc.getTextWidth(organizationName);
            }
          });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(line, margin, yPos);
        }
        yPos += lineHeight;
      });
      yPos += 2;

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
            Official game rules for your organization's Queen of Hearts fundraiser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              Download a professionally formatted PDF with your organization's rules, automatically populated with your configured settings:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Organization name: <span className="font-semibold text-foreground">{organizationName}</span></li>
              <li>• Ticket price: <span className="font-semibold text-foreground">${organizationConfig?.ticket_price.toFixed(2)}</span></li>
              <li>• Jackpot percentage: <span className="font-semibold text-foreground">{organizationConfig?.jackpot_percentage}%</span></li>
              <li>• Starting jackpot: <span className="font-semibold text-foreground">${organizationConfig?.minimum_starting_jackpot.toFixed(2)}</span></li>
              <li>• Custom card payouts from your configuration</li>
            </ul>
          </div>

          <Button 
            variant="default" 
            onClick={generatePDF}
            className="flex items-center gap-2"
            disabled={!organizationConfig}
          >
            <Download className="h-4 w-4" />
            Download Rules PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
