output "secret_name" {
  description = "Secrets Manager name containing local S3 access credentials."
  value       = aws_secretsmanager_secret.this.name
}

output "secret_arn" {
  description = "Secrets Manager ARN containing local S3 access credentials."
  value       = aws_secretsmanager_secret.this.arn
}

output "iam_username" {
  description = "IAM username for local S3 access."
  value       = aws_iam_user.this.name
}
