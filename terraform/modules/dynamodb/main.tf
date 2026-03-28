locals {
  module_name                = "dynamodb"
  users_table_name           = coalesce(var.users_table_name, "${var.project}-${var.environment}-users")
  games_table_name           = coalesce(var.games_table_name, "${var.project}-${var.environment}-games")
  pair_rooms_table_name      = coalesce(var.pair_rooms_table_name, "${var.project}-${var.environment}-pair-rooms")
  friendships_table_name     = coalesce(var.friendships_table_name, "${var.project}-${var.environment}-friendships")
  friend_requests_table_name = coalesce(var.friend_requests_table_name, "${var.project}-${var.environment}-friend-requests")
  challenges_table_name      = coalesce(var.challenges_table_name, "${var.project}-${var.environment}-challenges")
  notifications_table_name   = coalesce(var.notifications_table_name, "${var.project}-${var.environment}-notifications")
}

resource "aws_dynamodb_table" "users" {
  name                        = local.users_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "user_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  global_secondary_index {
    name            = "username-index"
    projection_type = "ALL"
    hash_key        = "username"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.users_table_name
  })
}

resource "aws_dynamodb_table" "games" {
  name                        = local.games_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "game_id"
  range_key                   = "ended_at"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "game_id"
    type = "S"
  }

  attribute {
    name = "ended_at"
    type = "S"
  }

  attribute {
    name = "white_player_id"
    type = "S"
  }

  attribute {
    name = "black_player_id"
    type = "S"
  }

  global_secondary_index {
    name            = "white-player-index"
    projection_type = "ALL"
    hash_key        = "white_player_id"
    range_key       = "ended_at"
  }

  global_secondary_index {
    name            = "black-player-index"
    projection_type = "ALL"
    hash_key        = "black_player_id"
    range_key       = "ended_at"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.games_table_name
  })
}

resource "aws_dynamodb_table" "pair_rooms" {
  name                        = local.pair_rooms_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "pair_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "pair_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.pair_rooms_table_name
  })
}

resource "aws_dynamodb_table" "friendships" {
  name                        = local.friendships_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "user_id"
  range_key                   = "friend_user_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "friend_user_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.friendships_table_name
  })
}

resource "aws_dynamodb_table" "friend_requests" {
  name                        = local.friend_requests_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "recipient_user_id"
  range_key                   = "request_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "recipient_user_id"
    type = "S"
  }

  attribute {
    name = "request_id"
    type = "S"
  }

  attribute {
    name = "sender_user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "sender-requests-index"
    projection_type = "ALL"
    hash_key        = "sender_user_id"
    range_key       = "created_at"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.friend_requests_table_name
  })
}

resource "aws_dynamodb_table" "challenges" {
  name                        = local.challenges_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "challenge_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "challenge_id"
    type = "S"
  }

  attribute {
    name = "challenger_user_id"
    type = "S"
  }

  attribute {
    name = "challenged_user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "challenger-index"
    projection_type = "ALL"
    hash_key        = "challenger_user_id"
    range_key       = "created_at"
  }

  global_secondary_index {
    name            = "challenged-index"
    projection_type = "ALL"
    hash_key        = "challenged_user_id"
    range_key       = "created_at"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.challenges_table_name
  })
}

resource "aws_dynamodb_table" "notifications" {
  name                        = local.notifications_table_name
  billing_mode                = var.billing_mode
  hash_key                    = "user_id"
  range_key                   = "notification_id"
  deletion_protection_enabled = var.deletion_protection_enabled

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "notification_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.notifications_table_name
  })
}
