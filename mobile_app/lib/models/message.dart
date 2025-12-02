import 'package:json_annotation/json_annotation.dart';

part 'message.g.dart';

@JsonSerializable()
class Message {
  final int? id;
  @JsonKey(name: 'family_id')
  final int? familyId;
  @JsonKey(name: 'sender_id')
  final int? userId;
  @JsonKey(name: 'sender_name')
  final String userName;
  @JsonKey(name: 'content')
  final String message;
  @JsonKey(name: 'created_at')
  final String createdAt;

  Message({
    this.id,
    this.familyId,
    this.userId,
    required this.userName,
    required this.message,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);

  Message copyWith({
    int? id,
    int? familyId,
    int? userId,
    String? userName,
    String? message,
    String? createdAt,
  }) {
    return Message(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool isFromUser(int currentUserId) => userId != null && userId == currentUserId;
}

@JsonSerializable()
class MessagePagination {
  final int limit;
  final int offset;
  final int total;

  MessagePagination({
    this.limit = 100,
    this.offset = 0,
    this.total = 0,
  });

  factory MessagePagination.fromJson(Map<String, dynamic> json) =>
      _$MessagePaginationFromJson(json);
  Map<String, dynamic> toJson() => _$MessagePaginationToJson(this);

  bool get hasMore => offset + limit < total;
}
