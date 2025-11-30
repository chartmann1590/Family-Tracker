import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/family_provider.dart';
import '../providers/auth_provider.dart';

class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  final _createFamilyController = TextEditingController();
  final _inviteEmailController = TextEditingController();

  @override
  void dispose() {
    _createFamilyController.dispose();
    _inviteEmailController.dispose();
    super.dispose();
  }

  Future<void> _createFamily() async {
    final name = _createFamilyController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a family name')),
      );
      return;
    }

    final familyProvider = context.read<FamilyProvider>();
    final success = await familyProvider.createFamily(name);

    if (!mounted) return;

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Family created successfully')),
      );
    } else if (familyProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(familyProvider.error!),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _inviteUser() async {
    final email = _inviteEmailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid email')),
      );
      return;
    }

    final familyProvider = context.read<FamilyProvider>();
    final success = await familyProvider.inviteUser(email);

    if (!mounted) return;

    if (success) {
      Navigator.pop(context);
      _inviteEmailController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User invited successfully')),
      );
    } else if (familyProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(familyProvider.error!),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _leaveFamily() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Family'),
        content: const Text(
          'Are you sure you want to leave this family? You will need to be invited again to rejoin.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Leave'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    final familyProvider = context.read<FamilyProvider>();
    final success = await familyProvider.leaveFamily();

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Left family successfully')),
      );
    } else if (familyProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(familyProvider.error!),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showCreateFamilyDialog() {
    _createFamilyController.clear();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Family'),
        content: TextField(
          controller: _createFamilyController,
          decoration: const InputDecoration(
            labelText: 'Family Name',
            hintText: 'e.g., The Smiths',
          ),
          textCapitalization: TextCapitalization.words,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: _createFamily,
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showInviteUserDialog() {
    _inviteEmailController.clear();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Invite User'),
        content: TextField(
          controller: _inviteEmailController,
          decoration: const InputDecoration(
            labelText: 'Email Address',
            hintText: 'user@example.com',
          ),
          keyboardType: TextInputType.emailAddress,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: _inviteUser,
            child: const Text('Invite'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final familyProvider = context.watch<FamilyProvider>();
    final authProvider = context.watch<AuthProvider>();
    final currentUserId = authProvider.user?.id;

    if (familyProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!familyProvider.hasFamily) {
      return _buildNoFamilyView();
    }

    final family = familyProvider.family!;

    return RefreshIndicator(
      onRefresh: () => familyProvider.loadFamily(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Family info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.family_restroom,
                        size: 32,
                        color: Theme.of(context).primaryColor,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              family.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              '${family.memberCount} member${family.memberCount != 1 ? 's' : ''}',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _showInviteUserDialog,
                          icon: const Icon(Icons.person_add),
                          label: const Text('Invite'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _leaveFamily,
                          icon: const Icon(Icons.exit_to_app),
                          label: const Text('Leave'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Members list
          Text(
            'Members',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),

          if (family.members == null || family.members!.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text('No members found'),
                ),
              ),
            )
          else
            ...family.members!.map((member) {
              final isCurrentUser = member.id == currentUserId;
              final isCreator = member.id == family.createdBy;

              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isCurrentUser
                        ? Theme.of(context).primaryColor
                        : Colors.grey[400],
                    child: Text(
                      member.name[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Row(
                    children: [
                      Text(member.name),
                      if (isCurrentUser) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'You',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                      if (isCreator) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Creator',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  subtitle: Text(member.email),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildNoFamilyView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.family_restroom_outlined,
              size: 100,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            Text(
              'No Family Yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Create a family to start tracking your loved ones or wait to be invited to join one.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _showCreateFamilyDialog,
              icon: const Icon(Icons.add),
              label: const Text('Create Family'),
            ),
          ],
        ),
      ),
    );
  }
}
