# Infrastructure Plan

This folder is the source of truth for AWS infrastructure planning and implementation.

We intentionally split the work into two phases to avoid mirage plans:

- Phase A: Terraform AWS baseline
- Phase B: app deploy readiness after Terraform

## Current Reality

- The current deploy scope is backend-only.
- `frontend/` is out of deploy scope and is not yet aligned with the Go backend as a single production runtime.
- The current backend is not fully AWS-runtime-ready yet:
  - object storage is still wired through the MinIO adapter path
  - production-like compose orchestration is not yet defined at monorepo root
  - deploy automation and runtime secret rendering are not yet implemented

## Phase A: Terraform Baseline

Phase A is implemented entirely inside `infrastructure/terraform`.

Deliverables:

- VPC with one public subnet
- Internet Gateway and public routing
- Security group
- EC2 instance with Elastic IP
- IAM role and instance profile
- Private S3 uploads bucket
- Backend ECR repository
- Secrets Manager secret containers without secret values

Acceptance criteria:

- `terraform fmt -check` passes
- `terraform validate` passes in `terraform/envs/dev`
- `terraform plan` can render a backend-only AWS baseline
- SSH is limited to explicit CIDR allowlist
- Port `8080` is public
- Ports `5432`, `5672`, and `15672` are not public

Out of scope:

- frontend deploy
- Route53 / ACM / CloudFront
- API Gateway
- deploy scripts
- GitHub Actions deploy flow
- backend runtime code changes

## Phase B: App Deploy Readiness

Phase B is intentionally separate from Terraform.

Required follow-up changes outside `infrastructure/`:

1. Define a root-level `docker-compose.prod.yml` as the production-like source of truth for:
   - backend
   - postgres
   - rabbitmq
2. Add a production-ready backend config path for AWS runtime.
3. Replace hardcoded MinIO storage construction with provider-aware storage initialization so AWS S3 is a real runtime path.
4. Define a deploy script contract for:
   - pulling backend image from ECR
   - fetching runtime secrets from Secrets Manager
   - rendering env/config on EC2
   - running `docker compose -f docker-compose.prod.yml up -d`
5. Add GitHub Actions build/push/deploy workflow.
6. Re-check backend runtime CORS policy against the public EC2 endpoint.

Definition of done for Phase B:

- Backend can be deployed to EC2 from ECR.
- Backend can read secrets at deploy/runtime.
- Backend can use AWS S3 successfully.
- Backend is reachable on the EC2 public endpoint.
- Postgres and RabbitMQ remain internal-only.

## Mirage Risks

These are the main risks we are explicitly avoiding:

- S3 bucket exists, but backend still only behaves like MinIO runtime.
- RabbitMQ is provisioned, but application code does not actually use it in the intended MVP path.
- EC2 is bootstrapped, but no deploy automation exists yet.
- Public endpoint exists, but runtime config and CORS are not aligned.
