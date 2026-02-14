# ${module^^} module

Describe the resources that belong to the ${module} layer. Keep this module focused on a single responsibility (networking, compute, load balancing, cache, database, identity, DNS, or monitoring). Define inputs for every configurable value and outputs for any resource identifiers other modules or environments need.

## Suggestions
- Keep resources isolated to reduce blast radius.
- Tag every resource using the shared `project` and `tags` inputs.
- Document any required IAM permissions to deploy this module.
