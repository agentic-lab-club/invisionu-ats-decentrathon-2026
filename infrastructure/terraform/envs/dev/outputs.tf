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
  description = "Public backend endpoint."
  value       = "http://${module.ec2.public_ip}:${var.backend_port}"
}

output "frontend_origin_public_url" {
  description = "Direct frontend origin on the EC2 host."
  value       = "http://${module.ec2.public_ip}:${var.frontend_port}"
}

output "frontend_cloudfront_domain_name" {
  description = "CloudFront distribution domain for the frontend."
  value       = module.cloudfront_frontend.domain_name
}

output "frontend_cloudfront_url" {
  description = "CloudFront URL for the frontend."
  value       = "https://${module.cloudfront_frontend.domain_name}"
}

output "scraper_public_url" {
  description = "Public scraper endpoint on the EC2 host."
  value       = "http://${module.ec2.public_ip}:${var.scraper_public_port}"
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

output "compose_env_secret_name" {
  description = "Secrets Manager secret name containing the root .env.prod runtime file."
  value       = module.secrets.compose_env_secret_name
}

output "backend_config_secret_name" {
  description = "Secrets Manager secret name containing backend/config/config.prod.yaml."
  value       = module.secrets.backend_config_secret_name
}

output "local_s3_access_secret_name" {
  description = "Secrets Manager secret name containing local backend S3 access credentials."
  value       = module.local_s3_access.secret_name
}

output "local_s3_access_iam_username" {
  description = "IAM username used to generate local backend S3 access credentials."
  value       = module.local_s3_access.iam_username
}
