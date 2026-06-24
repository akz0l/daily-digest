# ─── OTP table ────────────────────────────────────────────────────────────────
# Stores one-time passwords pending verification.
# Items expire automatically via DynamoDB TTL on the `ttl` attribute.

resource "aws_dynamodb_table" "otp" {
  name         = var.otp_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# ─── Subscribers table ────────────────────────────────────────────────────────
# Stores active and inactive subscriber records with their selected topics.

resource "aws_dynamodb_table" "subscribers" {
  name         = var.subscribers_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}
