variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "backend_secret_name" {
  description = "Secrets Manager name for backend runtime configuration."
  type        = string
}

variable "postgres_secret_name" {
  description = "Secrets Manager name for Postgres runtime configuration."
  type        = string
}

variable "rabbitmq_secret_name" {
  description = "Secrets Manager name for RabbitMQ runtime configuration."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
