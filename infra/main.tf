provider "aws" {
  region = var.aws_region
}

# 1. NETWORKING (VPC, Subnets, Security Groups)
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "ai-app-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "aws_security_group" "app_sg" {
  name        = "ai-app-sg"
  description = "Allow inbound traffic for App"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # En prod, esto seria el Load Balancer
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. ALMACENAMIENTO DE SECRETOS (Security Best Practice)
resource "aws_secretsmanager_secret" "ai_secrets" {
  name = "ai-app/production/env"
}

resource "aws_secretsmanager_secret_version" "ai_secrets_val" {
  secret_id     = aws_secretsmanager_secret.ai_secrets.id
  secret_string = jsonencode({
    GEMINI_API_KEY = "TO_BE_FILLED_MANUALLY"
    DATABASE_URL   = "postgresql://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/ai_db"
  })
}

# 3. BASE DE DATOS (RDS Postgres)
resource "aws_db_instance" "postgres" {
  identifier        = "ai-postgres-db"
  allocated_storage = 20
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.micro"
  db_name           = "ai_db"
  username          = "admin_user"
  password          = "super_secure_password_CHANGE_ME" # En prod, usar KMS
  skip_final_snapshot = true
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  db_subnet_group_name   = module.vpc.database_subnet_group
}

# 4. COLAS (ElastiCache Redis)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "ai-redis-cluster"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.app_sg.id]
  subnet_group_name    = module.vpc.elasticache_subnet_group
}

# 5. COMPUTE (ECS Fargate - Serverless Containers)
resource "aws_ecs_cluster" "main" {
  name = "ai-app-cluster"
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole-AI"
  assume_role_policy = jsonencode({
    Version = "2012-10-17-1"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

# Permisos para leer Secrets Manager y ECR
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "backend_task" {
  family                   = "ai-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512" # 0.5 vCPU
  memory                   = "1024" # 1 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.ecr_repo_url}:latest"
      essential = true
      portMappings = [{ containerPort = 3000, hostPort = 3000 }]
      
      # INYECCIÓN SEGURA DE SECRETOS
      secrets = [
        { name = "GEMINI_API_KEY", valueFrom = "${aws_secretsmanager_secret.ai_secrets.arn}:GEMINI_API_KEY::" },
        { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.ai_secrets.arn}:DATABASE_URL::" }
      ]
      
      environment = [
        { name = "REDIS_HOST", value = aws_elasticache_cluster.redis.cache_nodes[0].address },
        { name = "NODE_ENV", value = "production" }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/ai-backend"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend_service" {
  name            = "ai-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend_task.arn
  desired_count   = 2 # Alta disponibilidad
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.app_sg.id]
    assign_public_ip = false
  }
}