module "your_vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "your_vpc_name"
  cidr = "192.168.0.0/16"

  azs             = ["eu-west-2a", "eu-west-2b"]
  private_subnets = ["192.168.8.0/24", "192.168.9.0/24"]
  public_subnets = ["192.168.6.0/24", "192.168.7.0/24"]

  create_database_subnet_group = true

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Terraform   = "true"
    Environment = "prod"
  }
}

module "endpoints" {
  source = "terraform-aws-modules/vpc/aws//modules/vpc-endpoints"

  vpc_id = module.your_vpc.vpc_id

  endpoints = {
    s3 = {
      service            = "s3"
      service_type       = "Gateway"
      route_table_ids    = flatten([module.your_vpc.private_route_table_ids])
      security_group_ids = [module.endpoints_sg.security_group_id]
      policy             = data.aws_iam_policy_document.generic_endpoint_policy.json
      tags               = { Name = "s3-gateway-endpoint" }
    },
    secrets_manager = {
      service             = "secretsmanager"
      private_dns_enabled = true
      security_group_ids  = [module.endpoints_sg.security_group_id]
      subnet_ids          = [module.your_vpc.private_subnets[0], module.your_vpc.private_subnets[1]]
      policy              = data.aws_iam_policy_document.secretsmanager_endpoint_policy.json
      tags                = { Name = "secrets-manager-endpoint" }
    },
    logs = {
      service             = "logs"
      private_dns_enabled = true
      security_group_ids  = [module.endpoints_sg.security_group_id]
      subnet_ids          = [module.your_vpc.private_subnets[0], module.your_vpc.private_subnets[1]]
      policy              = data.aws_iam_policy_document.generic_endpoint_policy.json
      tags                = { Name = "cloudwatch-logs-endpoint" }
    },
    ses = {
      service             = "email-smtp"
      private_dns_enabled = true
      security_group_ids  = [module.endpoints_sg.security_group_id]
      subnet_ids          = [module.your_vpc.private_subnets[0], module.your_vpc.private_subnets[1]]
      policy              = null  
      tags                = { Name = "ses-smtp-endpoint" }
    },
  }
}

data "aws_iam_policy_document" "generic_endpoint_policy" {
  statement {
    effect    = "Allow"
    actions   = ["*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}

data "aws_iam_policy_document" "secretsmanager_endpoint_policy" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}