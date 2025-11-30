import 'package:json_annotation/json_annotation.dart';
import 'user.dart';

part 'family.g.dart';

@JsonSerializable()
class Family {
  final int id;
  final String name;
  @JsonKey(name: 'created_by')
  final int createdBy;
  @JsonKey(name: 'created_at')
  final String createdAt;
  @JsonKey(name: 'updated_at')
  final String updatedAt;
  final List<User>? members;

  Family({
    required this.id,
    required this.name,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.members,
  });

  factory Family.fromJson(Map<String, dynamic> json) => _$FamilyFromJson(json);
  Map<String, dynamic> toJson() => _$FamilyToJson(this);

  Family copyWith({
    int? id,
    String? name,
    int? createdBy,
    String? createdAt,
    String? updatedAt,
    List<User>? members,
  }) {
    return Family(
      id: id ?? this.id,
      name: name ?? this.name,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      members: members ?? this.members,
    );
  }

  bool get hasMembers => members != null && members!.isNotEmpty;
  int get memberCount => members?.length ?? 0;
}
