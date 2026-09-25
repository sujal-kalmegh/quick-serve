import 'package:flutter_test/flutter_test.dart';
import 'package:quickserve_mobile/models/models.dart';

void main() {
  group('Phase 5 Customer Flow - Model & Business Rule Unit Tests', () {
    test('1. ServiceItem JSON parsing correctly instantiates model', () {
      final json = {
        'id': 's1-uuid-123',
        'name': 'AC Servicing',
        'description': 'Filter cleaning and refrigerant top-up',
        'icon': 'wind',
        'is_active': true,
      };

      final service = ServiceItem.fromJson(json);

      expect(service.id, 's1-uuid-123');
      expect(service.name, 'AC Servicing');
      expect(service.description, 'Filter cleaning and refrigerant top-up');
      expect(service.icon, 'wind');
      expect(service.isActive, isTrue);
    });

    test('2. ServiceRequestItem JSON parsing and relations resolution', () {
      final json = {
        'id': 'req-999',
        'request_number': 'REQ-2026-000123',
        'customer_id': 'c-111-uuid',
        'agent_id': null,
        'service_id': 's-111-uuid',
        'description': 'Master bedroom AC unit leaking water',
        'preferred_date': '2026-10-15',
        'preferred_time': '09:00 - 11:00',
        'address': '742 Evergreen Terrace',
        'priority': 'HIGH',
        'status': 'CREATED',
        'created_at': '2026-09-24T12:00:00Z',
        'services': {'name': 'AC Servicing'},
      };

      final request = ServiceRequestItem.fromJson(json);

      expect(request.id, 'req-999');
      expect(request.requestNumber, 'REQ-2026-000123');
      expect(request.customerId, 'c-111-uuid');
      expect(request.agentId, isNull);
      expect(request.priority, RequestPriority.high);
      expect(request.status, RequestStatus.created);
      expect(request.serviceName, 'AC Servicing');
      expect(request.canCancel, isTrue);
    });

    test('3. Priority selection and database mapping', () {
      expect(RequestPriority.low.toDbString(), 'LOW');
      expect(RequestPriority.medium.toDbString(), 'MEDIUM');
      expect(RequestPriority.high.toDbString(), 'HIGH');

      expect(RequestPriorityExt.fromDbString('LOW'), RequestPriority.low);
      expect(RequestPriorityExt.fromDbString('MEDIUM'), RequestPriority.medium);
      expect(RequestPriorityExt.fromDbString('HIGH'), RequestPriority.high);
      expect(RequestPriorityExt.fromDbString(null), RequestPriority.medium);
    });

    test('4. Status representation & display formatting', () {
      expect(RequestStatus.created.display, 'CREATED');
      expect(RequestStatus.assigned.display, 'ASSIGNED');
      expect(RequestStatus.accepted.display, 'ACCEPTED');
      expect(RequestStatus.inProgress.display, 'IN PROGRESS');
      expect(RequestStatus.completed.display, 'COMPLETED');
      expect(RequestStatus.cancelled.display, 'CANCELLED');
    });

    test('5. Customer cancellation eligibility business rule enforcement', () {
      // Rule: Customer can cancel ONLY when request is CREATED or ASSIGNED
      final createdReq = ServiceRequestItem(
        id: '1',
        requestNumber: 'REQ-1',
        customerId: 'c1',
        serviceId: 's1',
        description: 'Test',
        preferredDate: '2026-10-01',
        preferredTime: '10:00 - 12:00',
        address: '123 Main St',
        priority: RequestPriority.medium,
        status: RequestStatus.created,
        createdAt: DateTime.now(),
      );
      expect(createdReq.canCancel, isTrue, reason: 'CREATED status must be cancellable');

      final assignedReq = ServiceRequestItem(
        id: '2',
        requestNumber: 'REQ-2',
        customerId: 'c1',
        agentId: 'a1',
        serviceId: 's1',
        description: 'Test',
        preferredDate: '2026-10-01',
        preferredTime: '10:00 - 12:00',
        address: '123 Main St',
        priority: RequestPriority.medium,
        status: RequestStatus.assigned,
        createdAt: DateTime.now(),
      );
      expect(assignedReq.canCancel, isTrue, reason: 'ASSIGNED status must be cancellable');

      final inProgressReq = ServiceRequestItem(
        id: '3',
        requestNumber: 'REQ-3',
        customerId: 'c1',
        agentId: 'a1',
        serviceId: 's1',
        description: 'Test',
        preferredDate: '2026-10-01',
        preferredTime: '10:00 - 12:00',
        address: '123 Main St',
        priority: RequestPriority.medium,
        status: RequestStatus.inProgress,
        createdAt: DateTime.now(),
      );
      expect(inProgressReq.canCancel, isFalse, reason: 'IN_PROGRESS status cannot be cancelled');

      final completedReq = ServiceRequestItem(
        id: '4',
        requestNumber: 'REQ-4',
        customerId: 'c1',
        agentId: 'a1',
        serviceId: 's1',
        description: 'Test',
        preferredDate: '2026-10-01',
        preferredTime: '10:00 - 12:00',
        address: '123 Main St',
        priority: RequestPriority.medium,
        status: RequestStatus.completed,
        createdAt: DateTime.now(),
      );
      expect(completedReq.canCancel, isFalse, reason: 'COMPLETED status cannot be cancelled');
    });

    test('6. UserProfile correctly parses Customer role', () {
      final json = {
        'id': 'prof-1',
        'auth_user_id': 'auth-1',
        'full_name': 'Alice Customer',
        'email': 'customer@quickserve.dev',
        'phone': '+1 555-0101',
        'role': 'CUSTOMER',
      };

      final profile = UserProfile.fromJson(json);

      expect(profile.id, 'prof-1');
      expect(profile.fullName, 'Alice Customer');
      expect(profile.role, UserRole.customer);
    });

    test('7. RequestStatusHistoryItem parses chronological audit records', () {
      final json = {
        'id': 'h-1',
        'request_id': 'req-999',
        'old_status': 'CREATED',
        'new_status': 'ASSIGNED',
        'changed_by': 'admin-uuid',
        'note': 'Assigned to Agent Bob',
        'created_at': '2026-09-24T14:30:00Z',
        'profiles': {'full_name': 'Dispatcher Admin'},
      };

      final historyItem = RequestStatusHistoryItem.fromJson(json);

      expect(historyItem.requestId, 'req-999');
      expect(historyItem.oldStatus, RequestStatus.created);
      expect(historyItem.newStatus, RequestStatus.assigned);
      expect(historyItem.note, 'Assigned to Agent Bob');
      expect(historyItem.changedByName, 'Dispatcher Admin');
    });
  });
}
