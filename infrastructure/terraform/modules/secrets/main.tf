resource "aws_secretsmanager_secret" "compose_env" {
  name                    = var.compose_env_secret_name
  description             = "Rendered root .env.prod for the EC2 compose stack on ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.compose_env_secret_name
  })
}

resource "aws_secretsmanager_secret" "backend_config" {
  name                    = var.backend_config_secret_name
  description             = "Rendered backend/config/config.prod.yaml for ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.backend_config_secret_name
  })
}
