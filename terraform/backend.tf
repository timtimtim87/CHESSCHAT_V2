terraform {
  # Partial backend configuration. Provide bucket/key/table at init time:
  # terraform init -reconfigure -backend-config="bucket=..." -backend-config="key=..." -backend-config="region=us-east-1" -backend-config="dynamodb_table=..." -backend-config="encrypt=true"
  backend "s3" {}
}
