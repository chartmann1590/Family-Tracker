// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'message.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Message _$MessageFromJson(Map<String, dynamic> json) => Message(
  id: (json['id'] as num?)?.toInt(),
  familyId: (json['family_id'] as num?)?.toInt(),
  userId: (json['sender_id'] as num?)?.toInt(),
  userName: json['sender_name'] as String,
  message: json['content'] as String,
  createdAt: json['created_at'] as String,
);

Map<String, dynamic> _$MessageToJson(Message instance) => <String, dynamic>{
  'id': instance.id,
  'family_id': instance.familyId,
  'sender_id': instance.userId,
  'sender_name': instance.userName,
  'content': instance.message,
  'created_at': instance.createdAt,
};

MessagePagination _$MessagePaginationFromJson(Map<String, dynamic> json) =>
    MessagePagination(
      limit: (json['limit'] as num?)?.toInt() ?? 100,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$MessagePaginationToJson(MessagePagination instance) =>
    <String, dynamic>{
      'limit': instance.limit,
      'offset': instance.offset,
      'total': instance.total,
    };
