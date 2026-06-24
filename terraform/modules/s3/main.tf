# ─── Digest bucket ────────────────────────────────────────────────────────────
# Stores daily digest JSON files under digests/YYYY/MM/DD/digest.json.
# An S3 ObjectCreated event on this prefix triggers sendDigestEmail (wired in
# the root module to avoid a circular dependency with the Lambda module).

resource "aws_s3_bucket" "digests" {
  bucket = "${var.project_name}-digests"
}

resource "aws_s3_bucket_versioning" "digests" {
  bucket = aws_s3_bucket.digests.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "digests" {
  bucket = aws_s3_bucket.digests.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "digests" {
  bucket = aws_s3_bucket.digests.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
