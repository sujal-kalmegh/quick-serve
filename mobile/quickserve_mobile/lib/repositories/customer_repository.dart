import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class CustomerRepository {
  final SupabaseClient _client;

  CustomerRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  /// Retrieve active service offerings from the services table
  Future<List<ServiceItem>> fetchActiveServices() async {
    try {
      final response = await _client
          .from('services')
          .select()
          .eq('is_active', true)
          .order('name', ascending: true);

      final list = (response as List)
          .map((json) => ServiceItem.fromJson(json as Map<String, dynamic>))
          .toList();
      return list;
    } on PostgrestException catch (e) {
      throw Exception('Unable to load services: ${e.message}');
    } catch (e) {
      throw Exception('Unable to load services. Please check your connection.');
    }
  }

  /// Create a new service request.
  /// Critical Security Rule: customer_id is strictly derived from the
  /// authenticated user session, NEVER accepted from UI input.
  Future<ServiceRequestItem> createServiceRequest({
    required String serviceId,
    required String description,
    required String preferredDate,
    required String preferredTime,
    required String address,
    required RequestPriority priority,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw Exception('Your session has expired. Please log in again.');
    }

    try {
      final payload = {
        'customer_id': user.id, // Authenticated identity strictly enforced
        'service_id': serviceId,
        'description': description.trim(),
        'preferred_date': preferredDate,
        'preferred_time': preferredTime.trim(),
        'address': address.trim(),
        'priority': priority.toDbString(),
        'status': 'CREATED', // Initial state
        'agent_id': null, // No agent pre-assignment
      };

      final response = await _client
          .from('service_requests')
          .insert(payload)
          .select('*, services(name)')
          .single();

      return ServiceRequestItem.fromJson(response);
    } on PostgrestException catch (e) {
      throw Exception('Failed to create request: ${e.message}');
    } catch (e) {
      throw Exception('Something went wrong while creating your request.');
    }
  }

  /// Retrieve the authenticated customer's requests.
  /// RLS authoritatively isolates customer records at the database level.
  Future<List<ServiceRequestItem>> fetchMyRequests() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw Exception('Your session has expired. Please log in again.');
    }

    try {
      final response = await _client
          .from('service_requests')
          .select('*, services(name)')
          .order('created_at', ascending: false);

      final list = (response as List)
          .map((json) => ServiceRequestItem.fromJson(json as Map<String, dynamic>))
          .toList();
      return list;
    } on PostgrestException catch (e) {
      throw Exception('Unable to load your requests: ${e.message}');
    } catch (e) {
      throw Exception('Unable to load your requests. Please try again.');
    }
  }

  /// Retrieve full details and status history timeline for a request
  Future<Map<String, dynamic>> fetchRequestDetails(String requestId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw Exception('Your session has expired. Please log in again.');
    }

    try {
      // 1. Fetch request record
      final requestData = await _client
          .from('service_requests')
          .select('*, services(name)')
          .eq('id', requestId)
          .single();

      final request = ServiceRequestItem.fromJson(requestData);

      // 2. Fetch immutable status history
      final historyData = await _client
          .from('request_status_history')
          .select('*, profiles(full_name)')
          .eq('request_id', requestId)
          .order('created_at', ascending: true);

      final history = (historyData as List)
          .map((json) => RequestStatusHistoryItem.fromJson(json as Map<String, dynamic>))
          .toList();

      return {
        'request': request,
        'history': history,
      };
    } on PostgrestException catch (e) {
      throw Exception('Unable to load request details: ${e.message}');
    } catch (e) {
      throw Exception('Unable to load request details. Please try again.');
    }
  }

  /// Cancel an eligible request (must be CREATED or ASSIGNED)
  Future<void> cancelRequest(String requestId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw Exception('Your session has expired. Please log in again.');
    }

    try {
      // Update status to CANCELLED (RLS policy allows update where customer_id = auth.uid() AND status = 'CANCELLED')
      await _client
          .from('service_requests')
          .update({'status': 'CANCELLED'})
          .eq('id', requestId)
          .eq('customer_id', user.id);
    } on PostgrestException catch (e) {
      throw Exception('Failed to cancel request: ${e.message}');
    } catch (e) {
      throw Exception('Unable to cancel request. Please try again.');
    }
  }
}
