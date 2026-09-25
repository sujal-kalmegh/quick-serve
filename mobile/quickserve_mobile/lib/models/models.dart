/// Dart models representing QuickServe database entities

enum UserRole { customer, agent, admin }

enum RequestPriority { low, medium, high }

enum RequestStatus {
  created,
  assigned,
  accepted,
  inProgress,
  completed,
  cancelled,
}

extension RequestPriorityExt on RequestPriority {
  String toDbString() {
    switch (this) {
      case RequestPriority.low:
        return 'LOW';
      case RequestPriority.medium:
        return 'MEDIUM';
      case RequestPriority.high:
        return 'HIGH';
    }
  }

  static RequestPriority fromDbString(String? val) {
    if (val == null) return RequestPriority.medium;
    switch (val.toUpperCase()) {
      case 'LOW':
        return RequestPriority.low;
      case 'HIGH':
        return RequestPriority.high;
      case 'MEDIUM':
      default:
        return RequestPriority.medium;
    }
  }

  String get display => name.toUpperCase();
}

extension RequestStatusExt on RequestStatus {
  String toDbString() {
    switch (this) {
      case RequestStatus.created:
        return 'CREATED';
      case RequestStatus.assigned:
        return 'ASSIGNED';
      case RequestStatus.accepted:
        return 'ACCEPTED';
      case RequestStatus.inProgress:
        return 'IN_PROGRESS';
      case RequestStatus.completed:
        return 'COMPLETED';
      case RequestStatus.cancelled:
        return 'CANCELLED';
    }
  }

  static RequestStatus fromDbString(String? val) {
    if (val == null) return RequestStatus.created;
    switch (val.toUpperCase()) {
      case 'ASSIGNED':
        return RequestStatus.assigned;
      case 'ACCEPTED':
        return RequestStatus.accepted;
      case 'IN_PROGRESS':
        return RequestStatus.inProgress;
      case 'COMPLETED':
        return RequestStatus.completed;
      case 'CANCELLED':
        return RequestStatus.cancelled;
      case 'CREATED':
      default:
        return RequestStatus.created;
    }
  }

  String get display {
    switch (this) {
      case RequestStatus.created:
        return 'CREATED';
      case RequestStatus.assigned:
        return 'ASSIGNED';
      case RequestStatus.accepted:
        return 'ACCEPTED';
      case RequestStatus.inProgress:
        return 'IN PROGRESS';
      case RequestStatus.completed:
        return 'COMPLETED';
      case RequestStatus.cancelled:
        return 'CANCELLED';
    }
  }
}

class UserProfile {
  final String id;
  final String authUserId;
  final String fullName;
  final String email;
  final String? phone;
  final UserRole role;

  UserProfile({
    required this.id,
    required this.authUserId,
    required this.fullName,
    required this.email,
    this.phone,
    required this.role,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final roleStr = (json['role'] as String?)?.toUpperCase() ?? 'CUSTOMER';
    return UserProfile(
      id: json['id'] as String,
      authUserId: (json['auth_user_id'] as String?) ?? (json['id'] as String),
      fullName: (json['full_name'] as String?) ?? 'User',
      email: (json['email'] as String?) ?? '',
      phone: json['phone'] as String?,
      role: roleStr == 'ADMIN'
          ? UserRole.admin
          : roleStr == 'AGENT'
              ? UserRole.agent
              : UserRole.customer,
    );
  }
}

class ServiceItem {
  final String id;
  final String name;
  final String description;
  final String icon;
  final bool isActive;

  ServiceItem({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.isActive,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['id'] as String,
      name: json['name'] as String,
      description: (json['description'] as String?) ?? '',
      icon: (json['icon'] as String?) ?? 'wrench',
      isActive: (json['is_active'] as bool?) ?? true,
    );
  }
}

class ServiceRequestItem {
  final String id;
  final String requestNumber;
  final String customerId;
  final String? agentId;
  final String serviceId;
  final String description;
  final String preferredDate;
  final String preferredTime;
  final String address;
  final RequestPriority priority;
  final RequestStatus status;
  final DateTime createdAt;
  final String? serviceName;
  final String? agentName;

  ServiceRequestItem({
    required this.id,
    required this.requestNumber,
    required this.customerId,
    this.agentId,
    required this.serviceId,
    required this.description,
    required this.preferredDate,
    required this.preferredTime,
    required this.address,
    required this.priority,
    required this.status,
    required this.createdAt,
    this.serviceName,
    this.agentName,
  });

  /// Business Rule: Customer can cancel only when status is CREATED or ASSIGNED
  bool get canCancel =>
      status == RequestStatus.created || status == RequestStatus.assigned;

  factory ServiceRequestItem.fromJson(Map<String, dynamic> json) {
    // Extract service name from joined relation if present
    String? sName;
    if (json['services'] != null && json['services'] is Map) {
      sName = json['services']['name'] as String?;
    } else if (json['service_name'] != null) {
      sName = json['service_name'] as String?;
    }

    // Extract agent name from joined relation if present
    String? aName;
    if (json['agent'] != null && json['agent'] is Map) {
      aName = json['agent']['full_name'] as String?;
    }

    return ServiceRequestItem(
      id: json['id'] as String,
      requestNumber: (json['request_number'] as String?) ?? 'REQ-PENDING',
      customerId: json['customer_id'] as String,
      agentId: json['agent_id'] as String?,
      serviceId: json['service_id'] as String,
      description: (json['description'] as String?) ?? '',
      preferredDate: (json['preferred_date'] as String?) ?? '',
      preferredTime: (json['preferred_time'] as String?) ?? '',
      address: (json['address'] as String?) ?? '',
      priority: RequestPriorityExt.fromDbString(json['priority'] as String?),
      status: RequestStatusExt.fromDbString(json['status'] as String?),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      serviceName: sName,
      agentName: aName,
    );
  }
}

class RequestStatusHistoryItem {
  final String id;
  final String requestId;
  final RequestStatus? oldStatus;
  final RequestStatus newStatus;
  final String changedBy;
  final String? changedByName;
  final String? note;
  final DateTime createdAt;

  RequestStatusHistoryItem({
    required this.id,
    required this.requestId,
    this.oldStatus,
    required this.newStatus,
    required this.changedBy,
    this.changedByName,
    this.note,
    required this.createdAt,
  });

  factory RequestStatusHistoryItem.fromJson(Map<String, dynamic> json) {
    String? author;
    if (json['profiles'] != null && json['profiles'] is Map) {
      author = json['profiles']['full_name'] as String?;
    }

    return RequestStatusHistoryItem(
      id: json['id'] as String,
      requestId: json['request_id'] as String,
      oldStatus: json['old_status'] != null
          ? RequestStatusExt.fromDbString(json['old_status'] as String?)
          : null,
      newStatus: RequestStatusExt.fromDbString(json['new_status'] as String?),
      changedBy: (json['changed_by'] as String?) ?? '',
      changedByName: author,
      note: json['note'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }
}
