# Dev Environment

Use this folder when running Terraform locally for development.

Recommended workflow:
```
cd terraform
terraform init -reconfigure
terraform workspace new dev || terraform workspace select dev
terraform plan -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

Adjust `terraform.tfvars` values to match your project.
