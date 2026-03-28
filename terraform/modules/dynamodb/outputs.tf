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

output "friendships_table_name" {
  value       = aws_dynamodb_table.friendships.name
  description = "Name of the friendships DynamoDB table."
}

output "friendships_table_arn" {
  value       = aws_dynamodb_table.friendships.arn
  description = "ARN of the friendships DynamoDB table."
}

output "friend_requests_table_name" {
  value       = aws_dynamodb_table.friend_requests.name
  description = "Name of the friend requests DynamoDB table."
}

output "friend_requests_table_arn" {
  value       = aws_dynamodb_table.friend_requests.arn
  description = "ARN of the friend requests DynamoDB table."
}

output "challenges_table_name" {
  value       = aws_dynamodb_table.challenges.name
  description = "Name of the challenges DynamoDB table."
}

output "challenges_table_arn" {
  value       = aws_dynamodb_table.challenges.arn
  description = "ARN of the challenges DynamoDB table."
}

output "notifications_table_name" {
  value       = aws_dynamodb_table.notifications.name
  description = "Name of the notifications DynamoDB table."
}

output "notifications_table_arn" {
  value       = aws_dynamodb_table.notifications.arn
  description = "ARN of the notifications DynamoDB table."
}
