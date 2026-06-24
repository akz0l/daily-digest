output "invoke_url" {
  description = "API Gateway invoke URL — use as OTP_API_ENDPOINT in the frontend .env"
  value       = "${aws_api_gateway_stage.this.invoke_url}/api"
}

output "api_key_value" {
  description = "API key value — use as OTP_API_KEY in the frontend .env"
  value       = aws_api_gateway_api_key.this.value
  sensitive   = true
}
