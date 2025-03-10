// ==================================================================
// ========================= Lambda =================================
// ==================================================================

module "lambda_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "lambda-sg"
  description = "Lambda Security Rules"
  vpc_id      = module.your_vpc.vpc_id

  // Egress - Allowing all traffic into the VPC 
  egress_with_cidr_blocks = [
    {
      from_port   = -1
      to_port     = -1
      protocol    = "-1"
      description = "Allow all egress everywhere"
      cidr_blocks = "0.0.0.0/0"
    },
  ]

  ingress_with_source_security_group_id = [
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.rds_sg.security_group_id
      description              = "Allow ingress mysql traffic from rds"
    },
    {
      rule                     = "https-443-tcp"
      source_security_group_id = module.endpoints_sg.security_group_id
      description              = "Allow ingress traffic from endpoints"
    },
  ]
}

// ==================================================================
// ======================= Endpoints ================================
// ==================================================================

module "endpoints_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "endpoints-sg"
  description = "Endpoint traffic config"
  vpc_id      = module.your_vpc.vpc_id

  // Egress - Allowing all traffic into the VPC 
  egress_with_cidr_blocks = [
    {
      from_port   = -1
      to_port     = -1
      protocol    = "-1"
      description = "Allow all egress everywhere"
      cidr_blocks = "0.0.0.0/0"
    },
  ]
  
  ingress_with_source_security_group_id = [
    {
      rule                     = "https-443-tcp"
      source_security_group_id = module.lambda_sg.security_group_id
      description              = "Allow ingress from lambda function"
    }
  ]
}

// ==================================================================
// =========================== RDS ==================================
// ==================================================================

module "rds_sg" {
  source = "terraform-aws-modules/security-group/aws"
  name        = "rds-sg"
  description = "RDS security rules"
  vpc_id      = module.your_vpc.vpc_id


  // Egress - Allowing all traffic into the VPC 
  egress_with_cidr_blocks = [
    {
      from_port   = -1
      to_port     = -1
      protocol    = "-1"
      description = "Allow all egress everywhere"
      cidr_blocks = "0.0.0.0/0"
    },
  ]

      // Ingress - Allow PostgreSQL traffic from backend containers 
  ingress_with_source_security_group_id = [
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.bastion_sg.security_group_id
      description              = "Allow ingress mysql traffic from bastion"
    },
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.lambda_sg.security_group_id
      description              = "Allow ingress mysql traffic from lambda"
    },
  ]
}

// ==================================================================
// ======================= Endpoints ================================
// ==================================================================

module "bastion_sg" {
  source = "terraform-aws-modules/security-group/aws"
  name        = "bastion-sg"
  description = "Bastion traffic config"
  vpc_id      = module.your_vpc.vpc_id

  // Egress - Allowing all traffic into the VPC 
  egress_with_cidr_blocks = [
    {
      from_port   = -1
      to_port     = -1
      protocol    = "-1"
      description = "Allow all egress everywhere"
      cidr_blocks = "0.0.0.0/0"
    },
  ]
  ingress_with_cidr_blocks = [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      description = "Allow ssh from my IP"
      cidr_blocks = "your_ip"
    },
  ]
    // Ingress - Allow PostgreSQL traffic from backend containers 
  ingress_with_source_security_group_id = [
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.rds_sg.security_group_id
      description              = "Allow ingress mysql traffic from your ip"
    },
  ]
}