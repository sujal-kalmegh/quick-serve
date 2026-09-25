import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import 'login_screen.dart';
import 'customer_shell_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    // Artificial brief pause for branding
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      _navigateToLogin();
      return;
    }

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        _navigateToLogin();
        return;
      }

      // Query profile to verify role
      final profileData = await Supabase.instance.client
          .from('profiles')
          .select()
          .eq('auth_user_id', user.id)
          .single();

      final profile = UserProfile.fromJson(profileData);

      if (!mounted) return;

      if (profile.role == UserRole.customer) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => CustomerShellScreen(profile: profile)),
        );
      } else {
        // If an agent or admin opens customer mobile app, notify and log out
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('This mobile client is optimized for Customers. Please use the Admin Portal.'),
          ),
        );
        await Supabase.instance.client.auth.signOut();
        _navigateToLogin();
      }
    } catch (e) {
      // If profile lookup fails (e.g. offline), route to login
      _navigateToLogin();
    }
  }

  void _navigateToLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.build_circle_outlined,
                size: 64,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'QuickServe',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Service Request Management',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}
