variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as a prefix for all resources"
  type        = string
  default     = "daily-digest"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "ses_sender_email" {
  description = "Verified SES sender email address (must be verified in SES before deploy)"
  type        = string
}

variable "allowed_origin" {
  description = "Frontend origin URL for CORS headers returned by Lambdas (e.g. https://your-domain.com)"
  type        = string
}

variable "unsubscribe_base_url" {
  description = "Base URL used to build unsubscribe and legal links in emails (e.g. https://your-domain.com)"
  type        = string
}

variable "anthropic_api_key" {
  description = "Anthropic API key used by generateDigest to call Claude"
  type        = string
  sensitive   = true
}

variable "otp_table_name" {
  description = "DynamoDB table name for OTP records — must match the hardcoded value in generateOtp.js and validateOtp.js"
  type        = string
  default     = "Otp-daily-digest"
}

variable "subscribers_table_name" {
  description = "DynamoDB table name for subscriber records — must match the hardcoded value in the Lambda functions"
  type        = string
  default     = "subscribers"
}
