# Diagram Experiments (VPC)

This folder contains multiple code-first diagram approaches for the current CHESSCHAT VPC.

## Variants

- `python/chesschat_vpc_diagram.py`
  - Uses Python [`diagrams`](https://diagrams.mingrammer.com/)
  - Outputs: `output/python_vpc.png`, `output/python_vpc.svg`

- `plantuml/chesschat_vpc.puml`
  - Uses AWS icons for PlantUML
  - Source icons: [awslabs/aws-icons-for-plantuml](https://github.com/awslabs/aws-icons-for-plantuml)
  - Outputs: `output/chesschat_vpc.png`, `output/chesschat_vpc.svg`

- `graphviz/aws_icons_vpc.dot`
  - Uses Graphviz directly with local AWS icon image assets
  - Render script: `graphviz/render_graphviz_aws_icons.sh`
  - Outputs: `output/aws_icons_vpc.png`, `output/aws_icons_vpc.svg`

- `terraform-auto/render_inframap.sh`
  - Uses [`inframap`](https://github.com/cycloidio/inframap) against Terraform
  - Outputs: `output/inframap_vpc.dot`, `output/inframap_vpc.png`, `output/inframap_vpc.svg`

- `terraform-auto/render_terraform_graph.sh`
  - Uses native `terraform graph`
  - Outputs: `output/terraform_graph.dot`, `output/terraform_graph.png`, `output/terraform_graph.svg`

## Render all

```bash
/Users/tim/CODE_PROJECTS/CHESSCHAT_V2/diagrams/render_all.sh
```

## Notes

- The Python and PlantUML diagrams are curated and include subnet tiers, route tables, NAT, endpoints, and flow logs.
- The Graphviz+icons variant is curated and uses local AWS icon files where available.
- The Terraform/Inframap variants are generated from IaC/state and are useful for dependency validation.
