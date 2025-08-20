import { useNavigate } from 'react-router-dom';
import EngineerLayout from '@/components/EngineerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, Clock, Truck, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useAuth } from '@/hooks/useAuth';

const Returns = () => {
  const navigate = useNavigate();
  const { requests, isLoading } = useMaterialRequests();
  const { user } = useAuth();

  // Filter for MRC requests only for current user
  const myMRCRequests = requests.filter(r => r.requesterId === user?.id && r.requestType === 'MRC');

  const getStatusBadge = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'in-process': 'bg-purple-100 text-purple-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in-transit':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-process':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Calculate summary statistics
  const pendingCount = myMRCRequests.filter(item => item.status === 'pending').length;
  const inTransitCount = myMRCRequests.filter(item => item.status === 'in-transit').length;
  const deliveredCount = myMRCRequests.filter(item => item.status === 'delivered').length;
  const totalItems = myMRCRequests.reduce((sum, request) => {
    return sum + request.items.reduce((itemSum, item) => {
      const qty = (item as any).returnQty || item.quantity || 0;
      return itemSum + qty;
    }, 0);
  }, 0);

  return (
    <EngineerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/engineer-dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Material Returns (MRC)</h1>
            <p className="text-muted-foreground">Track the status of your material return requests</p>
          </div>
        </div>

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              My Material Return Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRC ID</TableHead>
                  <TableHead>Title</TableHead>
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
                    <TableCell colSpan={7} className="text-center py-4">Loading return requests...</TableCell>
                  </TableRow>
                ) : myMRCRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No material return requests found
                    </TableCell>
                  </TableRow>
                ) : myMRCRequests.map((returnRequest) => (
                  <TableRow key={returnRequest.id}>
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
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {returnRequest.items.reduce((sum, item) => {
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
                      <div className="flex items-center gap-2">
                        {getStatusIcon(returnRequest.status)}
                        {getStatusBadge(returnRequest.status)}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(returnRequest.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{returnRequest.zone || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">{inTransitCount}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold">{deliveredCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </EngineerLayout>
  );
};

export default Returns;