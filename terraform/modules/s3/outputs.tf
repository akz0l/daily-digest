output "bucket_id" {
  value = aws_s3_bucket.digests.id
}

output "bucket_name" {
  value = aws_s3_bucket.digests.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.digests.arn
}
