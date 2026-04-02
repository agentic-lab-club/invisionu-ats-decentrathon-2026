# Terraform AWS Baseline

This directory contains the Terraform implementation for the backend-only AWS MVP baseline.

Layout:

- `envs/dev` - root composition for the `dev` environment
- `modules/vpc`
- `modules/security_group`
- `modules/iam`
- `modules/ec2`
- `modules/ecr`
- `modules/s3`
- `modules/secrets`
- `modules/local_s3_access`

Notes:

- Terraform state is local for now.
- Secrets Manager secret values are intentionally not managed by Terraform.
- Exception: local dev S3 access credentials are managed via Terraform and stored in Secrets Manager for local backend development.
- This layer provisions infrastructure only; it does not make the backend deployable by itself.
