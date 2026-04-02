variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID."
  type        = string
}

variable "security_group_id" {
  description = "EC2 security group ID."
  type        = string
}

variable "instance_profile_name" {
  description = "IAM instance profile name."
  type        = string
}

variable "key_pair_name" {
  description = "SSH key pair name."
  type        = string
}

variable "backend_port" {
  description = "Backend public port."
  type        = number
}

variable "aws_region" {
  description = "AWS region for EC2 bootstrap."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
