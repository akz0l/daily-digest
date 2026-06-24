output "generate_otp_arn" {
  value = aws_lambda_function.generate_otp.arn
}
output "generate_otp_invoke_arn" {
  value = aws_lambda_function.generate_otp.invoke_arn
}
output "generate_otp_function_name" {
  value = aws_lambda_function.generate_otp.function_name
}

output "validate_otp_arn" {
  value = aws_lambda_function.validate_otp.arn
}
output "validate_otp_invoke_arn" {
  value = aws_lambda_function.validate_otp.invoke_arn
}
output "validate_otp_function_name" {
  value = aws_lambda_function.validate_otp.function_name
}

output "validate_active_subscriber_arn" {
  value = aws_lambda_function.validate_active_subscriber.arn
}
output "validate_active_subscriber_invoke_arn" {
  value = aws_lambda_function.validate_active_subscriber.invoke_arn
}
output "validate_active_subscriber_function_name" {
  value = aws_lambda_function.validate_active_subscriber.function_name
}

output "unsubscribe_arn" {
  value = aws_lambda_function.unsubscribe.arn
}
output "unsubscribe_invoke_arn" {
  value = aws_lambda_function.unsubscribe.invoke_arn
}
output "unsubscribe_function_name" {
  value = aws_lambda_function.unsubscribe.function_name
}

output "generate_digest_arn" {
  value = aws_lambda_function.generate_digest.arn
}
output "generate_digest_function_name" {
  value = aws_lambda_function.generate_digest.function_name
}

output "send_digest_email_arn" {
  value = aws_lambda_function.send_digest_email.arn
}
output "send_digest_email_function_name" {
  value = aws_lambda_function.send_digest_email.function_name
}
