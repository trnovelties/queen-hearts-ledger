
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FilterProps {
  selectedGame: string;
  setSelectedGame: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  reportType: string;
  setReportType: (value: string) => void;
  games: any[];
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
}

export function EnhancedFilters({
  selectedGame,
  setSelectedGame,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reportType,
  setReportType,
  games,
  onApplyFilters,
  onResetFilters
}: FilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleReset = () => {
    setSelectedGame('all');
    setStartDate('');
    setEndDate('');
    setReportType('cumulative');
    onResetFilters?.();
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-[#1F4E4A]" />
                <span>Advanced Filters</span>
              </div>
              <Button variant="ghost" size="sm">
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Quick Filter Buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Filters</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickFilter(7)}>
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickFilter(30)}>
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickFilter(90)}>
                  Last 3 Months
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickFilter(365)}>
                  Last Year
                </Button>
              </div>
            </div>

            {/* Main Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gameFilter">Game Selection</Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    {games.map(game => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly Analysis</SelectItem>
                    <SelectItem value="game">Game Analysis</SelectItem>
                    <SelectItem value="cumulative">Cumulative Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={handleReset} className="flex items-center space-x-2">
                <X className="h-4 w-4" />
                <span>Reset Filters</span>
              </Button>
              <Button onClick={onApplyFilters} className="bg-[#1F4E4A] hover:bg-[#132E2C]">
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
