data "aws_region" "me-you" {}

resource "aws_cloudwatch_log_group" "me-you" {
  name = "${var.name}_me-you"
}

resource "aws_ecs_task_definition" "me-you" {
  family       = "${var.name}_me-you"
  network_mode = "bridge"

  container_definitions = <<EOF
[
  {
    "name": "${var.name}_me-you",
    "image": "343660461351.dkr.ecr.us-east-2.amazonaws.com/me-you:${var.container_tag}",
    "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
            "awslogs-group": "${aws_cloudwatch_log_group.me-you.name}",
            "awslogs-region": "${data.aws_region.me-you.name}",
            "awslogs-stream-prefix": "${var.name}"
        }
    },
    "cpu": 10,
    "memory": 128,
    "environment": [
        {
            "name": "MEYOU_BACKEND",
            "value": "${var.backend}"
        }
    ],
    "portMappings": [
      {
        "containerPort": 80,
        "hostPort": 80,
        "protocol": "tcp"
      }
    ]
  }
]
EOF
}

resource "aws_iam_server_certificate" "me-you" {
  name = "${var.name}-me-you"
  certificate_body = file(var.cert)
  private_key      = file(var.cert_key)
}

resource "aws_elb" "me-you" {
  name            = "${var.name}-me-you"
  subnets         = var.subnets
  security_groups = var.security_groups

  listener {
    instance_port     = 80
    instance_protocol = "http"
    lb_port           = 443
    lb_protocol       = "https"
    ssl_certificate_id = aws_iam_server_certificate.me-you.arn
  }
}

resource "aws_ecs_service" "me-you" {
  name            = "${var.name}_me-you"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.me-you.arn

  load_balancer {
    elb_name       = aws_elb.me-you.name
    container_name = "${var.name}_me-you"
    container_port = 80
  }

  desired_count = var.container_count
}
