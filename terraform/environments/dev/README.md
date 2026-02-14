# Dev Environment

Use this folder when running Terraform locally for development.

Recommended workflow:
```
cd terraform
terraform init \
  -backend-config="region=us-east-1" \
  -backend-config="bucket=your-bucket" \
  -backend-config="key=envs/dev/terraform.tfstate"
terraform workspace new dev || terraform workspace select dev
terraform plan -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

Adjust `terraform.tfvars` values to match your project.
