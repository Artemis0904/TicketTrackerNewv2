import React from 'react';
import RegionalManagerLayout from '@/components/RegionalManagerLayout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  ClipboardListIcon, 
  CheckCircleIcon, 
  ClockIcon,
  TruckIcon,
  PlusIcon,
  RotateCcwIcon,
  PackageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import MRFormDialogRM from '@/components/MRFormDialogRM';
import RMRequestEditor from '@/components/RMRequestEditor';
import ApprovedTicketViewer from '@/components/ApprovedTicketViewer';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

const RegionalManagerDashboard = () => {
  const { state } = useAppStore();
  const { requests, isLoading, deleteRequest } = useMaterialRequests();

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved' && r.requestType !== 'MRC').length,
    pending: requests.filter(r => r.status === 'pending').length,
    inTransit: requests.filter(r => r.status === 'in-transit').length,
    partiallyDelivered: requests.filter(r => r.status === 'delivered' && r.items.some(item => item.receivedAt) && r.items.some(item => !item.receivedAt)).length,
  };

  const approvedRequests = requests.filter(r => r.status === 'approved' && r.requestType !== 'MRC');
  const pendingRequests = requests.filter(r => r.status === 'pending' && r.requestType !== 'MRC');
  const otherRequests = requests.filter(r => r.status !== 'pending' && r.requestType !== 'MRC');
  const mrcRequests = requests.filter(r => r.requestType === 'MRC');

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [pendingPage, setPendingPage] = React.useState(1);
  const [otherPage, setOtherPage] = React.useState(1);
  const [mrcPage, setMrcPage] = React.useState(1);
  const selectedRequest = React.useMemo(() => requests.find(r => r.id === selectedId) || null, [selectedId, requests]);

  // Filter other requests based on selected status
  const filteredOtherRequests = React.useMemo(() => {
    if (statusFilter === 'all') {
      return otherRequests;
    }
    return otherRequests.filter(request => request.status === statusFilter);
  }, [otherRequests, statusFilter]);

  // Pagination constants
  const ITEMS_PER_PAGE = 10;

  // Pagination functions
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / ITEMS_PER_PAGE);
  };

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Paginated data
  const paginatedPendingRequests = getPaginatedData(pendingRequests, pendingPage);
  const paginatedFilteredOtherRequests = getPaginatedData(filteredOtherRequests, otherPage);
  const paginatedMrcRequests = getPaginatedData(mrcRequests, mrcPage);

  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers(currentPage, totalPages);
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const handleDeleteRequest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await deleteRequest(id);
        toast.success('Request deleted successfully');
      } catch (error) {
        toast.error('Failed to delete request');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'in-process': 'bg-indigo-100 text-indigo-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'partially-delivered': 'bg-yellow-100 text-yellow-800',
      'rejected': 'bg-red-100 text-red-800',
    };
    
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.replace('-', ' ')}</Badge>;
  };

  const getActualStatus = (request: any) => {
    if (request.status === 'delivered') {
      const receivedItems = request.items.filter((item: any) => item.receivedAt);
      const totalItems = request.items.length;
      
      if (receivedItems.length === 0) {
        return 'delivered';
      } else if (receivedItems.length < totalItems) {
        return 'partially-delivered';
      } else {
        return 'delivered';
      }
    }
    return request.status;
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      'low': 'secondary',
      'medium': 'outline',
      'high': 'default',
      'critical': 'destructive'
    } as const;
    
    return <Badge variant={variants[urgency as keyof typeof variants] || 'secondary'}>{urgency}</Badge>;
  };

  const COLORS = [
    'hsl(var(--primary))',     // In Process
    'hsl(220 100% 60%)',       // In Transit
    'hsl(142 76% 36%)',        // Delivered
    'hsl(45 100% 50%)'         // Partially Delivered
  ];

  return (
    <RegionalManagerLayout>
      <div className="space-y-6">
        {/* Header with MR Form Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Regional Manager Dashboard</h1>
            <p className="text-muted-foreground">Monitor material requests across all zones</p>
          </div>
          <MRFormDialogRM trigger={
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              MR Form
            </Button>
          } />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Requests"
            value={stats.total}
            icon={ClipboardListIcon}
            description="All zone requests"
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircleIcon}
            description="Ready for processing"
          />
          <StatsCard
            title="Pending Approval"
            value={stats.pending}
            icon={ClockIcon}
            description="Awaiting review"
          />
          <StatsCard
            title="In Transit"
            value={stats.inTransit}
            icon={TruckIcon}
            description="Currently shipping"
          />
          <StatsCard
            title="Partially Delivered"
            value={stats.partiallyDelivered}
            icon={PackageIcon}
            description="Items partially received"
          />
        </div>

        {/* Material Requests in Zone Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Material Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  Pending Requests ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="other" className="flex items-center gap-2">
                  <ClipboardListIcon className="h-4 w-4" />
                  Processed Requests ({otherRequests.length})
                </TabsTrigger>
                <TabsTrigger value="mrc" className="flex items-center gap-2">
                  <RotateCcwIcon className="h-4 w-4" />
                  MRC Requests ({mrcRequests.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : paginatedPendingRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">No pending requests found</TableCell>
                        </TableRow>
                      ) : (
                        paginatedPendingRequests.map((request) => (
                          <TableRow key={request.id} className="cursor-pointer" onClick={() => { setSelectedId(request.id); setEditorOpen(true); }}>
                            <TableCell className="font-medium">
                              {request.seqId 
                                ? (request.requestType === 'MRC' ? `MRC-${request.seqId.toString().padStart(3, '0')}` : `MR-${request.seqId.toString().padStart(3, '0')}`)
                                : request.id.slice(-8)
                              }
                            </TableCell>
                            <TableCell>{request.title}</TableCell>
                            <TableCell>{request.requestedBy}</TableCell>
                            <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(getActualStatus(request))}</TableCell>
                            <TableCell>{request.items.reduce((s, i) => s + (i.quantity || 0), 0)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteRequest(request.id, e)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <Pagination 
                    currentPage={pendingPage} 
                    totalPages={getTotalPages(pendingRequests)} 
                    onPageChange={setPendingPage} 
                    totalItems={pendingRequests.length} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="other" className="mt-6">
                <div className="mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filter by status:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Processed Requests</SelectItem>
                        <SelectItem value="approved">Approved Only</SelectItem>
                        <SelectItem value="in-transit">In-Transit Only</SelectItem>
                        <SelectItem value="delivered">Delivered Only</SelectItem>
                        <SelectItem value="partially-delivered">Partially Delivered Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedFilteredOtherRequests.length} of {filteredOtherRequests.length} requests
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : paginatedFilteredOtherRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            {statusFilter === 'all' ? 'No other requests found' : `No ${statusFilter} requests found`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedFilteredOtherRequests.map((request) => (
                          <TableRow key={request.id} className="cursor-pointer" onClick={() => { setSelectedId(request.id); setEditorOpen(true); }}>
                            <TableCell className="font-medium">
                              {request.seqId 
                                ? (request.requestType === 'MRC' ? `MRC-${request.seqId.toString().padStart(3, '0')}` : `MR-${request.seqId.toString().padStart(3, '0')}`)
                                : request.id.slice(-8)
                              }
                            </TableCell>
                            <TableCell>{request.title}</TableCell>
                            <TableCell>{request.requestedBy}</TableCell>
                            <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(getActualStatus(request))}</TableCell>
                            <TableCell>{request.items.reduce((s, i) => s + (i.quantity || 0), 0)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteRequest(request.id, e)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <Pagination 
                    currentPage={otherPage} 
                    totalPages={getTotalPages(filteredOtherRequests)} 
                    onPageChange={setOtherPage} 
                    totalItems={filteredOtherRequests.length} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="mrc" className="mt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : paginatedMrcRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">No MRC requests found</TableCell>
                        </TableRow>
                      ) : (
                        paginatedMrcRequests.map((request) => (
                          <TableRow key={request.id} className="cursor-pointer" onClick={() => { setSelectedId(request.id); setEditorOpen(true); }}>
                            <TableCell className="font-medium">
                              {request.seqId 
                                ? `MRC-${request.seqId.toString().padStart(3, '0')}`
                                : request.id.slice(-8)
                              }
                            </TableCell>
                            <TableCell>{request.title}</TableCell>
                            <TableCell>{request.requestedBy}</TableCell>
                            <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(getActualStatus(request))}</TableCell>
                            <TableCell>{request.items.reduce((s, i) => s + (i.quantity || 0), 0)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteRequest(request.id, e)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <Pagination 
                    currentPage={mrcPage} 
                    totalPages={getTotalPages(mrcRequests)} 
                    onPageChange={setMrcPage} 
                    totalItems={mrcRequests.length} 
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Approved Tickets Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                Approved Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvedRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedId(request.id);
                      setViewerOpen(true);
                    }}
                  >
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">By {request.requestedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{request.items.reduce((s, i) => s + (i.quantity || 0), 0)} items</p>
                      <p className="text-sm text-muted-foreground">{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approval Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedId(request.id);
                      setViewerOpen(true);
                    }}
                  >
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">By {request.requestedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{request.items.reduce((s, i) => s + (i.quantity || 0), 0)} items</p>
                      <p className="text-sm text-muted-foreground">{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipment Process Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Process Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                    data={[
                      { status: 'in-process', count: requests.filter(r => r.status === 'in-process').length },
                      { status: 'in-transit', count: requests.filter(r => r.status === 'in-transit').length },
                      { status: 'delivered', count: requests.filter(r => r.status === 'delivered' && !r.items.some(item => item.receivedAt)).length },
                      { status: 'partially-delivered', count: requests.filter(r => r.status === 'delivered' && r.items.some(item => item.receivedAt) && r.items.some(item => !item.receivedAt)).length },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, value }) => `${status}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {['in-process','in-transit','delivered','partially-delivered'].map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {selectedRequest && (
        <>
          <RMRequestEditor
            open={editorOpen}
            onOpenChange={(o) => { setEditorOpen(o); if (!o) setSelectedId(null); }}
            request={selectedRequest}
          />
          <ApprovedTicketViewer
            open={viewerOpen}
            onOpenChange={(o) => { setViewerOpen(o); if (!o) setSelectedId(null); }}
            request={selectedRequest}
          />
        </>
      )}
    </RegionalManagerLayout>
  );
};

export default RegionalManagerDashboard;