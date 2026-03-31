variable "project_name" {
  description = "Project identifier."
  type        = string
  default     = "invisionu-ats"
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

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
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

variable "backend_secret_name" {
  description = "Secrets Manager name for backend runtime config."
  type        = string
  default     = "invisionu/dev/backend"
}

variable "postgres_secret_name" {
  description = "Secrets Manager name for Postgres runtime config."
  type        = string
  default     = "invisionu/dev/postgres"
}

variable "rabbitmq_secret_name" {
  description = "Secrets Manager name for RabbitMQ runtime config."
  type        = string
  default     = "invisionu/dev/rabbitmq"
}
