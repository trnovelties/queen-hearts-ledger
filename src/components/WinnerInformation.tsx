
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Edit, Printer, Check, X } from "lucide-react";
import { format } from "date-fns";

interface WinnerInformationProps {
  winner: {
    name: string;
    slot: number | null;
    card: string | null;
    amount: number;
    present: boolean | null;
    date: string;
    gameName: string;
  };
  formatCurrency: (amount: number) => string;
}

export function WinnerInformation({ winner, formatCurrency }: WinnerInformationProps) {
  return (
    <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#8B4513] font-inter flex items-center gap-3 text-xl">
          <Trophy className="h-6 w-6 text-yellow-600" />
          Winner Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B4513] uppercase tracking-wide">Winner Name</p>
            <p className="text-lg font-bold text-[#654321]">{winner.name}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B4513] uppercase tracking-wide">Slot Selected</p>
            <p className="text-lg font-bold text-[#654321]">#{winner.slot}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B4513] uppercase tracking-wide">Card Drawn</p>
            <p className="text-lg font-bold text-[#654321]">{winner.card}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B4513] uppercase tracking-wide">Payout Amount</p>
            <p className="text-lg font-bold text-[#654321]">{formatCurrency(winner.amount)}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B4513] uppercase tracking-wide">Winner Present</p>
            <div className="flex items-center gap-2">
              {winner.present ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-bold text-green-600">Yes</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  <span className="text-lg font-bold text-red-600">No</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 pt-4 border-t border-yellow-200">
          <Button 
            className="bg-[#A1E96C] hover:bg-[#8FD659] text-[#1F4E4A] font-semibold border-2 border-[#A1E96C]"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Winner Details
          </Button>
          
          <Button 
            className="bg-[#A1E96C] hover:bg-[#8FD659] text-[#1F4E4A] font-semibold border-2 border-[#A1E96C]"
            size="sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Payout Slip
          </Button>
          
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="bg-white text-[#8B4513] border-[#8B4513]">
              {winner.gameName}
            </Badge>
            <Badge variant="outline" className="bg-white text-[#8B4513] border-[#8B4513]">
              {format(new Date(winner.date), 'MMM d, yyyy')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
