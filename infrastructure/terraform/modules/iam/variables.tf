variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "ecr_repository_arn" {
  description = "ECR repository ARN."
  type        = string
}

variable "uploads_bucket_arn" {
  description = "Uploads bucket ARN."
  type        = string
}

variable "backend_secret_arn" {
  description = "Backend secret ARN."
  type        = string
}

variable "postgres_secret_arn" {
  description = "Postgres secret ARN."
  type        = string
}

variable "rabbitmq_secret_arn" {
  description = "RabbitMQ secret ARN."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
