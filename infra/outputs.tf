
output "db_endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "Redis cache endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "vpc_id" {
  description = "VPC ID where the app is deployed"
  value       = module.vpc.vpc_id
}