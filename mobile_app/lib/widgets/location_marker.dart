import 'package:flutter/material.dart';

class LocationMarkerWidget extends StatelessWidget {
  final String userName;
  final int? battery;
  final bool isCurrentUser;
  final VoidCallback? onTap;

  const LocationMarkerWidget({
    super.key,
    required this.userName,
    this.battery,
    this.isCurrentUser = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Battery indicator
          if (battery != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _getBatteryColor(battery!),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _getBatteryIcon(battery!),
                    size: 12,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '$battery%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),

          // User avatar
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: isCurrentUser
                  ? Theme.of(context).primaryColor
                  : Colors.grey[600],
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white,
                width: 3,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(76),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Text(
                userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          // User name label
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isCurrentUser
                  ? Theme.of(context).primaryColor
                  : Colors.grey[600],
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(51),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Text(
              userName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Color _getBatteryColor(int battery) {
    if (battery > 50) {
      return Colors.green;
    } else if (battery > 20) {
      return Colors.orange;
    } else {
      return Colors.red;
    }
  }

  IconData _getBatteryIcon(int battery) {
    if (battery > 80) {
      return Icons.battery_full;
    } else if (battery > 60) {
      return Icons.battery_5_bar;
    } else if (battery > 40) {
      return Icons.battery_4_bar;
    } else if (battery > 20) {
      return Icons.battery_2_bar;
    } else {
      return Icons.battery_1_bar;
    }
  }
}
