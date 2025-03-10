module "your_rds" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "your_rds_identifier"

  engine                  = "postgres"
  engine_version          = "14"
  family                  = "postgres14"
  major_engine_version    = "14" 
  instance_class          = "db.t4g.micro"
  allocated_storage       = 10
  multi_az                = false

  db_name  = "your_db_name"
  username = "your_db_username"
  port     = 5432

  // Password Rotation
  manage_master_user_password_rotation              = true
  master_user_password_rotate_immediately           = false
  master_user_password_rotation_schedule_expression = "rate(7 days)"

  // Load from snapshot
  snapshot_identifier = length(data.aws_db_snapshot.existing_snapshots.id) > 0 ? data.aws_db_snapshot.existing_snapshots.id : null
  skip_final_snapshot = false

  // VPC
  db_subnet_group_name = aws_db_subnet_group.your_subnet_group.name
  vpc_security_group_ids = [module.rds_sg.security_group_id]

  // SSL
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  tags = {
    Owner       = "owner"
    Environment = "prod"
  }

}

resource "aws_db_subnet_group" "your_rds_subnet_group" {
  name       = "rds-subnet-group"
  subnet_ids = [module.your_vpc.private_subnets[0], module.your_vpc.private_subnets[1]] 

  tags = {
    Name = "rds-subnet-group"
  }
}
data "aws_db_snapshot" "existing_snapshots" {
  db_instance_identifier = "your_db_identifier"
  most_recent            = true
}

