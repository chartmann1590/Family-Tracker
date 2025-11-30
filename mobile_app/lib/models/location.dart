import 'package:json_annotation/json_annotation.dart';

part 'location.g.dart';

@JsonSerializable()
class Location {
  final int? id;
  @JsonKey(name: 'user_id')
  final int? userId;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? altitude;
  final int? battery;
  final String timestamp;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  Location({
    this.id,
    this.userId,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.altitude,
    this.battery,
    required this.timestamp,
    this.createdAt,
  });

  factory Location.fromJson(Map<String, dynamic> json) => _$LocationFromJson(json);
  Map<String, dynamic> toJson() => _$LocationToJson(this);

  Location copyWith({
    int? id,
    int? userId,
    double? latitude,
    double? longitude,
    double? accuracy,
    double? altitude,
    int? battery,
    String? timestamp,
    String? createdAt,
  }) {
    return Location(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      altitude: altitude ?? this.altitude,
      battery: battery ?? this.battery,
      timestamp: timestamp ?? this.timestamp,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

@JsonSerializable()
class FamilyMemberLocation {
  @JsonKey(name: 'userId')
  final int userId;
  @JsonKey(name: 'userName')
  final String userName;
  @JsonKey(name: 'userEmail')
  final String userEmail;
  final Location location;

  FamilyMemberLocation({
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.location,
  });

  factory FamilyMemberLocation.fromJson(Map<String, dynamic> json) =>
      _$FamilyMemberLocationFromJson(json);
  Map<String, dynamic> toJson() => _$FamilyMemberLocationToJson(this);
}
