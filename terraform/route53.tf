data "aws_route53_zone" "your_route53_zone" {
  name = var.domain_name
}

module "records" {
  source  = "terraform-aws-modules/route53/aws//modules/records"
  version = "~> 3.0"

  zone_name = data.aws_route53_zone.your_route53_zone.name

  records = [
    {
      name    = "" 
      type    = "A"
      alias   = {
        name    = module.your_cloudfront_distribution.cloudfront_distribution_domain_name
        zone_id = module.your_cloudfront_distribution.cloudfront_distribution_hosted_zone_id
      }
    }
  ]

  depends_on = [module.your_cloudfront_distribution]
}
