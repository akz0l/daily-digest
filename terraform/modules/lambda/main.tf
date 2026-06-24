# ─── Deployment package ───────────────────────────────────────────────────────
# Zips the entire src/aws/lambda/ directory (all 6 functions + package.json).
# The package.json with "type":"module" enables ES module syntax in Node.js 22.x.

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../src/aws/lambda"
  output_path = "${path.module}/dist/lambda.zip"
}

# ─── Shared assume-role policy ────────────────────────────────────────────────

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ─── generateOtp ──────────────────────────────────────────────────────────────
# Trigger: API Gateway POST /api/generate
# Generates a 6-digit OTP, stores it in DynamoDB, and emails it via SES.

resource "aws_iam_role" "generate_otp" {
  name               = "${var.project_name}-generate-otp"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "generate_otp" {
  role = aws_iam_role.generate_otp.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = var.otp_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "generate_otp" {
  function_name    = "${var.project_name}-generate-otp"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "generateOtp.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.generate_otp.arn
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      SES_SENDER           = var.ses_sender_email
      ALLOWED_ORIGIN       = var.allowed_origin
      UNSUBSCRIBE_BASE_URL = var.unsubscribe_base_url
    }
  }
}

# ─── validateOtp ──────────────────────────────────────────────────────────────
# Trigger: API Gateway POST /api/validate
# Verifies the OTP, then upserts the subscriber record in DynamoDB.

resource "aws_iam_role" "validate_otp" {
  name               = "${var.project_name}-validate-otp"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "validate_otp" {
  role = aws_iam_role.validate_otp.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = var.otp_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan", "dynamodb:UpdateItem", "dynamodb:PutItem"]
        Resource = var.subscribers_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "validate_otp" {
  function_name    = "${var.project_name}-validate-otp"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "validateOtp.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.validate_otp.arn
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      ALLOWED_ORIGIN = var.allowed_origin
    }
  }
}

# ─── validateActiveSubscriber ─────────────────────────────────────────────────
# Trigger: API Gateway POST /api/subscriber
# Checks whether an email has an active subscription.

resource "aws_iam_role" "validate_active_subscriber" {
  name               = "${var.project_name}-validate-active-subscriber"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "validate_active_subscriber" {
  role = aws_iam_role.validate_active_subscriber.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = var.subscribers_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "validate_active_subscriber" {
  function_name    = "${var.project_name}-validate-active-subscriber"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "validateActiveSubscriber.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.validate_active_subscriber.arn
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      ALLOWED_ORIGIN = var.allowed_origin
    }
  }
}

# ─── unsubscribe ──────────────────────────────────────────────────────────────
# Trigger: API Gateway POST /api/unsubscribe
# Deactivates a subscriber by id + email (called from the unsubscribe page).

resource "aws_iam_role" "unsubscribe" {
  name               = "${var.project_name}-unsubscribe"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "unsubscribe" {
  role = aws_iam_role.unsubscribe.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = var.subscribers_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "unsubscribe" {
  function_name    = "${var.project_name}-unsubscribe"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "unsubscribe.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.unsubscribe.arn
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      ALLOWED_ORIGIN = var.allowed_origin
    }
  }
}

# ─── generateDigest ───────────────────────────────────────────────────────────
# Trigger: EventBridge cron (9:00 AM Panama / 14:00 UTC)
# Fetches RSS feeds by topic, generates a digest with Claude, saves JSON to S3.

resource "aws_iam_role" "generate_digest" {
  name               = "${var.project_name}-generate-digest"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "generate_digest" {
  role = aws_iam_role.generate_digest.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = var.subscribers_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.digest_bucket_arn}/digests/*"
      }
    ]
  })
}

resource "aws_lambda_function" "generate_digest" {
  function_name    = "${var.project_name}-generate-digest"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "generateDigest.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.generate_digest.arn
  timeout          = 300
  memory_size      = 512

  environment {
    variables = {
      DIGEST_BUCKET     = var.digest_bucket_name
      ANTHROPIC_API_KEY = var.anthropic_api_key
    }
  }
}

# ─── sendDigestEmail ──────────────────────────────────────────────────────────
# Trigger: S3 ObjectCreated on digests/*.json (wired in root main.tf)
# Reads the digest JSON from S3, sends personalized emails to active subscribers.

resource "aws_iam_role" "send_digest_email" {
  name               = "${var.project_name}-send-digest-email"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "send_digest_email" {
  role = aws_iam_role.send_digest_email.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = var.subscribers_table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.digest_bucket_arn}/digests/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "send_digest_email" {
  function_name    = "${var.project_name}-send-digest-email"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "sendDigestEmail.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.send_digest_email.arn
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      SES_SENDER           = var.ses_sender_email
      UNSUBSCRIBE_BASE_URL = var.unsubscribe_base_url
    }
  }
}
