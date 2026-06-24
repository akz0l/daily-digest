variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "generate_otp_function_name" {
  type = string
}
variable "validate_otp_function_name" {
  type = string
}
variable "validate_subscriber_function_name" {
  type = string
}
variable "unsubscribe_function_name" {
  type = string
}

variable "generate_otp_invoke_arn" {
  type = string
}
variable "validate_otp_invoke_arn" {
  type = string
}
variable "validate_subscriber_invoke_arn" {
  type = string
}
variable "unsubscribe_invoke_arn" {
  type = string
}
