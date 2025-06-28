
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getAuditLogs, AuditLogEntry } from "@/utils/calculationValidation";
import { formatDateStringForDisplay } from "@/lib/dateUtils";
import { Download, Filter, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface CalculationAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalculationAuditModal({ open, onOpenChange }: CalculationAuditModalProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState({
    operation: '',
    gameId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadLogs = () => {
    const auditLogs = getAuditLogs();
    setLogs(auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const applyFilters = () => {
    const filtered = getAuditLogs({
      operation: filters.operation || undefined,
      gameId: filters.gameId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    });
    setFilteredLogs(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const clearFilters = () => {
    setFilters({
      operation: '',
      gameId: '',
      startDate: '',
      endDate: ''
    });
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calculation-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getOperationBadgeColor = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'ticket_sales_calculation': return 'bg-blue-100 text-blue-800';
      case 'jackpot_calculation': return 'bg-green-100 text-green-800';
      case 'winner_payout': return 'bg-purple-100 text-purple-800';
      case 'game_totals_update': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidationIcon = (log: AuditLogEntry) => {
    const validation = log.outputs.validationResult;
    if (!validation) return <Clock className="h-4 w-4 text-gray-500" />;
    
    if (validation.isValid && validation.warningCount === 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (validation.isValid && validation.warningCount > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const uniqueOperations = [...new Set(logs.map(log => log.operation))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Calculation Audit Trail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="operation">Operation</Label>
                  <Select value={filters.operation} onValueChange={(value) => setFilters(prev => ({ ...prev, operation: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All operations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All operations</SelectItem>
                      {uniqueOperations.map(op => (
                        <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gameId">Game ID</Label>
                  <Input
                    id="gameId"
                    value={filters.gameId}
                    onChange={(e) => setFilters(prev => ({ ...prev, gameId: e.target.value }))}
                    placeholder="Enter game ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="outline" size="sm" onClick={loadLogs}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-1" />
                  Export ({filteredLogs.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filteredLogs.length}</div>
                <div className="text-xs text-muted-foreground">Total Logs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(log => log.outputs.validationResult?.isValid).length}
                </div>
                <div className="text-xs text-muted-foreground">Valid Calculations</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredLogs.filter(log => log.outputs.validationResult?.warningCount > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">With Warnings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(log => log.outputs.error || !log.outputs.validationResult?.isValid).length}
                </div>
                <div className="text-xs text-muted-foreground">Failed/Errors</div>
              </CardContent>
            </Card>
          </div>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Audit Logs ({filteredLogs.length})</CardTitle>
              <CardDescription>Detailed calculation history with validation results</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredLogs.map((log, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getValidationIcon(log)}
                          <Badge className={getOperationBadgeColor(log.operation)}>
                            {log.operation.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateStringForDisplay(log.timestamp.split('T')[0])} {log.timestamp.split('T')[1]?.substring(0, 8)}
                          </span>
                        </div>
                        {log.outputs.executionTimeMs && (
                          <Badge variant="outline">
                            {log.outputs.executionTimeMs.toFixed(2)}ms
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Inputs</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.inputs, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Outputs</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.outputs, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {log.outputs.validationResult && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1 ${log.outputs.validationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                              Valid: {log.outputs.validationResult.isValid ? 'Yes' : 'No'}
                            </span>
                            {log.outputs.validationResult.errorCount > 0 && (
                              <span className="text-red-600">
                                Errors: {log.outputs.validationResult.errorCount}
                              </span>
                            )}
                            {log.outputs.validationResult.warningCount > 0 && (
                              <span className="text-yellow-600">
                                Warnings: {log.outputs.validationResult.warningCount}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs found matching the current filters.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
