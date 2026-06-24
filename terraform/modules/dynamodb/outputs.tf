output "otp_table_name" {
  value = aws_dynamodb_table.otp.name
}

output "otp_table_arn" {
  value = aws_dynamodb_table.otp.arn
}

output "subscribers_table_name" {
  value = aws_dynamodb_table.subscribers.name
}

output "subscribers_table_arn" {
  value = aws_dynamodb_table.subscribers.arn
}
