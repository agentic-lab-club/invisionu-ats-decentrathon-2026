locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Scope       = "backend-only-mvp"
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  public_subnet_cidr = var.public_subnet_cidr
  availability_zone  = var.availability_zone
  tags               = local.common_tags
}

module "security_group" {
  source = "../../modules/security_group"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  backend_port      = var.backend_port
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
  tags              = local.common_tags
}

module "s3" {
  source = "../../modules/s3"

  bucket_name = var.uploads_bucket_name
  tags        = local.common_tags
}

module "ecr" {
  source = "../../modules/ecr"

  repository_name = var.backend_ecr_repo_name
  tags            = local.common_tags
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix          = local.name_prefix
  backend_secret_name  = var.backend_secret_name
  postgres_secret_name = var.postgres_secret_name
  rabbitmq_secret_name = var.rabbitmq_secret_name
  tags                 = local.common_tags
}

module "iam" {
  source = "../../modules/iam"

  name_prefix         = local.name_prefix
  ecr_repository_arn  = module.ecr.repository_arn
  uploads_bucket_arn  = module.s3.bucket_arn
  backend_secret_arn  = module.secrets.backend_secret_arn
  postgres_secret_arn = module.secrets.postgres_secret_arn
  rabbitmq_secret_arn = module.secrets.rabbitmq_secret_arn
  tags                = local.common_tags
}

module "local_s3_access" {
  source = "../../modules/local_s3_access"

  name_prefix = local.name_prefix
  bucket_name = module.s3.bucket_name
  bucket_arn  = module.s3.bucket_arn
  aws_region  = var.aws_region
  secret_name = var.local_s3_access_secret_name
  tags        = local.common_tags
}

module "ec2" {
  source = "../../modules/ec2"

  name_prefix           = local.name_prefix
  instance_type         = var.instance_type
  subnet_id             = module.vpc.public_subnet_id
  security_group_id     = module.security_group.security_group_id
  instance_profile_name = module.iam.instance_profile_name
  key_pair_name         = var.key_pair_name
  backend_port          = var.backend_port
  aws_region            = var.aws_region
  tags                  = local.common_tags
}
