output "dynamodb_module_status" {
  value       = "dynamodb module active"
  description = "Indicates that the dynamodb module has concrete resources configured."
}

output "users_table_name" {
  value       = aws_dynamodb_table.users.name
  description = "Name of the users DynamoDB table."
}

output "users_table_arn" {
  value       = aws_dynamodb_table.users.arn
  description = "ARN of the users DynamoDB table."
}

output "games_table_name" {
  value       = aws_dynamodb_table.games.name
  description = "Name of the games DynamoDB table."
}

output "games_table_arn" {
  value       = aws_dynamodb_table.games.arn
  description = "ARN of the games DynamoDB table."
}

output "pair_rooms_table_name" {
  value       = aws_dynamodb_table.pair_rooms.name
  description = "Name of the pair rooms DynamoDB table."
}

output "pair_rooms_table_arn" {
  value       = aws_dynamodb_table.pair_rooms.arn
  description = "ARN of the pair rooms DynamoDB table."
}
