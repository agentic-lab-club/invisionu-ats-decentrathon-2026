output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "Elastic IP public IP."
  value       = aws_eip.this.public_ip
}

output "public_dns" {
  description = "EC2 public DNS."
  value       = aws_instance.this.public_dns
}

output "ami_id" {
  description = "Ubuntu AMI ID used for the instance."
  value       = data.aws_ami.ubuntu.id
}
