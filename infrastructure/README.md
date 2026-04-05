# Infrastructure

AWS infrastructure and deployment helpers for the monorepo live here.

Current target:

- one Ubuntu EC2 host for the full demo stack
- Docker Compose deployment from the monorepo root (docker-compose.prod.yml)
- frontend available both on direct EC2 port `3000` and a generated CloudFront URL
- backend API on direct EC2 port `8080`
- scraper API on direct EC2 port `9432`
- runtime secrets rendered from AWS Secrets Manager into files on the host

## Quickstart

1. Prepare `infrastructure/terraform/envs/dev/terraform.tfvars` from `terraform.tfvars.example`.
    To get public/external IP of your machine/PC for aws_security_group SSH Allow CIDR's range do (on changes do `terraform apply`):
      - Powershell/Windows: `"$((Invoke-RestMethod -Uri 'https://checkip.amazonaws.com').Trim())/32"`
      - Bash/Linux: `printf '%s/32\n' "$(curl -s https://checkip.amazonaws.com)"`
2. Run Terraform from `infrastructure/terraform/envs/dev`:

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

3. After apply, note these outputs:
   - `ec2_public_ip`
   - `frontend_cloudfront_url`
   - `compose_env_secret_name`
   - `backend_config_secret_name`
4. In AWS Secrets Manager, add the secret values:
   - `compose_env_secret_name`: full contents of root `.env.prod`
   - `backend_config_secret_name`: full contents of `backend/config/config.prod.yaml`
5. SSH to the EC2 host and clone the repo into `/opt/invisionu-ats/app`.
6. Export the runtime variables on the EC2 host:

```bash
export AWS_REGION="your-region"
export COMPOSE_ENV_SECRET_NAME="invisionu/dev/.env.prod"
export BACKEND_CONFIG_SECRET_NAME="invisionu/dev/backend/config.prod.yaml"
```

7. Deploy the stack:

```bash
cd /opt/invisionu-ats/app
./infrastructure/scripts/deploy_compose.sh
```

## What Terraform Provisions

- VPC with one public subnet
- Internet Gateway and public route table
- security group with SSH allowlist and public ports for frontend, backend, and scraper
- EC2 instance with Elastic IP
- EC2 bootstrap via `user_data`
- IAM role and instance profile
- private S3 uploads bucket
- backend ECR repository
- two runtime Secrets Manager containers
- CloudFront distribution for the frontend origin on EC2
- dev-only local S3 access secret for local backend development

## Runtime Secret Model

The AWS runtime now uses two deploy-time secrets:

- `invisionu/dev/.env.prod`
  - one file for `docker-compose.prod.yml`
  - shared by ATS, RAG bot, and scraper stack variables
- `invisionu/dev/backend/config.prod.yaml`
  - one file for the backend production YAML config

Terraform creates the secret containers only. It does not write the real production values into them.

## Scripts

Scripts for the EC2 deployment flow live under [`infrastructure/scripts`](./scripts):

- `render_runtime_secrets.sh` fetches the two Secrets Manager values and writes runtime files under `/opt/invisionu-ats/runtime`
- `deploy_compose.sh` renders secrets and runs the root `docker-compose.prod.yml`

## Notes

- The EC2 bootstrap (user_data) installs Docker, Docker Compose, Git, Zsh, and Oh My Zsh.
- CloudFront uses the EC2 frontend service as an HTTP origin and exposes a generic `*.cloudfront.net` URL.
- This is a pragmatic demo stack, not a hardened production platform yet.
