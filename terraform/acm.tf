provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "your_acm" {
  source  = "terraform-aws-modules/acm/aws"
  version = "~> 4.0"

  providers = {
    aws = aws.us_east_1
  }

  domain_name  = var.domain_name
  zone_id      = data.aws_route53_zone.your_route_53_zone.zone_id

  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.domain_name}"
  ]

  wait_for_validation = true

  tags = {
    Name = var.domain_name
    Environment = "prod"
  }
}