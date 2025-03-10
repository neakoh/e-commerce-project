module "your_api_gateway" {
  source = "terraform-aws-modules/apigateway-v2/aws"

  name          = "your-api-name"
  description   = "Routing requests from s3 static to backend in ECS."
  protocol_type = "HTTP"

  cors_configuration = {
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token", "x-amz-user-agent", "stripe-signature"]
    allow_methods = ["*"]
    allow_origins = ["https://${var.domain_name}", "https://api.stripe.com"]
  }

  hosted_zone_name = var.domain_name
  domain_name      = "api.${var.domain_name}"

  # Access logs
  stage_access_log_settings = {
    create_log_group            = true
    log_group_retention_in_days = 7
    format = jsonencode({
      context = {
        domainName              = "$context.domainName"
        integrationErrorMessage = "$context.integrationErrorMessage"
        protocol                = "$context.protocol"
        requestId               = "$context.requestId"
        requestTime             = "$context.requestTime"
        responseLength          = "$context.responseLength"
        routeKey                = "$context.routeKey"
        stage                   = "$context.stage"
        status                  = "$context.status"
        error = {
          message      = "$context.error.message"
          responseType = "$context.error.responseType"
        }
        identity = {
          sourceIP = "$context.identity.sourceIp"
        }
        integration = {
          error             = "$context.integration.error"
          integrationStatus = "$context.integration.integrationStatus"
        }
      }
    })
  }

  # Routes & Integration(s)
  routes = {
    // Account Routes
    "POST /account/register" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /account/login" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /account/reset-password" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /account/change-password" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /account/verify" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "PUT /account" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "DELETE /account" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /account" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /account/validate-token" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    
    // Brands Routes
    "GET /brands" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },

    // Categories Routes
    "GET /categories" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },

    // Items Routes
    "GET /items" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /items/{id}" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /items/category/{categoryID}" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /items/brand/{brandID}" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /items/categories" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /items/brands" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },

    // Orders Routes
    "POST /orders" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /orders/all" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /orders" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /orders/{id}" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /orders/{orderID}/cancel" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /orders/{orderID}/status" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },

    // Stripe Routes
    "POST /stripe/create-payment-intent" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /stripe/create-checkout-session" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /stripe/verify-payment" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "POST /stripe/webhook" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    },
    "GET /stripe/session/{sessionId}" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    }
    "GET /metrics" = {
      integration = {
        type                   = "AWS_PROXY"
        uri                    = module.your_lambda.lambda_function_arn
        payload_format_version = "2.0"
        timeout_milliseconds   = 12000
      }
    }
  }

  tags = {
    Environment = "prod"
    Terraform   = "true"
  }
}