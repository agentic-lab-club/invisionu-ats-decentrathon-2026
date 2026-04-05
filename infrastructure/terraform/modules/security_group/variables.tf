variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "vpc_id" {
  description = "Target VPC ID."
  type        = string
}

variable "backend_port" {
  description = "Public backend port."
  type        = number
}

variable "frontend_port" {
  description = "Public frontend port."
  type        = number
}

variable "scraper_public_port" {
  description = "Public scraper port."
  type        = number
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to reach SSH."
  type        = list(string)
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
