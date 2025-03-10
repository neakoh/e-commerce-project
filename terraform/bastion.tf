module "your_ec2_instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"

  name = "bastion host"

  ami = "ami-0a590908f752db584" # AMI Name: PostgreSQL on Ubuntu 24.04 LTS
  instance_type          = "t2.micro"
  key_name               = "<your_key_name>"
  vpc_security_group_ids = [module.bastion_sg.security_group_id]
  subnet_id              = module.your_vpc.public_subnets[0]
  associate_public_ip_address = true

  tags = {
    Terraform   = "true"
    Environment = "prod"
  }
}