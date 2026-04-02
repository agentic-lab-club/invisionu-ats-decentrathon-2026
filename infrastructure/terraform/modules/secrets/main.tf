resource "aws_secretsmanager_secret" "backend" {
  name                    = var.backend_secret_name
  description             = "Backend runtime configuration for ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.backend_secret_name
  })
}

resource "aws_secretsmanager_secret" "postgres" {
  name                    = var.postgres_secret_name
  description             = "Postgres runtime configuration for ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.postgres_secret_name
  })
}

resource "aws_secretsmanager_secret" "rabbitmq" {
  name                    = var.rabbitmq_secret_name
  description             = "RabbitMQ runtime configuration for ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.rabbitmq_secret_name
  })
}
