data "aws_caller_identity" "current" {} # Holds information about the current AWS user like account_id, user_id etc..

module "your_s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = "your_bucket_name"

  # S3 bucket-level Public Access Block configuration (by default now AWS has made this default as true for S3 bucket-level block public access)
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # S3 Bucket Ownership Controls
  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_ownership_controls
  control_object_ownership = true
  object_ownership         = "BucketOwnerPreferred"

  expected_bucket_owner                  = data.aws_caller_identity.current.account_id
  transition_default_minimum_object_size = "varies_by_storage_class"

  acl = "public-read" # "acl" conflicts with "grant" and "owner"

  versioning = {
    status     = true
    mfa_delete = true # Following best practices, Keep as true
  }

  website = {
    index_document = "index.html"
  }

}