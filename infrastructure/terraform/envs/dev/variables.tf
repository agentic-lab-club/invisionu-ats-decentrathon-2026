variable "project_name" {
  description = "Project identifier."
  type        = string
  default     = "invisionu-ats"
}

variable "application_name" {
  description = "AWS Application tag used to group all project resources."
  type        = string
  default     = "invisionu-platform"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "availability_zone" {
  description = "Availability zone for the public subnet."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.20.1.0/24"
}

variable "backend_port" {
  description = "Public backend port."
  type        = number
  default     = 8080
}

variable "frontend_port" {
  description = "Public frontend port and CloudFront origin port."
  type        = number
  default     = 3000
}

variable "scraper_public_port" {
  description = "Public scraper port on the EC2 host."
  type        = number
  default     = 9432
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "m7i-flex.large"
}

variable "key_pair_name" {
  description = "Existing AWS EC2 key pair name."
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDR allowlist for SSH."
  type        = list(string)
}

variable "uploads_bucket_name" {
  description = "Globally unique S3 bucket name for uploads."
  type        = string
}

variable "backend_ecr_repo_name" {
  description = "ECR repository name for backend images."
  type        = string
  default     = "invisionu-ats/backend"
}

variable "compose_env_secret_name" {
  description = "Secrets Manager name for the root .env.prod runtime file."
  type        = string
  default     = "invisionu/dev/.env.prod"
}

variable "backend_config_secret_name" {
  description = "Secrets Manager name for backend/config/config.prod.yaml."
  type        = string
  default     = "invisionu/dev/backend/config.prod.yaml"
}

variable "local_s3_access_secret_name" {
  description = "Secrets Manager name for local backend S3 access credentials."
  type        = string
  default     = "invisionu/dev/local-s3-access"
}
