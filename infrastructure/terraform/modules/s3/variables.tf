variable "bucket_name" {
  description = "Uploads bucket name."
  type        = string
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
