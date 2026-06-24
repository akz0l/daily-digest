variable "otp_table_name" {
  description = "DynamoDB table name for OTP records"
  type        = string
}

variable "subscribers_table_name" {
  description = "DynamoDB table name for subscriber records"
  type        = string
}
