variable "project_name" {
  type = string
}

variable "otp_table_arn" {
  description = "ARN of the Otp-daily-digest DynamoDB table"
  type        = string
}

variable "subscribers_table_arn" {
  description = "ARN of the subscribers DynamoDB table"
  type        = string
}

variable "digest_bucket_name" {
  description = "Name of the S3 bucket for digest JSON files"
  type        = string
}

variable "digest_bucket_arn" {
  description = "ARN of the S3 bucket for digest JSON files"
  type        = string
}

variable "ses_sender_email" {
  description = "Verified SES sender email address"
  type        = string
}

variable "allowed_origin" {
  description = "Frontend origin URL for CORS headers"
  type        = string
}

variable "unsubscribe_base_url" {
  description = "Base URL for unsubscribe and legal links in emails"
  type        = string
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude (used by generateDigest)"
  type        = string
  sensitive   = true
}
