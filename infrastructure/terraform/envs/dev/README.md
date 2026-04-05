# Dev Environment

This folder composes the AWS baseline for the single-host `dev` demo environment.

## What It Provisions

- VPC with one public subnet
- security group with SSH allowlist and public ports:
  - frontend `3000`
  - backend `8080`
  - scraper `9432`
- EC2 instance with Elastic IP
- IAM role and instance profile
- private S3 uploads bucket
- backend ECR repository
- Secrets Manager secret containers for:
  - root `.env.prod`
  - `backend/config/config.prod.yaml`
- CloudFront distribution for the frontend
- Secrets Manager secret with local dev S3 access credentials

## What It Does Not Do

- create the real runtime secret values
- clone the repository onto EC2
- run `docker compose` automatically
- provision a custom domain, ACM certificate, or Route53 records

## Usage

Create `terraform.tfvars` from `terraform.tfvars.example`, then run:

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

After apply:

1. fill the two Secrets Manager secrets with your real file contents
2. SSH into EC2
3. clone the repo
4. run `./infrastructure/scripts/deploy_compose.sh`
