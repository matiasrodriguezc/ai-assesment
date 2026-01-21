variable "aws_region" {
  description = "Region to deploy"
  default     = "us-east-1"
}

variable "ecr_repo_url" {
  description = "URL of the ECR repository containing the backend image"
  type        = string
  # En la vida real, esto vendría de un output previo o variable de CI/CD
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-backend" 
}