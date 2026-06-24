output "rule_arn" {
  description = "ARN of the EventBridge scheduled rule"
  value       = aws_cloudwatch_event_rule.daily_digest.arn
}
