variable "project_name" {
  type = string
}

variable "generate_digest_lambda_arn" {
  description = "ARN of the generateDigest Lambda function"
  type        = string
}

variable "generate_digest_function_name" {
  description = "Function name of the generateDigest Lambda (used for aws_lambda_permission)"
  type        = string
}
