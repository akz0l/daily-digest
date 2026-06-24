# REST API Gateway with API key authentication.
# The Next.js frontend proxy calls these endpoints server-side, so CORS is
# not configured at the API Gateway level.

resource "aws_api_gateway_rest_api" "this" {
  name = var.project_name

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# ─── /api ─────────────────────────────────────────────────────────────────────

resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "api"
}

# ─── Routes ───────────────────────────────────────────────────────────────────

locals {
  routes = {
    generate = {
      path        = "generate"
      invoke_arn  = var.generate_otp_invoke_arn
      function    = var.generate_otp_function_name
    }
    validate = {
      path        = "validate"
      invoke_arn  = var.validate_otp_invoke_arn
      function    = var.validate_otp_function_name
    }
    subscriber = {
      path        = "subscriber"
      invoke_arn  = var.validate_subscriber_invoke_arn
      function    = var.validate_subscriber_function_name
    }
    unsubscribe = {
      path        = "unsubscribe"
      invoke_arn  = var.unsubscribe_invoke_arn
      function    = var.unsubscribe_function_name
    }
  }
}

resource "aws_api_gateway_resource" "route" {
  for_each    = local.routes
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = each.value.path
}

resource "aws_api_gateway_method" "post" {
  for_each    = local.routes
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.route[each.key].id
  http_method = "POST"
  authorization = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "lambda" {
  for_each                = local.routes
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.route[each.key].id
  http_method             = aws_api_gateway_method.post[each.key].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = each.value.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  for_each      = local.routes
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

# ─── Deployment & Stage ───────────────────────────────────────────────────────

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api,
      aws_api_gateway_resource.route,
      aws_api_gateway_method.post,
      aws_api_gateway_integration.lambda,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "this" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  deployment_id = aws_api_gateway_deployment.this.id
  stage_name    = var.environment
}

# ─── API Key & Usage Plan ─────────────────────────────────────────────────────

resource "aws_api_gateway_api_key" "this" {
  name    = "${var.project_name}-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan" "this" {
  name = "${var.project_name}-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.this.id
    stage  = aws_api_gateway_stage.this.stage_name
  }
}

resource "aws_api_gateway_usage_plan_key" "this" {
  key_id        = aws_api_gateway_api_key.this.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.this.id
}
