terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.46"
    }
  }

  backend "s3" {
    bucket         = "your_s3_bucket"
    key            = "terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "your_dynamodb_table"
    encrypt        = true
  }
}
provider "aws" {
  region = "eu-west-2"
}
