import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  final int id;
  final String email;
  final String name;
  @JsonKey(name: 'is_admin')
  final bool isAdmin;
  @JsonKey(name: 'family_id')
  final int? familyId;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.isAdmin = false,
    this.familyId,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  User copyWith({
    int? id,
    String? email,
    String? name,
    bool? isAdmin,
    int? familyId,
    String? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      isAdmin: isAdmin ?? this.isAdmin,
      familyId: familyId ?? this.familyId,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
