output "api_gateway_url" {
  description = "API Gateway invoke URL — use this as OTP_API_ENDPOINT in the frontend .env"
  value       = module.api_gateway.invoke_url
}

output "api_gateway_key" {
  description = "API Gateway key value — use this as OTP_API_KEY in the frontend .env"
  value       = module.api_gateway.api_key_value
  sensitive   = true
}

output "digest_bucket_name" {
  description = "S3 bucket where daily digest JSON files are stored"
  value       = module.s3.bucket_name
}

output "otp_table_name" {
  description = "DynamoDB OTP table name"
  value       = module.dynamodb.otp_table_name
}

output "subscribers_table_name" {
  description = "DynamoDB subscribers table name"
  value       = module.dynamodb.subscribers_table_name
}
