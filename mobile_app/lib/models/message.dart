import 'package:json_annotation/json_annotation.dart';

part 'message.g.dart';

@JsonSerializable()
class Message {
  final int id;
  @JsonKey(name: 'familyId')
  final int familyId;
  @JsonKey(name: 'userId')
  final int userId;
  @JsonKey(name: 'userName')
  final String userName;
  @JsonKey(name: 'userEmail')
  final String userEmail;
  final String message;
  @JsonKey(name: 'createdAt')
  final String createdAt;
  @JsonKey(name: 'updatedAt')
  final String? updatedAt;

  Message({
    required this.id,
    required this.familyId,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.message,
    required this.createdAt,
    this.updatedAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);

  Message copyWith({
    int? id,
    int? familyId,
    int? userId,
    String? userName,
    String? userEmail,
    String? message,
    String? createdAt,
    String? updatedAt,
  }) {
    return Message(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool isFromUser(int currentUserId) => userId == currentUserId;
}

@JsonSerializable()
class MessagePagination {
  final int limit;
  final int offset;
  final int total;

  MessagePagination({
    required this.limit,
    required this.offset,
    required this.total,
  });

  factory MessagePagination.fromJson(Map<String, dynamic> json) =>
      _$MessagePaginationFromJson(json);
  Map<String, dynamic> toJson() => _$MessagePaginationToJson(this);

  bool get hasMore => offset + limit < total;
}
