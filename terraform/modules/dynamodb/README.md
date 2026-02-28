# DYNAMODB module

## Purpose
Own resources for the DynamoDB persistence layer.

## Resources
- `aws_dynamodb_table.users`
  - Primary key: `user_id` (String)
  - GSI: `username-index` (`username`)
  - On-demand billing, PITR, deletion protection, SSE
- `aws_dynamodb_table.games`
  - Primary key: `game_id` (String)
  - Sort key: `ended_at` (String)
  - GSIs:
    - `white-player-index` (`white_player_id`, `ended_at`)
    - `black-player-index` (`black_player_id`, `ended_at`)
  - On-demand billing, PITR, deletion protection, SSE

## Key Inputs
- `project` (string)
- `environment` (string)
- `users_table_name` (string, optional override)
- `games_table_name` (string, optional override)
- `billing_mode` (string, default `PAY_PER_REQUEST`)
- `enable_pitr` (bool, default `true`)
- `deletion_protection_enabled` (bool, default `true`)
- `tags` (map(string))

## Outputs
- `dynamodb_module_status`
- `users_table_name`
- `users_table_arn`
- `games_table_name`
- `games_table_arn`
