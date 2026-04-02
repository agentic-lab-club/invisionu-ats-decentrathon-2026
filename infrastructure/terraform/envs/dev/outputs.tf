output "ec2_instance_id" {
  description = "Backend EC2 instance ID."
  value       = module.ec2.instance_id
}

output "ec2_public_ip" {
  description = "Elastic IP attached to the backend EC2 instance."
  value       = module.ec2.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS for the backend EC2 instance."
  value       = module.ec2.public_dns
}

output "backend_public_url" {
  description = "Public backend endpoint placeholder."
  value       = "http://${module.ec2.public_ip}:${var.backend_port}"
}

output "uploads_bucket_name" {
  description = "Uploads S3 bucket name."
  value       = module.s3.bucket_name
}

output "uploads_bucket_regional_domain_name" {
  description = "Regional S3 bucket domain name for direct backend configuration."
  value       = module.s3.bucket_regional_domain_name
}

output "uploads_bucket_endpoint" {
  description = "AWS S3-compatible endpoint host for the uploads bucket."
  value       = module.s3.bucket_regional_domain_name
}

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL."
  value       = module.ecr.repository_url
}

output "backend_secret_name" {
  description = "Backend Secrets Manager secret name."
  value       = module.secrets.backend_secret_name
}

output "postgres_secret_name" {
  description = "Postgres Secrets Manager secret name."
  value       = module.secrets.postgres_secret_name
}

output "rabbitmq_secret_name" {
  description = "RabbitMQ Secrets Manager secret name."
  value       = module.secrets.rabbitmq_secret_name
}

output "local_s3_access_secret_name" {
  description = "Secrets Manager secret name containing local backend S3 access credentials."
  value       = module.local_s3_access.secret_name
}

output "local_s3_access_iam_username" {
  description = "IAM username used to generate local backend S3 access credentials."
  value       = module.local_s3_access.iam_username
}
