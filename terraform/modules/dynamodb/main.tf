locals {
  module_name           = "dynamodb"
  users_table_name      = coalesce(var.users_table_name, "${var.project}-${var.environment}-users")
  games_table_name      = coalesce(var.games_table_name, "${var.project}-${var.environment}-games")
  pair_rooms_table_name = coalesce(var.pair_rooms_table_name, "${var.project}-${var.environment}-pair-rooms")
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
