import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../repositories/customer_repository.dart';
import 'request_details_screen.dart';

class CreateRequestScreen extends StatefulWidget {
  final ServiceItem? initialService;

  const CreateRequestScreen({
    super.key,
    this.initialService,
  });

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customerRepo = CustomerRepository();

  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();

  List<ServiceItem> _services = [];
  ServiceItem? _selectedService;
  RequestPriority _selectedPriority = RequestPriority.medium;

  bool _isLoadingServices = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  final List<String> _timeSlots = [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '14:00 - 16:00',
    '16:00 - 18:00',
  ];

  @override
  void initState() {
    super.initState();
    _selectedService = widget.initialService;
    _dateController.text = DateFormat('yyyy-MM-dd').format(
      DateTime.now().add(const Duration(days: 1)),
    );
    _timeController.text = _timeSlots.first;
    _loadServices();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _addressController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  Future<void> _loadServices() async {
    try {
      final items = await _customerRepo.fetchActiveServices();
      if (!mounted) return;
      setState(() {
        _services = items;
        if (_selectedService != null) {
          // Match selected service with list from database
          _selectedService = _services.firstWhere(
            (s) => s.id == _selectedService!.id,
            orElse: () => _services.first,
          );
        } else if (_services.isNotEmpty) {
          _selectedService = _services.first;
        }
        _isLoadingServices = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingServices = false;
        _errorMessage = 'Failed to load services. Please check your connection.';
      });
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );

    if (picked != null) {
      setState(() {
        _dateController.text = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedService == null) {
      setState(() {
        _errorMessage = 'Please select a service.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final created = await _customerRepo.createServiceRequest(
        serviceId: _selectedService!.id,
        description: _descriptionController.text.trim(),
        preferredDate: _dateController.text.trim(),
        preferredTime: _timeController.text.trim(),
        address: _addressController.text.trim(),
        priority: _selectedPriority,
      );

      if (!mounted) return;

      // Show success feedback with generated request number
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Request Created'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Your service request has been successfully registered.'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Tracking #: ${created.requestNumber}',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => RequestDetailsScreen(requestId: created.id),
                  ),
                );
              },
              child: const Text('View Request Details'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Book a Service'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoadingServices
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          border: Border.all(color: Colors.red.shade200),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                        ),
                      ),

                    // Service Selection Dropdown
                    const Text(
                      'Service Offering *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<ServiceItem>(
                      value: _selectedService,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      items: _services.map((s) {
                        return DropdownMenuItem<ServiceItem>(
                          value: s,
                          child: Text(s.name),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedService = val;
                        });
                      },
                      validator: (val) {
                        if (val == null) return 'Please choose a service';
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),

                    // Priority Selector
                    const Text(
                      'Priority *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _buildPriorityChip(RequestPriority.low, 'Low'),
                        const SizedBox(width: 8),
                        _buildPriorityChip(RequestPriority.medium, 'Medium'),
                        const SizedBox(width: 8),
                        _buildPriorityChip(RequestPriority.high, 'High'),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Preferred Date & Time
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Preferred Date *',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _dateController,
                                readOnly: true,
                                onTap: _pickDate,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  suffixIcon: Icon(Icons.calendar_today, size: 18),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                validator: (val) {
                                  if (val == null || val.isEmpty) return 'Date required';
                                  return null;
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Time Window *',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                value: _timeController.text,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                items: _timeSlots.map((slot) {
                                  return DropdownMenuItem<String>(
                                    value: slot,
                                    child: Text(slot, style: const TextStyle(fontSize: 13)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      _timeController.text = val;
                                    });
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Address
                    const Text(
                      'Service Address *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _addressController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        hintText: 'e.g. 101 Maple Street, Apartment 4B',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.all(12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Address is required';
                        }
                        if (val.trim().length < 5) {
                          return 'Address must be at least 5 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),

                    // Problem Description
                    const Text(
                      'Problem Description *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Describe the issue or maintenance required in detail...',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.all(12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Description is required';
                        }
                        if (val.trim().length < 10) {
                          return 'Description must be at least 10 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 28),

                    // Submit Request Button
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitRequest,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E3A8A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Submit Service Request',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPriorityChip(RequestPriority priority, String label) {
    final isSelected = _selectedPriority == priority;
    return Expanded(
      child: ChoiceChip(
        label: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? Colors.white : Colors.black87,
            ),
          ),
        ),
        selected: isSelected,
        selectedColor: priority == RequestPriority.high
            ? Colors.red.shade700
            : priority == RequestPriority.medium
                ? const Color(0xFF1E3A8A)
                : Colors.blue.shade600,
        onSelected: (val) {
          if (val) {
            setState(() {
              _selectedPriority = priority;
            });
          }
        },
      ),
    );
  }
}
