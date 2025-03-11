module "your_cloudfront_distribution" {
  source = "terraform-aws-modules/cloudfront/aws"

  aliases = [var.domain_name, "www.${var.domain_name}"]

  enabled             = true
  retain_on_delete    = false
  wait_for_deployment = false
  default_root_object = "index.html"
  web_acl_id          = aws_wafv2_web_acl.cloudfront_waf.arn

  origin = {
    your_origin_name = {
      domain_name = module.your_s3_bucket.s3_bucket_bucket_regional_domain_name
    }
  }

  default_cache_behavior = {
    target_origin_id           = "your_target_origin_id" # Same as whatever 'your_origin_name' is above
    viewer_protocol_policy     = "redirect-to-https"

    allowed_methods = ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true
    query_string    = true
  }

  viewer_certificate = {
    acm_certificate_arn      = module.your_acm_name.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = "prod"
  }
}