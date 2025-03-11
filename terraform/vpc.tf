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
