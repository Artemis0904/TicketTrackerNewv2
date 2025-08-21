import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

// Types
export type SourceOption = 'Store' | 'CSD' | 'Site Purchase';
export type UrgencyOption = 'Low' | 'Medium' | 'High';
export type RequestStatus = 'pending' | 'approved' | 'in-process' | 'in-transit' | 'mrc-needed' | 'delivered' | 'rejected';

export interface MaterialItemRow {
  id: string; // unique per row
  description: string;
  quantity: number;
  source: SourceOption;
  urgency: UrgencyOption;
  approvedQty?: number;
  // Store Manager editable fields
  sentQty?: number;
  mrfNo?: string;
  mifNo?: string;
  remarks?: string;
  // Returns/MRC optional fields
  returnQty?: number;
  receivedQty?: number;
  receivedAt?: string; // ISO timestamp when received was checked
  mrcNo?: string;
  mrcEntered?: boolean; // track if MCR was entered
  transportModeRow?: 'Train' | 'Bus' | 'Courier';
}

export interface MaterialRequest {
  id: string;
  seqId?: number;
  title: string;
  items: MaterialItemRow[];
  requestedBy: string; // username
  requesterEmail?: string; // email of requester
  requesterId?: string; // auth user id
  createdAt: string; // ISO date
  status: RequestStatus;
  requestType?: 'MR' | 'MRC'; // Add request type field
  // Optional metadata
  ticketNumber?: string;
  zone?: string;
  description?: string;
  // Shipment metadata
  transportMode?: 'Train' | 'Bus' | 'Courier';
  edt?: string; // ISO date for estimated delivery time/date
  trackingNo?: string;
  sentAt?: string; // ISO datetime when marked as sent
}

interface AppState {
  materialRequests: MaterialRequest[];
  currentUser: string | null;
}

// Actions
 type Action =
  | { type: 'INIT_FROM_STORAGE'; payload: AppState }
  | { type: 'SET_CURRENT_USER'; payload: string | null }
  | { type: 'ADD_REQUEST'; payload: { title: string; items: MaterialItemRow[]; ticketNumber?: string; zone?: string; description?: string; initialStatus?: RequestStatus; requesterEmail?: string; requesterId?: string; transportMode?: 'Train' | 'Bus' | 'Courier'; edt?: string; trackingNo?: string; requestType?: 'MR' | 'MRC' } }
  | { type: 'APPROVE_REQUEST'; payload: { id: string } }
  | { type: 'REJECT_REQUEST'; payload: { id: string } }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: RequestStatus } }
  | { type: 'UPDATE_REQUEST'; payload: { id: string; patch: Partial<Pick<MaterialRequest, 'items' | 'ticketNumber' | 'zone' | 'description' | 'title' | 'transportMode' | 'edt' | 'trackingNo' | 'sentAt'>> } };
const initialState: AppState = {
  materialRequests: [],
  currentUser: null,
};

// Removed uid function - now using SERIAL auto-increment from database

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT_FROM_STORAGE':
      return { ...state, ...action.payload };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_REQUEST': {
      const username = state.currentUser || localStorage.getItem('currentUser') || 'Engineer';
      const { title, items, ticketNumber, zone, description, initialStatus, requesterEmail, requesterId, transportMode, edt, trackingNo, requestType } = action.payload;
      const newReq: MaterialRequest = {
        id: 0, // Will be set by database SERIAL
        title,
        items,
        requestedBy: username,
        requesterEmail,
        requesterId,
        createdAt: new Date().toISOString(),
        status: initialStatus ?? 'pending',
        requestType: requestType || 'MR', // Include request type
        ticketNumber,
        zone,
        description,
        transportMode,
        edt,
        trackingNo,
      };
      return { ...state, materialRequests: [newReq, ...state.materialRequests] };
    }
    case 'APPROVE_REQUEST': {
      return {
        ...state,
        materialRequests: state.materialRequests.map(r => r.id === action.payload.id ? { ...r, status: 'approved' } : r)
      };
    }
    case 'REJECT_REQUEST': {
      return {
        ...state,
        materialRequests: state.materialRequests.map(r => r.id === action.payload.id ? { ...r, status: 'rejected' } : r)
      };
    }
    case 'UPDATE_STATUS': {
      return {
        ...state,
        materialRequests: state.materialRequests.map(r => r.id === action.payload.id ? { ...r, status: action.payload.status } : r)
      };
    }
    case 'UPDATE_REQUEST': {
      return {
        ...state,
        materialRequests: state.materialRequests.map(r => r.id === action.payload.id ? { ...r, ...action.payload.patch } : r)
      };
    }
    default:
      return state;
  }
}

const STORAGE_KEY = 'appStore_v1';

const AppStoreContext = createContext<{
  state: AppState;
  addMaterialRequest: (
    title: string,
    items: MaterialItemRow[],
    extra?: {
      ticketNumber?: string;
      zone?: string;
      description?: string;
      initialStatus?: RequestStatus;
      requesterEmail?: string;
      requesterId?: string;
      transportMode?: 'Train' | 'Bus' | 'Courier';
      edt?: string;
      trackingNo?: string;
      requestType?: 'MR' | 'MRC';
    }
  ) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  updateStatus: (id: string, status: RequestStatus) => void;
  updateRequest: (id: string, patch: Partial<Pick<MaterialRequest, 'items' | 'ticketNumber' | 'zone' | 'description' | 'title' | 'transportMode' | 'edt' | 'trackingNo' | 'sentAt'>>) => void;
  setCurrentUser: (username: string | null) => void;
} | null>(null);
export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, department } = useAuth();
  const queryClient = useQueryClient();

  // Init from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const currentUser = localStorage.getItem('currentUser');
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        dispatch({ type: 'INIT_FROM_STORAGE', payload: { ...initialState, ...parsed, currentUser: currentUser || parsed.currentUser || null } });
      } else if (currentUser) {
        dispatch({ type: 'SET_CURRENT_USER', payload: currentUser });
      }
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    const { currentUser, materialRequests } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentUser, materialRequests }));
  }, [state.currentUser, state.materialRequests]);

  const addMaterialRequest = async (title: string, items: MaterialItemRow[], extra?: { ticketNumber?: string; zone?: string; description?: string; initialStatus?: RequestStatus; requesterEmail?: string; requesterId?: string; transportMode?: 'Train' | 'Bus' | 'Courier'; edt?: string; trackingNo?: string; requestType?: 'MR' | 'MRC' }) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('material_requests')
        .insert({
          title,
          request_type: extra?.requestType || 'MR',
          items: items as any,
          requested_by: state.currentUser || 'User',
          requester_email: user.email,
          requester_id: user.id,
          ticket_number: extra?.ticketNumber,
          zone: extra?.zone,
          description: extra?.description,
          status: extra?.requestType === 'MRC' ? 'in-transit' : (extra?.initialStatus || 'pending'),
          transport_mode: extra?.transportMode,
          edt: extra?.edt,
          tracking_no: extra?.trackingNo,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      const isRMCreated = department === 'regional_manager';
      const isMRC = extra?.requestType === 'MRC';
      const eventType = isMRC ? 'MRC_CREATED' : (isRMCreated ? 'MR_CREATED_BY_RM' : 'MR_CREATED_BY_ENGINEER');
      const targetDepartments = isMRC 
        ? ['store_manager' as const] // MRC auto-in-transit, only notify store manager
        : (isRMCreated ? ['store_manager' as const] : ['regional_manager' as const]);

      await notify({
        eventType,
        zone: extra?.zone,
        request: {
          id: data.id,
          title,
          ticketNumber: extra?.ticketNumber,
          zone: extra?.zone,
          description: extra?.description,
          status: isMRC ? 'in-transit' : (extra?.initialStatus || 'pending'),
          requestedBy: state.currentUser || 'User',
          requesterEmail: user.email,
        },
        targetDepartments,
      });

      // Update local state
      dispatch({ type: 'ADD_REQUEST', payload: { 
        title, 
        items, 
        ...(extra || {}),
        initialStatus: isMRC ? 'in-transit' : extra?.initialStatus
      } });
    } catch (error) {
      console.error('Error adding material request:', error);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      // Get request details for notification
      const { data: request } = await supabase
        .from('material_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (request) {
        await notify({
          eventType: 'MR_APPROVED',
          zone: request.zone,
          request: {
            id: request.id,
            title: request.title,
            ticketNumber: request.ticket_number,
            zone: request.zone,
            description: request.description,
            status: 'approved',
            requestedBy: request.requested_by,
            requesterEmail: request.requester_email,
          },
          targetDepartments: ['store_manager' as const],
          extraRecipients: request.requester_email ? [request.requester_email] : [],
        });
      }

      dispatch({ type: 'APPROVE_REQUEST', payload: { id } });
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const updateStatus = async (id: string, status: RequestStatus) => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status, ...(status === 'in-transit' ? { sent_at: new Date().toISOString() } : {}) })
        .eq('id', id);

      if (error) throw error;

      // Get request details for notification
      const { data: request } = await supabase
        .from('material_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (request) {
        // Send notification for status changes
        if (status === 'in-transit') {
          // Notify the original requester (engineer) and store managers
          await notify({
            eventType: 'MR_ITEMS_SENT',
            zone: request.zone,
            request: {
              id: request.id,
              title: request.title,
              ticketNumber: request.ticket_number,
              zone: request.zone,
              description: request.description,
              status: 'in-transit',
              requestedBy: request.requested_by,
              requesterEmail: request.requester_email,
            },
            targetDepartments: ['store_manager' as const],
            extraRecipients: request.requester_email ? [request.requester_email] : [],
          });
        } else if (status === 'delivered') {
          // Notify store managers when items are delivered/received
          await notify({
            eventType: 'MR_ITEMS_SENT', // Reuse this type for delivered status
            zone: request.zone,
            request: {
              id: request.id,
              title: request.title,
              ticketNumber: request.ticket_number,
              zone: request.zone,
              description: request.description,
              status: 'delivered',
              requestedBy: request.requested_by,
              requesterEmail: request.requester_email,
            },
            targetDepartments: ['store_manager' as const],
          });
        }
      }

      dispatch({ type: 'UPDATE_STATUS', payload: { id, status } });
      
      // Invalidate React Query cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateRequest = async (id: string, patch: Partial<Pick<MaterialRequest, 'items' | 'ticketNumber' | 'zone' | 'description' | 'title' | 'transportMode' | 'edt' | 'trackingNo' | 'sentAt'>>) => {
    try {
      // Update in Supabase
      const updateData: any = {};
      if (patch.items) updateData.items = patch.items;
      if (patch.ticketNumber) updateData.ticket_number = patch.ticketNumber;
      if (patch.zone) updateData.zone = patch.zone;
      if (patch.description) updateData.description = patch.description;
      if (patch.title) updateData.title = patch.title;
      if (patch.transportMode) updateData.transport_mode = patch.transportMode;
      if (patch.edt) updateData.edt = patch.edt;
      if (patch.trackingNo) updateData.tracking_no = patch.trackingNo;
      if (patch.sentAt) updateData.sent_at = patch.sentAt;

      const { error } = await supabase
        .from('material_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      dispatch({ type: 'UPDATE_REQUEST', payload: { id, patch } });
      
      // Invalidate React Query cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: 'REJECT_REQUEST', payload: { id } });
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const value = useMemo(() => ({
    state,
    setCurrentUser: (username: string | null) => dispatch({ type: 'SET_CURRENT_USER', payload: username }),
    addMaterialRequest,
    approveRequest,
    rejectRequest,
    updateStatus,
    updateRequest,
  }), [state, user, department]);
  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
};

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
