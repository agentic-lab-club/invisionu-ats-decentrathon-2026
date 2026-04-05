variable "name_prefix" {
  description = "Prefix used for resource naming."
  type        = string
}

variable "compose_env_secret_name" {
  description = "Secrets Manager name for the rendered root .env.prod runtime file."
  type        = string
}

variable "backend_config_secret_name" {
  description = "Secrets Manager name for the rendered backend config.prod.yaml runtime file."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
