data "aws_iam_policy_document" "bucket_access" {
  statement {
    sid    = "BucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [var.bucket_arn]
  }

  statement {
    sid    = "BucketObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.bucket_arn}/*"]
  }
}

resource "aws_iam_user" "this" {
  name = "${var.name_prefix}-local-s3"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-local-s3"
  })
}

resource "aws_iam_user_policy" "this" {
  name   = "${var.name_prefix}-local-s3-bucket-access"
  user   = aws_iam_user.this.name
  policy = data.aws_iam_policy_document.bucket_access.json
}

resource "aws_iam_access_key" "this" {
  user = aws_iam_user.this.name
}

resource "aws_secretsmanager_secret" "this" {
  name                    = var.secret_name
  description             = "Local backend S3 access for ${var.name_prefix}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = var.secret_name
  })
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id = aws_secretsmanager_secret.this.id
  secret_string = jsonencode({
    provider          = "s3"
    region            = var.aws_region
    bucket            = var.bucket_name
    use_ssl           = true
    access_key_id     = aws_iam_access_key.this.id
    secret_access_key = aws_iam_access_key.this.secret
  })
}
