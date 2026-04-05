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

variable "runtime_secret_arns" {
  description = "Secrets Manager ARNs the EC2 runtime can read."
  type        = list(string)
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
