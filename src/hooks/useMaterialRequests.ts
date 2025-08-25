import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MaterialRequest } from '@/store/appStore';
import { useAuth } from './useAuth';

export function useMaterialRequests() {
  const { user, department } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['material-requests'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item): MaterialRequest => ({
          id: item.id,
          seqId: item.seq_id || undefined,
          title: item.title,
          items: (item.items as any) || [],
          requestedBy: item.requested_by,
          requesterEmail: item.requester_email || undefined,
          requesterId: item.requester_id || undefined,
          createdAt: item.created_at,
          status: item.status as any,
          requestType: (item.request_type as 'MR' | 'MRC') || 'MR', // Map request_type field
          ticketNumber: item.ticket_number || undefined,
          zone: item.zone || undefined,
          description: item.description || undefined,
          approvedAt: item.approved_at || undefined,
          transportMode: (item.transport_mode as any) || undefined,
          courierName: item.courier_name || undefined,
          edt: item.edt || undefined,
          trackingNo: item.tracking_no || undefined,
          sentAt: item.sent_at || undefined,
          receivedAt: item.received_at || undefined,
        }));
    },
    enabled: !!user,
  });

  const deleteRequest = async (id: string) => {
    if (department !== 'regional_manager') {
      throw new Error('Only regional managers can delete requests');
    }

    const { error } = await supabase
      .from('material_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['material-requests'] });
  };

  const updateRequest = async (id: string, updates: Partial<MaterialRequest>) => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Map MaterialRequest fields to database fields
    if (updates.items !== undefined) updateData.items = updates.items;
    if (updates.ticketNumber !== undefined) updateData.ticket_number = updates.ticketNumber;
    if (updates.zone !== undefined) updateData.zone = updates.zone;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.transportMode !== undefined) updateData.transport_mode = updates.transportMode;
    if (updates.courierName !== undefined) updateData.courier_name = updates.courierName;
    if (updates.edt !== undefined) updateData.edt = updates.edt;
    if (updates.trackingNo !== undefined) updateData.tracking_no = updates.trackingNo;
    if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt;
    if (updates.receivedAt !== undefined) updateData.received_at = updates.receivedAt;

    const { error } = await supabase
      .from('material_requests')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['material-requests'] });
  };

  return {
    requests,
    isLoading,
    error,
    deleteRequest,
    updateRequest,
    refreshRequests: () => queryClient.invalidateQueries({ queryKey: ['material-requests'] }),
  };
}