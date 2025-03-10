# Lambda configuration using the AWS Lambda module
module "your_lambda_function" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 6.0"

  function_name = "your-lambda-function-id"
  description   = "your lambda function description"
  handler       = "handler.handler"
  runtime       = "nodejs18.x"
  publish       = true

  source_path = [{
    path             = "../backend/api"
    npm_requirements = true  # This ensures npm install is run
    artifacts_dir    = "builds/lambda"
  }]

  depends_on = [module.your_vpc, module.lambda_sg]
  # Memory and timeout settings - adjust based on your needs
  memory_size = 1024
  timeout     = 30

  # Environment variables
  environment_variables = {
    DB_HOST = module.your_rds.db_instance_endpoint
    DB_SECRET_ARN = module.your_rds.db_instance_master_user_secret_arn
    DB = module.your_rds.db_instance
    STRIPE_SECRET_ARN = "your_stripe_secret_arn"
    STRIPE_PK = "your_stripe_pk"
    ADMIN_SECRET_ARN = "your_admin_password_secret_arn"
    SES_FROM_EMAIL = "your_ses_email_address"
    GRAFANA_BEARER_TOKEN = "your_grafana_bearer_token"
    JWT_SECRET_ARN = "your_jwt_secret_arn"
  }

  # Allow Lambda to create CloudWatch logs
  attach_cloudwatch_logs_policy = true
  
  attach_policy_statements = true
  policy_statements = {
    s3 = {
      effect = "Allow",
      actions = [
        "s3:GetObject",
        "s3:PutObject"
      ],
      resources = [
        module.your_s3_bucket.s3_bucket_arn
      ]
    },
    secretsmanager = {
      effect = "Allow",
      actions = [
        "secretsmanager:GetSecretValue"
      ],
      resources = [
        "your_secret_arn"
      ]
    }    
    logs = {
      effect = "Allow",
      actions = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources = [
        "your_log_group_arn"
      ]
    }, 
    rds-db = {
      effect = "Allow",
      actions = [
        "rds-db:connect",
      ],
      resources = [
        module.your_rds.db_instance_arn
      ]
    }    
    ses = {
      effect = "Allow",
      actions = [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      resources = [
        "your_ses_identity_arn"
      ]
    },
    ec2_network_interface = {
      effect = "Allow",
      actions = [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      resources = ["*"]
    },
    api_gateway = {
      effect = "Allow",
      actions = [
        "execute-api:Invoke",
      ],
      resources = [
        "${module.api_gateway.api_execution_arn}/*/*/*"
      ]
    }
  }

  allowed_triggers = {
    AllowExecutionFromAPIGateway = {
      service    = "apigateway"
      source_arn = "${module.your_api_gateway.api_execution_arn}/*/*/*"
    }
  }

  vpc_subnet_ids         = module.your_vpc.private_subnets
  vpc_security_group_ids = [module.lambda_sg.security_group_id]

  tags = {
    Environment = "prod"
  }
}

# Generate secure random token for Prometheus metrics endpoint
resource "random_password" "metrics_token" {
  length  = 64
  special = false
}

# Lambda Execution Role
resource "aws_iam_role" "your_execution_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}
