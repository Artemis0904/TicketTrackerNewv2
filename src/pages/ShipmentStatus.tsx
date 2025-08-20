import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeftIcon, TruckIcon, PackageIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { mockShipments } from '@/data/storeManagerData';
import { format } from 'date-fns';

const ShipmentStatus = () => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in-transit': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing': return PackageIcon;
      case 'shipped': 
      case 'in-transit': return TruckIcon;
      case 'delivered': return PackageIcon;
      case 'delayed': return TruckIcon;
      default: return PackageIcon;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/store-manager/dashboard')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipment Status</h1>
          <p className="text-muted-foreground">
            Track all materials that have been shipped and their current status.
          </p>
        </div>
      </div>

      {/* Shipment Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            All Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shipped Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Tracking Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockShipments.map((shipment) => {
                const StatusIcon = getStatusIcon(shipment.status);
                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PackageIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{shipment.materialName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{shipment.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{shipment.destination}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(shipment.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {shipment.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{format(shipment.shippedDate, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{format(shipment.expectedDelivery, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{shipment.trackingNumber}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShipmentStatus;