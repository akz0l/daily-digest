# ─── Scheduled rule ───────────────────────────────────────────────────────────
# Fires daily at 9:00 AM Panama time (UTC-5, no DST).
# cron(minute hour day month weekday year)

resource "aws_cloudwatch_event_rule" "daily_digest" {
  name                = "${var.project_name}-daily-digest"
  description         = "Triggers generateDigest daily at 9:00 AM Panama time (14:00 UTC)"
  schedule_expression = "cron(0 14 * * ? *)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "generate_digest" {
  rule      = aws_cloudwatch_event_rule.daily_digest.name
  target_id = "generateDigest"
  arn       = var.generate_digest_lambda_arn
}

resource "aws_lambda_permission" "eventbridge_invoke" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.generate_digest_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_digest.arn
}
