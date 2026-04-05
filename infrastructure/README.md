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

3. After apply, note these outputs first and save them somewhere:
   - `ec2_public_ip`
   - `frontend_cloudfront_url`
   - `uploads_bucket_name`
   - `uploads_bucket_endpoint`
   - `uploads_bucket_regional_domain_name`
   - `local_s3_access_secret_name`
   - `compose_env_secret_name`
   - `backend_config_secret_name`
4. Open AWS Console Management and go to AWS Secrets Manager:
   - open `local_s3_access_secret_name`
   - copy the generated S3 credentials from that secret
   - paste them into the `storage` section of [`backend/config/config.prod.yaml`](/workspaces/invisionu-ats-decentrathon-2026/backend/config/config.prod.yaml)
   - use the Terraform outputs for:
     - `storage.bucket` = `uploads_bucket_name`
     - `storage.endpoint` = `uploads_bucket_endpoint`
     - `storage.region` = your Terraform AWS region
     - `storage.access_key` and `storage.secret_key` = values from the AWS Secrets Manager secret
     - `storage.use_ssl` = `true`
5. In AWS Secrets Manager, add the runtime file secret values:
   - `compose_env_secret_name`: full contents of root `.env.prod`
   - `backend_config_secret_name`: full contents of `backend/config/config.prod.yaml`
6. SSH to the EC2 host and clone the repo into `/opt/invisionu-ats/app`.
7. Export the runtime variables on the EC2 host:

```bash
export AWS_REGION="your-region"
export COMPOSE_ENV_SECRET_NAME="invisionu/dev/.env.prod"
export BACKEND_CONFIG_SECRET_NAME="invisionu/dev/backend/config.prod.yaml"
```

8. Deploy the stack:

```bash
cd /opt/invisionu-ats/app
./infrastructure/scripts/deploy_compose.sh
```

9. To destroy the Infrastructure: `terraform destroy`

## If User Data Did Not Run On An Existing EC2

If the EC2 instance was already created before the fixed `user_data` was applied, Terraform will not magically rerun the old first-boot cloud-init logic on that same machine.

Use one of these two recovery paths:

### Fastest: bootstrap the current EC2 manually

SSH into the existing host, clone the repo if needed, then run:

```bash
cd /opt/invisionu-ats/app
sudo bash infrastructure/scripts/bootstrap_existing_ec2.sh
```

Then verify:

```bash
docker --version
docker compose version
git --version
ohmyzsh
```

### Cleanest: recreate the EC2 so cloud-init runs again

From `infrastructure/terraform/envs/dev`:

```bash
terraform apply -replace="module.ec2.aws_instance.this" -var-file="terraform.tfvars"
```

This recreates the EC2 instance and reruns `user_data` on first boot. The Terraform module is now configured with `user_data_replace_on_change = true`, so future `user_data` changes will trigger instance replacement instead of silently doing nothing.

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

## S3 Backend Config Wiring

Before you deploy the backend, make sure the backend production config is updated with the S3 values created by Terraform.

Order:

1. run Terraform and save the S3 outputs
2. open `local_s3_access_secret_name` in AWS Secrets Manager
3. copy the generated access key and secret key
4. paste those values into [`backend/config/config.prod.yaml`](/workspaces/invisionu-ats-decentrathon-2026/backend/config/config.prod.yaml)
5. then upload that final YAML file content into `backend_config_secret_name`

Important:

- the actual backend config file in this repo is `backend/config/config.prod.yaml`
- if you were thinking of `config.prod.env`, use the YAML file instead because that is what the backend currently loads

### Regenerate S3 Credentials

If you need to rotate or regenerate the local S3 credentials stored in AWS Secrets Manager, run this from `infrastructure/terraform/envs/dev`:

```bash
terraform apply -replace="module.local_s3_access.aws_iam_access_key.this" -var-file="terraform.tfvars"
```

Then:

1. note `local_s3_access_secret_name`
2. open that secret in AWS Secrets Manager
3. copy the new `access_key_id` and `secret_access_key`
4. paste them into [`backend/config/config.prod.yaml`](/workspaces/invisionu-ats-decentrathon-2026/backend/config/config.prod.yaml)
5. update the runtime secret `backend_config_secret_name` with the new YAML content

If you want to recreate the whole IAM user too, run:

```bash
terraform apply \
  -replace="module.local_s3_access.aws_iam_user.this" \
  -replace="module.local_s3_access.aws_iam_access_key.this" \
  -var-file="terraform.tfvars"
```

## Scripts

Scripts for the EC2 deployment flow live under [`infrastructure/scripts`](./scripts):

- `render_runtime_secrets.sh` fetches the two Secrets Manager values and writes runtime files under `/opt/invisionu-ats/runtime`
- `deploy_compose.sh` renders secrets and runs the root `docker-compose.prod.yml`

## Notes

- The EC2 bootstrap (user_data) installs Docker, Docker Compose, Git, Zsh, and Oh My Zsh.
- CloudFront uses the EC2 frontend service as an HTTP origin and exposes a generic `*.cloudfront.net` URL.
- This is a pragmatic demo stack, not a hardened production platform yet.
