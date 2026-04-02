# Dev Environment

This folder composes the AWS baseline for the backend-only `dev` environment.

## What it provisions

- VPC with one public subnet
- security group with SSH allowlist and public backend port
- EC2 instance with Elastic IP
- IAM role and instance profile
- private S3 uploads bucket
- backend ECR repository
- Secrets Manager secret containers
- Secrets Manager secret with local dev S3 access credentials

## What it does not do

- create secret values
- deploy application containers
- configure root-level production compose
- make the backend AWS-runtime-ready by itself

Note: the local dev S3 access secret is an exception and is managed by Terraform so a local backend can connect directly to AWS S3.

## Usage

```powershell
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file="terraform.tfvars"
```

Create `terraform.tfvars` from `terraform.tfvars.example` and fill in your real values.
