variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "bucket_name" {
  description = "Uploads bucket name."
  type        = string
}

variable "bucket_arn" {
  description = "Uploads bucket ARN."
  type        = string
}

variable "aws_region" {
  description = "AWS region for the bucket."
  type        = string
}

variable "secret_name" {
  description = "Secrets Manager name for local S3 access credentials."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
