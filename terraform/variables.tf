variable "name" {
  type        = string
  description = "Name used to identify resources"
}

variable "container_tag" {
  type        = string
  description = "Tag of the me-you container in the registry to be used"
  default     = "latest"
}

variable "cluster_id" {
  type        = string
  description = "ID of the ECS cluster that the me-you service will run in"
}

variable "security_groups" {
  type        = list(string)
  description = "VPC security groups for the me-you service load balancer"
}

variable "subnets" {
  type        = list(string)
  description = "VPC subnets for the me-you service load balancer"
}

variable "backend" {
  type        = string
  description = "Backend location (host:port)"
}

variable "cert" {
  type = string
  description = "TLS certificate path"
}

variable "cert_key" {
  type = string
  description = "TLS certificate key path"
}
