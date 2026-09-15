#!/usr/bin/env bash
# ==============================================================================
# RAMGuard EC2 Automated Provisioning & Deployment Script
# Compatible with Amazon Linux 2023, Amazon Linux 2, and Ubuntu (22.04 / 24.04)
# ==============================================================================

set -e

echo "========================================================"
echo " Starting RAMGuard 3-Tier Application Deployment on EC2"
echo "========================================================"

# Detect OS distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot determine OS. Exiting."
    exit 1
fi

echo "[1/4] Detected operating system: $OS"

# Update and install Docker based on OS
if [ "$OS" = "amzn" ] || [ "$OS" = "almalinux" ] || [ "$OS" = "rhel" ]; then
    echo "[2/4] Updating packages and installing Docker on Amazon Linux..."
    sudo dnf update -y || sudo yum update -y
    sudo dnf install -y docker git || sudo yum install -y docker git
    sudo systemctl enable --now docker
    # Install Docker Compose Plugin
    DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
    sudo mkdir -p $DOCKER_CONFIG/cli-plugins
    sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    sudo usermod -aG docker ec2-user || true

elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "[2/4] Updating packages and installing Docker on Ubuntu/Debian..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg git
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable --now docker
    sudo usermod -aG docker ubuntu || true
fi

echo "[3/4] Checking Docker version..."
sudo docker --version
sudo docker compose version

# Verify environment file exists
if [ ! -f .env ]; then
    echo "[3/4] Copying .env.example to .env..."
    cp .env.example .env
fi

echo "[4/4] Building and launching 3-tier container cluster..."
sudo docker compose down || true
sudo docker compose up -d --build

echo "========================================================"
echo " RAMGuard 3-Tier Application is DEPLOYED!"
echo " Containers running:"
sudo docker compose ps
echo "========================================================"
echo " You can access your application at: http://$(curl -s http://checkip.amazonaws.com || echo '<EC2_PUBLIC_IP>')"
echo "========================================================"
