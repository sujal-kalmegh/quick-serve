/**
 * QuickServe Database Schema & Type Definitions
 * Matches PostgreSQL Enums, Tables, and Relations
 */

export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type RequestStatus = 
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type AuditAction = 
  | 'LOGIN_SUCCESS'
  | 'REQUEST_CREATED'
  | 'REQUEST_ASSIGNED'
  | 'REQUEST_UPDATED'
  | 'AUTHORIZATION_FAILED'
  | 'DATABASE_ERROR';

export interface Profile {
  id: string; // UUID references auth.users.id
  auth_user_id: string; // UUID
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string; // UUID
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceRequest {
  id: string; // UUID
  request_number: string; // e.g. REQ-2026-000123
  customer_id: string; // UUID -> profiles(id)
  agent_id: string | null; // UUID -> profiles(id)
  service_id: string; // UUID -> services(id)
  description: string;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // e.g. "09:00 - 11:00"
  address: string;
  priority: RequestPriority;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Joined relation fields for UI convenience
  customer?: Profile;
  agent?: Profile | null;
  service?: Service;
}

export interface RequestStatusHistory {
  id: string; // UUID
  request_id: string; // UUID -> service_requests(id)
  old_status: RequestStatus | null;
  new_status: RequestStatus;
  changed_by: string; // UUID -> profiles(id)
  note: string | null;
  created_at: string;
  // Joined relation
  author?: Profile;
}

export interface AuditLog {
  id: string; // UUID
  actor_id: string | null; // UUID -> profiles(id)
  action: AuditAction;
  entity_type: string; // e.g. "service_requests", "profiles"
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined relation
  actor?: Profile | null;
}
