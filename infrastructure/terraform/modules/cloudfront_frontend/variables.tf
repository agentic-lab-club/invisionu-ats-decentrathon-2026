variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "origin_domain_name" {
  description = "EC2 public DNS name used as the CloudFront origin."
  type        = string
}

variable "origin_http_port" {
  description = "HTTP port exposed by the frontend origin."
  type        = number
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
