output "compose_env_secret_arn" {
  description = "Root .env.prod secret ARN."
  value       = aws_secretsmanager_secret.compose_env.arn
}

output "backend_config_secret_arn" {
  description = "Backend config.prod.yaml secret ARN."
  value       = aws_secretsmanager_secret.backend_config.arn
}

output "compose_env_secret_name" {
  description = "Root .env.prod secret name."
  value       = aws_secretsmanager_secret.compose_env.name
}

output "backend_config_secret_name" {
  description = "Backend config.prod.yaml secret name."
  value       = aws_secretsmanager_secret.backend_config.name
}
