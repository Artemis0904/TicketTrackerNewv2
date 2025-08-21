import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  PackageIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  TruckIcon,
  XCircleIcon,
  CalendarIcon,
  RotateCcwIcon,
  FilterIcon,
  ChevronDownIcon,
  XIcon
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { useAppStore } from '@/store/appStore';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useState, useMemo } from 'react';
import SMRequestViewer from '@/components/SMRequestViewer';
import SMReturnViewer from '@/components/SMReturnViewer';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ZoneOption = 'North' | 'South' | 'North East' | 'Army' | 'General';
type StatusOption = 'pending' | 'approved' | 'in-process' | 'in-transit' | 'delivered' | 'rejected' | 'mrc-needed';

const StoreManagerDashboard = () => {
  const { state } = useAppStore();
  const { requests, isLoading } = useMaterialRequests();
  const [selectedZones, setSelectedZones] = useState<ZoneOption[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const selectedRequest = selectedId ? requests.find(r => r.id === selectedId) : null;

  // Filter requests based on selected zones and statuses
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    // Apply zone filter
    if (selectedZones.length > 0) {
      filtered = filtered.filter(request => request.zone && selectedZones.includes(request.zone as ZoneOption));
    }
    
    // Apply status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(request => selectedStatuses.includes(request.status as StatusOption));
    }
    
    return filtered;
  }, [requests, selectedZones, selectedStatuses]);

  // Apply zone filter to all request types
  const approved = filteredRequests.filter(r => r.status === 'approved' && r.requestType !== 'MRC');
  const shipments = filteredRequests.filter(r => (r.status === 'in-transit' || r.status === 'delivered') && r.requestType !== 'MRC');
  const returnRequests = filteredRequests.filter(r => r.requestType === 'MRC');

  // Get available zones from requests for the filter dropdown
  const availableZones = useMemo(() => {
    // Define all possible zones instead of extracting from requests
    const allZones: ZoneOption[] = ['North', 'South', 'North East', 'Army', 'General'];
    return allZones;
  }, []);

  // Get available statuses for the filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Set(requests.map(r => r.status).filter(Boolean));
    return Array.from(statuses).sort() as string[];
  }, [requests]);

  // Helper functions for multi-select
  const toggleZone = (zone: ZoneOption) => {
    setSelectedZones(prev => 
      prev.includes(zone) 
        ? prev.filter(z => z !== zone)
        : [...prev, zone]
    );
  };

  const toggleStatus = (status: StatusOption) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setSelectedZones([]);
    setSelectedStatuses([]);
  };

  // Multi-select Zone Component
  const ZoneMultiSelect = () => {
    const [open, setOpen] = useState(false);
    
    const displayText = selectedZones.length === 0 
      ? "All Zones" 
      : selectedZones.length === 1 
        ? selectedZones[0] 
        : `${selectedZones.length} zones selected`;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-between">
            <span className="truncate">{displayText}</span>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Select Zones</span>
              {selectedZones.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedZones([])}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableZones.map((zone) => (
                <div key={zone} className="flex items-center space-x-2">
                  <Checkbox
                    id={`zone-${zone}`}
                    checked={selectedZones.includes(zone)}
                    onCheckedChange={() => toggleZone(zone)}
                  />
                  <label
                    htmlFor={`zone-${zone}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {zone}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Multi-select Status Component
  const StatusMultiSelect = () => {
    const [open, setOpen] = useState(false);
    
    const displayText = selectedStatuses.length === 0 
      ? "All Statuses" 
      : selectedStatuses.length === 1 
        ? selectedStatuses[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
        : `${selectedStatuses.length} statuses selected`;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-between">
            <span className="truncate">{displayText}</span>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Select Statuses</span>
              {selectedStatuses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatuses([])}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status as StatusOption)}
                    onCheckedChange={() => toggleStatus(status as StatusOption)}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'partially-delivered': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mrc-needed': return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActualStatus = (shipment: any) => {
    if (shipment.status === 'delivered') {
      const receivedItems = shipment.items.filter((item: any) => item.receivedAt);
      const totalItems = shipment.items.length;
      
      if (receivedItems.length === 0) {
        return 'delivered';
      } else if (receivedItems.length < totalItems) {
        return 'partially-delivered';
      } else {
        return 'delivered';
      }
    }
    return shipment.status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage all material requests and their statuses.
        </p>
      </div>

      {/* Zone Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Zone:</span>
                  <ZoneMultiSelect />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <StatusMultiSelect />
                </div>
              </div>
              {(selectedZones.length > 0 || selectedStatuses.length > 0) && (
                <Badge variant="secondary">
                  {filteredRequests.length} requests
                </Badge>
              )}
            </div>
            {(selectedZones.length > 0 || selectedStatuses.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          {/* Selected Filters Display */}
          {(selectedZones.length > 0 || selectedStatuses.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {selectedZones.map((zone) => (
                <Badge key={zone} variant="outline" className="text-xs">
                  Zone: {zone}
                  <button
                    onClick={() => toggleZone(zone)}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedStatuses.map((status) => (
                <Badge key={status} variant="outline" className="text-xs">
                  Status: {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <button
                    onClick={() => toggleStatus(status)}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Approved"
          value={approved.length}
          icon={PackageIcon}
          description={selectedZones.length === 0 && selectedStatuses.length === 0 
            ? "All approved requests" 
            : `${selectedZones.length > 0 ? selectedZones.map(z => z).join(', ') : 'All Zones'} approved requests`}
        />
        <StatsCard
          title="In Transit"
          value={filteredRequests.filter(r => r.status === 'in-transit').length}
          icon={TruckIcon}
          description={selectedZones.length === 0 && selectedStatuses.length === 0 
            ? "Being shipped" 
            : `${selectedZones.length > 0 ? selectedZones.map(z => z).join(', ') : 'All Zones'} in transit`}
        />
        <StatsCard
          title="Delivered"
          value={filteredRequests.filter(r => r.status === 'delivered').length}
          icon={CheckCircleIcon}
          description={selectedZones.length === 0 && selectedStatuses.length === 0 
            ? "Successfully delivered" 
            : `${selectedZones.length > 0 ? selectedZones.map(z => z).join(', ') : 'All Zones'} delivered`}
        />
        <StatsCard
          title="Return Requests"
          value={returnRequests.length}
          icon={RotateCcwIcon}
          description={selectedZones.length === 0 && selectedStatuses.length === 0 
            ? "Material returns" 
            : `${selectedZones.length > 0 ? selectedZones.map(z => z).join(', ') : 'All Zones'} returns`}
        />
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="approved" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approved">Approved Requests</TabsTrigger>
          <TabsTrigger value="shipments">Shipment Status</TabsTrigger>
          <TabsTrigger value="returns">Return Requests</TabsTrigger>
        </TabsList>
        


        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Material Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">Loading requests...</div>
                ) : approved.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No approved requests found</div>
                ) : approved.slice(0, 20).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setSelectedId(request.id); setEditorOpen(true); }}>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{request.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">By {request.requestedBy}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">ID:</span>
                          <span>
                            {request.seqId 
                              ? (request.requestType === 'MRC' ? `MRC-${request.seqId.toString().padStart(3, '0')}` : `MR-${request.seqId.toString().padStart(3, '0')}`)
                              : request.id.slice(-8)
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Items:</span>
                          <span>{request.items.reduce((s, i) => s + (i.quantity || 0), 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shipped Date</TableHead>
                    <TableHead>Tracking Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">Loading shipments...</TableCell>
                    </TableRow>
                  ) : shipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No shipments found</TableCell>
                    </TableRow>
                  ) : shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedId(shipment.id); setEditorOpen(true); }}>
                      <TableCell className="font-medium">
                        {shipment.seqId 
                          ? `MR-${shipment.seqId.toString().padStart(3, '0')}`
                          : shipment.id.slice(-8)
                        }
                      </TableCell>
                      <TableCell>{shipment.title}</TableCell>
                      <TableCell>{shipment.requestedBy}</TableCell>
                      <TableCell>{shipment.items.reduce((sum, i) => sum + (i.quantity || 0), 0)} items</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(getActualStatus(shipment))}>
                          {getActualStatus(shipment)}
                        </Badge>
                      </TableCell>
                      <TableCell>{shipment.sentAt ? format(new Date(shipment.sentAt), 'MMM dd, yyyy') : '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{shipment.trackingNo || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>Material Return Requests (MRC)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRC ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Return Items</TableHead>
                    <TableHead>Transport Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Zone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Loading return requests...</TableCell>
                    </TableRow>
                  ) : returnRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                        No return requests found. 
                      </TableCell>
                    </TableRow>
                  ) : returnRequests.map((returnRequest) => (
                    <TableRow 
                      key={returnRequest.id} 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => { 
                        setSelectedId(returnRequest.id); 
                        setEditorOpen(true); 
                      }}
                    >
                      <TableCell className="font-medium">
                        {returnRequest.seqId 
                          ? `MRC-${returnRequest.seqId.toString().padStart(3, '0')}`
                          : returnRequest.id.slice(-8)
                        }
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{returnRequest.title}</div>
                          {returnRequest.ticketNumber && (
                            <div className="text-sm text-muted-foreground">Ticket: {returnRequest.ticketNumber}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{returnRequest.requestedBy}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {returnRequest.items.reduce((sum, item) => {
                              // For MRC, use returnQty if available, otherwise quantity
                              const qty = (item as any).returnQty || item.quantity || 0;
                              return sum + qty;
                            }, 0)} items
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {returnRequest.items.length} different items
                          </div>
                          {(() => {
                            const itemsNeedingMCR = returnRequest.items.filter((item: any) => 
                              item.receivedAt && !item.mrcNo
                            );
                            if (itemsNeedingMCR.length > 0) {
                              const daysSinceReceived = Math.floor((Date.now() - new Date(itemsNeedingMCR[0].receivedAt).getTime()) / (1000 * 60 * 60 * 24));
                              if (daysSinceReceived >= 7) {
                                return <div className="text-xs text-red-600 font-medium mt-1">⚠️ MCR NO. overdue</div>;
                              } else if (daysSinceReceived >= 5) {
                                return <div className="text-xs text-orange-600 font-medium mt-1">⚠️ MCR NO. due in {7 - daysSinceReceived} days</div>;
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{returnRequest.transportMode || '—'}</div>
                          {returnRequest.trackingNo && (
                            <div className="text-sm text-muted-foreground font-mono">
                              {returnRequest.trackingNo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(returnRequest.status)}>
                          {returnRequest.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(returnRequest.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{returnRequest.zone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {selectedRequest && (
        selectedRequest.requestType === 'MRC' ? (
          <SMReturnViewer
            open={editorOpen}
            onOpenChange={(o) => { setEditorOpen(o); if (!o) setSelectedId(null); }}
            request={selectedRequest}
          />
        ) : (
          <SMRequestViewer
            open={editorOpen}
            onOpenChange={(o) => { setEditorOpen(o); if (!o) setSelectedId(null); }}
            request={selectedRequest}
          />
        )
      )}
    </div>
  );
};

export default StoreManagerDashboard;