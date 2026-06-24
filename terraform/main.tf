terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Uncomment after creating the state bucket manually (only needed once):
  #
  # backend "s3" {
  #   bucket         = "daily-digest-terraform-state"
  #   key            = "daily-digest/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "daily-digest-tf-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ─── Modules ──────────────────────────────────────────────────────────────────

module "dynamodb" {
  source                 = "./modules/dynamodb"
  otp_table_name         = var.otp_table_name
  subscribers_table_name = var.subscribers_table_name
}

module "s3" {
  source       = "./modules/s3"
  project_name = var.project_name
}

module "lambda" {
  source                 = "./modules/lambda"
  project_name           = var.project_name
  otp_table_arn          = module.dynamodb.otp_table_arn
  subscribers_table_arn  = module.dynamodb.subscribers_table_arn
  digest_bucket_name     = module.s3.bucket_name
  digest_bucket_arn      = module.s3.bucket_arn
  ses_sender_email       = var.ses_sender_email
  allowed_origin         = var.allowed_origin
  unsubscribe_base_url   = var.unsubscribe_base_url
  anthropic_api_key      = var.anthropic_api_key
}

module "api_gateway" {
  source       = "./modules/api_gateway"
  project_name = var.project_name
  environment  = var.environment

  generate_otp_function_name        = module.lambda.generate_otp_function_name
  validate_otp_function_name        = module.lambda.validate_otp_function_name
  validate_subscriber_function_name = module.lambda.validate_active_subscriber_function_name
  unsubscribe_function_name         = module.lambda.unsubscribe_function_name

  generate_otp_invoke_arn        = module.lambda.generate_otp_invoke_arn
  validate_otp_invoke_arn        = module.lambda.validate_otp_invoke_arn
  validate_subscriber_invoke_arn = module.lambda.validate_active_subscriber_invoke_arn
  unsubscribe_invoke_arn         = module.lambda.unsubscribe_invoke_arn
}

module "eventbridge" {
  source                        = "./modules/eventbridge"
  project_name                  = var.project_name
  generate_digest_lambda_arn    = module.lambda.generate_digest_arn
  generate_digest_function_name = module.lambda.generate_digest_function_name
}

# ─── S3 event notification (defined here to break the circular dependency
#     between the s3 module and the lambda module) ────────────────────────────

resource "aws_lambda_permission" "s3_invoke_send_digest" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.send_digest_email_function_name
  principal     = "s3.amazonaws.com"
  source_arn    = module.s3.bucket_arn
}

resource "aws_s3_bucket_notification" "digest_created" {
  bucket = module.s3.bucket_id

  lambda_function {
    lambda_function_arn = module.lambda.send_digest_email_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "digests/"
    filter_suffix       = ".json"
  }

  depends_on = [aws_lambda_permission.s3_invoke_send_digest]
}
