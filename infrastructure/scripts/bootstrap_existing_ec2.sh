#!/usr/bin/env bash
set -euo pipefail

exec > >(tee /var/log/invisionu-bootstrap-manual.log) 2>&1

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root: sudo bash infrastructure/scripts/bootstrap_existing_ec2.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

retry() {
  local attempts="$1"
  shift
  local count=1

  until "$@"; do
    if [ "$count" -ge "$attempts" ]; then
      return 1
    fi
    count=$((count + 1))
    sleep 5
  done
}

retry 3 apt-get update
retry 3 apt-get install -y ca-certificates curl git jq unzip awscli zsh sudo

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
fi

if ! docker compose version >/dev/null 2>&1; then
  retry 3 apt-get update
  retry 3 apt-get install -y docker-compose-plugin
fi

systemctl enable --now docker
usermod -aG docker ubuntu || true
usermod -aG docker root || true

install_oh_my_zsh() {
  local user_name="$1"
  local home_dir

  home_dir="$(getent passwd "$user_name" | cut -d: -f6 || true)"
  if [ -z "$home_dir" ] || [ ! -d "$home_dir" ]; then
    return 0
  fi

  if [ ! -d "$home_dir/.oh-my-zsh" ]; then
    sudo -u "$user_name" HOME="$home_dir" RUNZSH=no CHSH=no KEEP_ZSHRC=yes \
      sh -c 'curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | sh -s -- --unattended'
  fi

  chsh -s /usr/bin/zsh "$user_name" || true
}

install_oh_my_zsh ubuntu
install_oh_my_zsh root

cat >/usr/local/bin/ohmyzsh <<'EOF'
#!/bin/sh
exec zsh "$@"
EOF
chmod +x /usr/local/bin/ohmyzsh

mkdir -p /opt/invisionu-ats/bin
mkdir -p /opt/invisionu-ats/runtime/env
mkdir -p /opt/invisionu-ats/runtime/config
mkdir -p /opt/invisionu-ats/runtime/logs

echo "Bootstrap finished."
echo "Check:"
echo "  docker --version"
echo "  docker compose version"
echo "  zsh --version"
echo "  sudo -iu ubuntu ohmyzsh"
