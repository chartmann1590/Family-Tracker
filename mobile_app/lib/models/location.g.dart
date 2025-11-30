// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'location.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Location _$LocationFromJson(Map<String, dynamic> json) => Location(
  id: (json['id'] as num?)?.toInt(),
  userId: (json['user_id'] as num?)?.toInt(),
  latitude: (json['latitude'] as num).toDouble(),
  longitude: (json['longitude'] as num).toDouble(),
  accuracy: (json['accuracy'] as num?)?.toDouble(),
  altitude: (json['altitude'] as num?)?.toDouble(),
  battery: (json['battery'] as num?)?.toInt(),
  timestamp: json['timestamp'] as String,
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$LocationToJson(Location instance) => <String, dynamic>{
  'id': instance.id,
  'user_id': instance.userId,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'accuracy': instance.accuracy,
  'altitude': instance.altitude,
  'battery': instance.battery,
  'timestamp': instance.timestamp,
  'created_at': instance.createdAt,
};

FamilyMemberLocation _$FamilyMemberLocationFromJson(
  Map<String, dynamic> json,
) => FamilyMemberLocation(
  userId: (json['userId'] as num).toInt(),
  userName: json['userName'] as String,
  userEmail: json['userEmail'] as String,
  location: Location.fromJson(json['location'] as Map<String, dynamic>),
);

Map<String, dynamic> _$FamilyMemberLocationToJson(
  FamilyMemberLocation instance,
) => <String, dynamic>{
  'userId': instance.userId,
  'userName': instance.userName,
  'userEmail': instance.userEmail,
  'location': instance.location,
};
