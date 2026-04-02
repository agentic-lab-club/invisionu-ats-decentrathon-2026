output "backend_secret_arn" {
  description = "Backend secret ARN."
  value       = aws_secretsmanager_secret.backend.arn
}

output "postgres_secret_arn" {
  description = "Postgres secret ARN."
  value       = aws_secretsmanager_secret.postgres.arn
}

output "rabbitmq_secret_arn" {
  description = "RabbitMQ secret ARN."
  value       = aws_secretsmanager_secret.rabbitmq.arn
}

output "backend_secret_name" {
  description = "Backend secret name."
  value       = aws_secretsmanager_secret.backend.name
}

output "postgres_secret_name" {
  description = "Postgres secret name."
  value       = aws_secretsmanager_secret.postgres.name
}

output "rabbitmq_secret_name" {
  description = "RabbitMQ secret name."
  value       = aws_secretsmanager_secret.rabbitmq.name
}
