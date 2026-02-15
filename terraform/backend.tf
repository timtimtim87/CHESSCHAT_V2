terraform {
  backend "s3" {
    bucket       = "chesschat-tfstate-723580627470-us-east-1"
    key          = "dev/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
