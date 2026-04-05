locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Application = var.application_name
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Scope       = "ec2-compose-platform"
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

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  backend_port        = var.backend_port
  frontend_port       = var.frontend_port
  scraper_public_port = var.scraper_public_port
  ssh_allowed_cidrs   = var.ssh_allowed_cidrs
  tags                = local.common_tags
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

  name_prefix                = local.name_prefix
  compose_env_secret_name    = var.compose_env_secret_name
  backend_config_secret_name = var.backend_config_secret_name
  tags                       = local.common_tags
}

module "iam" {
  source = "../../modules/iam"

  name_prefix         = local.name_prefix
  ecr_repository_arn  = module.ecr.repository_arn
  uploads_bucket_arn  = module.s3.bucket_arn
  runtime_secret_arns = [
    module.secrets.compose_env_secret_arn,
    module.secrets.backend_config_secret_arn,
  ]
  tags = local.common_tags
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

module "cloudfront_frontend" {
  source = "../../modules/cloudfront_frontend"

  name_prefix        = local.name_prefix
  origin_domain_name = module.ec2.public_dns
  origin_http_port  = var.frontend_port
  tags              = local.common_tags
}
