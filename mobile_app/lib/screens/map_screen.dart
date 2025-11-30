import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/location_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/location_marker.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  bool _followingUser = true;

  @override
  void initState() {
    super.initState();
    _centerOnUserLocation();
  }

  Future<void> _centerOnUserLocation() async {
    final locationProvider = context.read<LocationProvider>();
    await locationProvider.updateCurrentPosition();

    if (locationProvider.currentPosition != null && mounted) {
      _mapController.move(
        LatLng(
          locationProvider.currentPosition!.latitude,
          locationProvider.currentPosition!.longitude,
        ),
        15.0,
      );
    }
  }

  void _centerOnFamily() {
    final locationProvider = context.read<LocationProvider>();
    final locations = locationProvider.familyLocations;

    if (locations.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No family locations available')),
      );
      return;
    }

    // Calculate bounds
    double minLat = locations.first.location.latitude;
    double maxLat = locations.first.location.latitude;
    double minLng = locations.first.location.longitude;
    double maxLng = locations.first.location.longitude;

    for (final loc in locations) {
      if (loc.location.latitude < minLat) minLat = loc.location.latitude;
      if (loc.location.latitude > maxLat) maxLat = loc.location.latitude;
      if (loc.location.longitude < minLng) minLng = loc.location.longitude;
      if (loc.location.longitude > maxLng) maxLng = loc.location.longitude;
    }

    final bounds = LatLngBounds(
      LatLng(minLat, minLng),
      LatLng(maxLat, maxLng),
    );

    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.all(50),
      ),
    );

    setState(() {
      _followingUser = false;
    });
  }

  Future<void> _refreshLocations() async {
    final locationProvider = context.read<LocationProvider>();
    await locationProvider.loadFamilyLocations();
    await locationProvider.updateCurrentPosition();
  }

  @override
  Widget build(BuildContext context) {
    final locationProvider = context.watch<LocationProvider>();
    final authProvider = context.watch<AuthProvider>();
    final currentUserId = authProvider.user?.id;

    return Scaffold(
      body: Stack(
        children: [
          // Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(37.7749, -122.4194),
              initialZoom: 13.0,
              minZoom: 3.0,
              maxZoom: 18.0,
              onPositionChanged: (position, hasGesture) {
                if (hasGesture) {
                  setState(() {
                    _followingUser = false;
                  });
                }
              },
            ),
            children: [
              // Map tiles
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.family_tracker_mobile',
              ),

              // Location markers
              MarkerLayer(
                markers: locationProvider.familyLocations.map((memberLoc) {
                  final isCurrentUser = memberLoc.userId == currentUserId;
                  return Marker(
                    point: LatLng(
                      memberLoc.location.latitude,
                      memberLoc.location.longitude,
                    ),
                    width: 80,
                    height: 80,
                    child: LocationMarkerWidget(
                      userName: memberLoc.userName,
                      battery: memberLoc.location.battery,
                      isCurrentUser: isCurrentUser,
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          builder: (context) => Container(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: isCurrentUser
                                          ? Theme.of(context).primaryColor
                                          : Colors.grey[400],
                                      child: Text(
                                        memberLoc.userName[0].toUpperCase(),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            memberLoc.userName,
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium
                                                ?.copyWith(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                          ),
                                          Text(
                                            memberLoc.userEmail,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color: Colors.grey[600],
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 24),
                                _buildInfoRow(
                                  Icons.location_on,
                                  'Location',
                                  '${memberLoc.location.latitude.toStringAsFixed(6)}, ${memberLoc.location.longitude.toStringAsFixed(6)}',
                                ),
                                if (memberLoc.location.accuracy != null)
                                  _buildInfoRow(
                                    Icons.gps_fixed,
                                    'Accuracy',
                                    '${memberLoc.location.accuracy!.toStringAsFixed(1)}m',
                                  ),
                                if (memberLoc.location.battery != null)
                                  _buildInfoRow(
                                    Icons.battery_std,
                                    'Battery',
                                    '${memberLoc.location.battery}%',
                                  ),
                                if (memberLoc.location.altitude != null)
                                  _buildInfoRow(
                                    Icons.terrain,
                                    'Altitude',
                                    '${memberLoc.location.altitude!.toStringAsFixed(1)}m',
                                  ),
                                _buildInfoRow(
                                  Icons.access_time,
                                  'Updated',
                                  _formatTimestamp(
                                      memberLoc.location.timestamp),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // Loading indicator
          if (locationProvider.isLoading)
            const Positioned(
              top: 16,
              left: 0,
              right: 0,
              child: Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text('Loading locations...'),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Controls
          Positioned(
            right: 16,
            bottom: 16,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Refresh button
                FloatingActionButton.small(
                  heroTag: 'refresh',
                  onPressed: _refreshLocations,
                  child: const Icon(Icons.refresh),
                ),
                const SizedBox(height: 8),
                // Center on user button
                FloatingActionButton.small(
                  heroTag: 'center_user',
                  onPressed: _centerOnUserLocation,
                  backgroundColor: _followingUser
                      ? Theme.of(context).primaryColor
                      : null,
                  child: const Icon(Icons.my_location),
                ),
                const SizedBox(height: 8),
                // Center on family button
                FloatingActionButton.small(
                  heroTag: 'center_family',
                  onPressed: _centerOnFamily,
                  child: const Icon(Icons.family_restroom),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(
            '$label: ',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(color: Colors.grey[600]),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dateTime = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}h ago';
      } else {
        return '${difference.inDays}d ago';
      }
    } catch (e) {
      return timestamp;
    }
  }
}
