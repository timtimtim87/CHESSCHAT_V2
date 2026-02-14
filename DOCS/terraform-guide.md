# Terraform Guide — ChessChat V2

This guide explains how Terraform works, why each piece exists, and the exact workflow you'll follow to manage your AWS infrastructure.

---

## What Terraform Actually Does

Terraform is a tool that lets you describe your infrastructure in code (`.tf` files), and then it figures out what needs to be created, changed, or destroyed in AWS to match what you wrote.

The core loop is:

1. **You write** `.tf` files describing what you want (e.g., "I want a VPC with two subnets").
2. **`terraform plan`** compares your `.tf` files against what currently exists in AWS and shows you a diff — what it would add, change, or destroy.
3. **`terraform apply`** executes the plan and makes the changes in AWS.
4. **Terraform records** everything it created in a **state file** so it knows what it's managing.

That state file is the key concept. Without it, Terraform wouldn't know whether a resource already exists or needs to be created. It's essentially Terraform's memory.

---

## Why You Need an S3 Bucket and DynamoDB Table

Before you can use Terraform for real work, you need somewhere to store that state file. You have two options:

| Option | How it works | Problem |
|--------|-------------|---------|
| **Local state** (default) | State file lives on your laptop as `terraform.tfstate` | If you lose your laptop, switch machines, or a teammate runs Terraform, the state is gone or out of sync. |
| **Remote state** (what you set up) | State file lives in an S3 bucket | Anyone on the team (or you from any machine) can access the same state. |

**The S3 bucket** stores the state file itself. Think of it as a shared hard drive for Terraform's memory.

**The DynamoDB table** provides **state locking**. When you run `terraform apply`, it writes a lock to this table. If someone else (or another terminal) tries to run `apply` at the same time, they'll see "state is locked" and have to wait. This prevents two people from making conflicting changes simultaneously.

> These two resources (the S3 bucket and DynamoDB table) are the only things you create manually — everything else will be managed by Terraform itself.

---

## How Your Project Is Organized

```
terraform/
├── backend.tf              # Tells Terraform WHERE to store state (your S3 bucket)
├── providers.tf            # Tells Terraform WHAT cloud provider to use (AWS)
├── versions.tf             # Pins the Terraform + provider versions
├── variables.tf            # Declares inputs your config needs (project name, region, etc.)
├── outputs.tf              # Declares values Terraform should display after apply
├── main.tf                 # The "wiring" — connects all your modules together
├── terraform.tfvars.example  # Sample values to copy and customize
├── environments/
│   └── dev/
│       └── terraform.tfvars  # Dev-specific values (region, tags, etc.)
└── modules/                # Reusable building blocks, one per AWS service
    ├── vpc/                # Networking (VPC, subnets, route tables)
    ├── ecs/                # Container orchestration
    ├── alb/                # Load balancer
    ├── dynamodb/           # Database tables
    ├── cognito/            # User authentication
    ├── elasticache/        # Redis caching
    ├── route53/            # DNS
    └── monitoring/         # CloudWatch alarms and dashboards
```

### What each file type does

**`backend.tf`** — This is your connection to remote state. It says: "Store my state in S3 bucket X, lock it with DynamoDB table Y." You configured this during `terraform init`.

**`providers.tf`** — Tells Terraform you're working with AWS and sets the region. Terraform supports many providers (Azure, GCP, Cloudflare, etc.) but you only need AWS.

**`versions.tf`** — Pins Terraform to `>= 1.5.0` and the AWS provider to `>= 5.0.0`. This prevents surprises if a new Terraform version introduces breaking changes.

**`variables.tf`** — Declares what inputs your configuration accepts. Think of these like function parameters:
```hcl
variable "project" {
  type = string  # e.g., "chesschat"
}
variable "environment" {
  type = string  # e.g., "dev", "staging", "prod"
}
variable "aws_region" {
  type = string  # e.g., "us-east-1"
}
```

**`terraform.tfvars`** — Provides the actual values for those variables. You never commit this file (it may contain sensitive values). Instead you commit `terraform.tfvars.example` as a template.

**`main.tf`** — The orchestrator. It calls each module and passes the right variables:
```hcl
module "vpc" {
  source  = "./modules/vpc"
  project = var.project
  tags    = local.common_tags
}
```

**`modules/`** — Each module is a self-contained folder with its own `main.tf`, `variables.tf`, and `outputs.tf`. Modules let you reuse and isolate infrastructure. The VPC module doesn't need to know about DynamoDB — it just handles networking.

---

## The Workflow, Step by Step

### Step 0: One-Time Setup (already done)

You've already completed this:
- Created an S3 bucket for state storage
- Created a DynamoDB table for state locking
- These are the only manually-created resources

### Step 1: Initialize Terraform

```bash
cd terraform

terraform init \
  -backend-config="bucket=YOUR-BUCKET-NAME" \
  -backend-config="key=envs/dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=YOUR-DYNAMODB-TABLE-NAME"
```

**What this does:**
- Downloads the AWS provider plugin (stored in `.terraform/`, which is gitignored)
- Connects to your S3 bucket to set up remote state
- Creates a `.terraform.lock.hcl` file that pins the exact provider version

**When to re-run:** Only when you change providers, add new modules with remote sources, or switch backends. You don't need to run it before every plan/apply.

### Step 2: Set Up Your Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values. For environment-specific configs, edit `environments/dev/terraform.tfvars`.

### Step 3: Format and Validate

```bash
# Auto-format all .tf files to canonical style
terraform fmt -recursive

# Check for syntax errors and internal consistency
terraform validate
```

**`fmt`** is like Prettier for Terraform — it enforces consistent indentation and style. Run it before every commit.

**`validate`** checks that your HCL syntax is valid and that variable references make sense. It does NOT check against AWS — it's purely local.

### Step 4: Plan (Preview Changes)

```bash
terraform plan -var-file=environments/dev/terraform.tfvars
```

**What this does:**
1. Reads your `.tf` files to understand what you want
2. Reads the state file from S3 to understand what currently exists
3. Queries AWS to check the real-world status of existing resources
4. Shows you a diff: what will be **added** (+), **changed** (~), or **destroyed** (-)

**This is the most important step.** Always read the plan output carefully before applying. Look for:
- Unexpected destroys (a `-` next to something you didn't intend to remove)
- The total count at the bottom: "Plan: X to add, Y to change, Z to destroy"

> Pro tip: Save the plan to a file for exact reproducibility:
> ```bash
> terraform plan -var-file=environments/dev/terraform.tfvars -out=tfplan
> terraform apply tfplan
> ```
> This guarantees `apply` does exactly what the plan showed — nothing more, nothing less.

### Step 5: Apply (Make It Real)

```bash
terraform apply -var-file=environments/dev/terraform.tfvars
```

**What this does:**
1. Runs `plan` internally and shows you the diff
2. Asks you to type `yes` to confirm
3. Creates/updates/destroys resources in AWS
4. Updates the state file in S3
5. Displays any outputs you defined

If something fails mid-apply, Terraform saves progress in the state file. You can run `apply` again and it will pick up where it left off — it won't re-create things that already exist.

### Step 6: Inspect What You've Built

```bash
# List all resources Terraform is managing
terraform state list

# Get details about a specific resource
terraform state show module.vpc.aws_vpc.main

# See all outputs
terraform output
terraform output -json  # machine-readable format
```

### Step 7: Destroy (When You're Done)

```bash
terraform destroy -var-file=environments/dev/terraform.tfvars
```

This removes everything Terraform manages. It shows you a plan first and asks for confirmation. Use this for tearing down dev/test environments — never run it against production without extreme caution.

---

## Essential Commands Reference

| Command | What it does | When to use it |
|---------|-------------|----------------|
| `terraform init` | Downloads providers, configures backend | First time, or after adding providers/modules |
| `terraform fmt -recursive` | Auto-formats `.tf` files | Before every commit |
| `terraform validate` | Checks syntax (local only, no AWS calls) | Before every plan |
| `terraform plan -var-file=...` | Shows what would change | Before every apply |
| `terraform apply -var-file=...` | Executes changes in AWS | When you're ready to deploy |
| `terraform destroy -var-file=...` | Tears down all managed resources | To clean up environments |
| `terraform state list` | Lists all managed resources | To see what Terraform knows about |
| `terraform state show <resource>` | Details about one resource | To inspect a specific resource |
| `terraform output` | Shows defined outputs | After apply, or to check current values |
| `terraform workspace list` | Shows available workspaces | To see what environments exist |
| `terraform workspace select dev` | Switches to a workspace | To target a different environment |

---

## Key Concepts to Understand

### State File

The state file (`terraform.tfstate`) is Terraform's record of what it has created. It maps your `.tf` code to real AWS resource IDs. For example, it knows that `module.vpc.aws_vpc.main` corresponds to `vpc-0abc123def456`.

**Never edit the state file manually.** If something goes wrong, use `terraform state` commands (like `terraform state rm` to forget a resource, or `terraform import` to adopt an existing one).

### Plan vs. Apply

Always plan before you apply. The plan is your safety net — it shows you exactly what will happen. If the plan looks wrong, you can fix your code and plan again without any risk. No changes happen in AWS until you `apply`.

### Idempotency

Terraform is **idempotent** — running `apply` multiple times with the same code produces the same result. If a resource already exists and matches your config, Terraform skips it. This means you can safely re-run `apply` without worrying about duplicating resources.

### Modules

Modules are reusable packages of Terraform code. Instead of putting 500 lines in one file, you split them into logical groups (VPC, ECS, DynamoDB, etc.). Each module:
- Has its own `variables.tf` (inputs it needs)
- Has its own `outputs.tf` (values it exposes to other modules)
- Has its own `main.tf` (the actual resource definitions)

The root `main.tf` wires modules together, passing outputs from one as inputs to another (e.g., the VPC module outputs subnet IDs that the ECS module needs).

### Workspaces

Workspaces let you manage multiple environments (dev, staging, prod) with the same code but separate state files. When you switch workspaces, Terraform reads/writes a different state file in S3.

```bash
terraform workspace new dev      # Create a workspace
terraform workspace select dev   # Switch to it
terraform workspace list         # See all workspaces (* marks current)
```

---

## Common Gotchas

**"State is locked"** — Someone (or another terminal) is running Terraform. Wait for them to finish. If the process crashed and left a stale lock, you can force-unlock with `terraform force-unlock <LOCK_ID>`, but only do this if you're sure nothing else is running.

**"Resource already exists"** — You're trying to create something that already exists in AWS but isn't in your state file. Use `terraform import` to bring it under Terraform's management instead.

**"Provider configuration not present"** — You need to run `terraform init` again, usually because you added a new provider or module.

**Accidentally destroyed something** — Terraform does exactly what you tell it. If you remove a resource block from your `.tf` files and apply, that resource gets destroyed. Always check the plan before applying.

---

## Your Current Status

- **Backend:** S3 bucket + DynamoDB table created (manual setup complete)
- **Modules:** 8 modules exist as placeholders (vpc, ecs, alb, dynamodb, cognito, elasticache, route53, monitoring)
- **Next action:** Replace module placeholders with real resource definitions, starting with the VPC module (networking is the foundation everything else depends on)
- **Naming convention:** `chesschat-<env>-<service>-<purpose>` (e.g., `chesschat-dev-vpc-main`)
- **AWS region:** `us-east-1`
- **AWS account:** `723580627470`
