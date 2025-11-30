// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'message.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Message _$MessageFromJson(Map<String, dynamic> json) => Message(
  id: (json['id'] as num).toInt(),
  familyId: (json['familyId'] as num).toInt(),
  userId: (json['userId'] as num).toInt(),
  userName: json['userName'] as String,
  userEmail: json['userEmail'] as String,
  message: json['message'] as String,
  createdAt: json['createdAt'] as String,
  updatedAt: json['updatedAt'] as String?,
);

Map<String, dynamic> _$MessageToJson(Message instance) => <String, dynamic>{
  'id': instance.id,
  'familyId': instance.familyId,
  'userId': instance.userId,
  'userName': instance.userName,
  'userEmail': instance.userEmail,
  'message': instance.message,
  'createdAt': instance.createdAt,
  'updatedAt': instance.updatedAt,
};

MessagePagination _$MessagePaginationFromJson(Map<String, dynamic> json) =>
    MessagePagination(
      limit: (json['limit'] as num).toInt(),
      offset: (json['offset'] as num).toInt(),
      total: (json['total'] as num).toInt(),
    );

Map<String, dynamic> _$MessagePaginationToJson(MessagePagination instance) =>
    <String, dynamic>{
      'limit': instance.limit,
      'offset': instance.offset,
      'total': instance.total,
    };
