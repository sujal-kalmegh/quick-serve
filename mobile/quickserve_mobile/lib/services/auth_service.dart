import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class MobileAuthService {
  final SupabaseClient _client = Supabase.instance.client;

  /// User Registration with default CUSTOMER role
  Future<UserProfile> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final response = await _client.auth.signUp(
      email: email,
      password: password,
      data: {
        'full_name': fullName,
        'phone': phone,
        'role': 'CUSTOMER', // Client-side enforcement; DB trigger also enforces
      },
    );

    if (response.user == null) {
      throw Exception('Registration failed: no user returned.');
    }

    // Query synced profile from public.profiles
    final profileData = await _client
        .from('profiles')
        .select()
        .eq('auth_user_id', response.user!.id)
        .single();

    return UserProfile.fromJson(profileData);
  }

  /// User Login
  Future<UserProfile> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('Invalid login response.');
    }

    final profileData = await _client
        .from('profiles')
        .select()
        .eq('auth_user_id', response.user!.id)
        .single();

    return UserProfile.fromJson(profileData);
  }

  /// User Logout
  Future<void> logout() async {
    await _client.auth.signOut();
  }

  /// Password Reset Email
  Future<void> sendPasswordReset(String email) async {
    await _client.auth.resetPasswordForEmail(email);
  }

  /// Retrieve active session user
  User? get currentUser => _client.auth.currentUser;

  /// Stream of auth changes
  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;
}
