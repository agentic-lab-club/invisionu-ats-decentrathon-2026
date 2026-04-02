# Infrastructure

AWS infrastructure for the backend-only MVP lives here.

Current implementation scope:

- Terraform AWS baseline for `dev`
- backend-only runtime infrastructure
- explicit separation between provisioning and later app deploy work

Implemented provisioning target:

- VPC
- 1 public subnet
- Internet Gateway and routing
- security group
- EC2 with Elastic IP
- IAM role and instance profile
- private S3 uploads bucket
- backend ECR repository
- Secrets Manager secret containers
- dev-only Secrets Manager secret with local S3 access credentials

Not part of the current infrastructure implementation:

- frontend deploy
- Route53 / ACM / CloudFront
- API Gateway
- LLM / STT / Telegram bot deploy
- runtime deploy scripts and CI/CD wiring

See `PLAN.md` for the phase split and follow-up app deploy readiness work.


