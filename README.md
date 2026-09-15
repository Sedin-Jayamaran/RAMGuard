# RAMGuard 3-Tier Application Suite

A containerized 3-tier web application built with **React (Presentation Tier)**, **Node.js Express (Application Tier)**, and **PostgreSQL (Data Tier)**, orchestrated with **Docker Compose** and configured for **AWS EC2 hosting**.

This application also includes real-time container memory telemetry and controllable memory bloat endpoints to test and validate container memory monitoring tools like **RAMGuard**.

---

## 🏛️ Architecture Overview

```
                      [ Client Web Browser ]
                                │
                          HTTP Port 80
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 1: Presentation (Frontend)                             │
 │   • Nginx Alpine (Reverse Proxy & Static Web Server)        │
 │   • React 18 + Vite SPA Dashboard                           │
 │   • Live Memory Telemetry & Bloat Simulation Controls       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Internal Proxy (/api/*)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 2: Application (Backend API)                           │
 │   • Node.js 20 Alpine + Express                             │
 │   • Health checks, CRUD APIs, & Metrics Endpoints           │
 │   • Memory Bloat Simulator (/api/stress/*)                  │
 │   • Graceful shutdown hooks (SIGTERM/SIGINT)                │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Internal TCP (Port 5432)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 3: Data (Database)                                     │
 │   • PostgreSQL 16 Alpine                                    │
 │   • Automated schema initialization (db/init.sql)           │
 │   • Persistent Docker Volume (`pgdata`)                     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local Machine)

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (v2.0+)

### 1. Clone & Navigate
```bash
git clone <your-repo-url>
cd RAMGuard
```

### 2. Configure Environment (Optional)
The project comes with a default `.env` configured. You can customize credentials by copying `.env.example`:
```bash
cp .env.example .env
```

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Verify Services
Check running containers and health status:
```bash
docker compose ps
```

Open your browser at:
👉 **[http://localhost](http://localhost)**

---

## ☁️ Hosting on AWS EC2

### Step 1: Launch an EC2 Instance
1. Go to **AWS Console > EC2 > Instances > Launch an Instance**.
2. **Name**: `ramguard-server`
3. **AMI**: Amazon Linux 2023 AMI or Ubuntu 24.04 LTS.
4. **Instance Type**: `t3.small` or `t3.medium` (recommended: 2GB–4GB RAM for testing memory bloat). A `t2.micro` (1GB RAM) also works.
5. **Key Pair**: Select or create an SSH key pair (e.g., `my-key.pem`).
6. **Network Settings (Security Group)**:
   Ensure the following inbound ports are open:
   - **SSH (Port 22)**: Source `My IP`
   - **HTTP (Port 80)**: Source `0.0.0.0/0` (Anywhere)
   - *(Optional)* **HTTPS (Port 443)**: Source `0.0.0.0/0`

---

### Step 2: Connect to EC2
```bash
chmod 400 my-key.pem
ssh -i my-key.pem ec2-user@<EC2_PUBLIC_IP>
# Or for Ubuntu:
# ssh -i my-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

### Step 3: Deploy using the Automated Setup Script
Once connected inside your EC2 terminal:

```bash
# Clone the repository
git clone https://github.com/Sedin-Jayamaran/RAMGuard.git
cd RAMGuard

# Run the automated deployment script
chmod +x scripts/ec2-setup.sh
./scripts/ec2-setup.sh
```

The script will automatically:
- Install Docker & Docker Compose
- Enable and start system services
- Build all 3 tiers (`frontend`, `backend`, `database`)
- Bring up the cluster in detached mode

---

### Step 4: Access Your Application
Open your browser and navigate to:
👉 `http://<YOUR_EC2_PUBLIC_IP>`

---

## 🧪 Testing Memory Bloat (RAMGuard Scenarios)

The application provides a built-in memory stress simulator to test the exact scenario described: *a container starting at a low RAM baseline and gradually bloating to multiple GBs*.

### Option A: From the Web UI
1. Navigate to the **RAMGuard Memory Bloat Simulator** panel in the dashboard.
2. Click **+100 MB**, **+250 MB**, or **+500 MB** to observe instant step increases in `Process RSS` and `Retained Bloat`.
3. Click **Start Leak (+25MB/3s)** to simulate a gradual memory leak over time.
4. Watch the live **Process RSS** and **Memory Pressure Bar** climb.
5. Click **Free Memory & GC** to trigger garbage collection and return memory.

### Option B: From the Command Line / API
```bash
# 1. Inspect live memory metrics
curl http://localhost/api/metrics

# 2. Allocate 500 MB RAM immediately
curl -X POST http://localhost/api/stress/allocate \
  -H "Content-Type: application/json" \
  -d '{"mb": 500}'

# 3. Start gradual continuous leak (e.g. 50MB every 2 seconds)
curl -X POST http://localhost/api/stress/leak-start \
  -H "Content-Type: application/json" \
  -d '{"mbPerTick": 50, "intervalMs": 2000}'

# 4. Stop continuous leak
curl -X POST http://localhost/api/stress/leak-stop

# 5. Free retained memory and invoke Garbage Collector
curl -X POST http://localhost/api/stress/reset
```

---

## 📁 Repository Structure

```
RAMGuard/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── items.js      # PostgreSQL CRUD operations
│   │   │   ├── metrics.js    # Memory & cgroup telemetry
│   │   │   └── stress.js     # Bloat & leak simulation engine
│   │   ├── db.js             # PostgreSQL connection pool with retry
│   │   └── server.js         # Express server & graceful shutdown hooks
│   ├── Dockerfile            # Multi-stage production Node.js 20 Alpine
│   ├── package.json
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Realtime telemetry & controls dashboard
│   │   ├── index.css         # Modern dark tech UI styles
│   │   └── main.jsx
│   ├── nginx.conf            # Nginx reverse proxy configuration
│   ├── Dockerfile            # Multi-stage build (Node build -> Nginx alpine)
│   ├── package.json
│   └── index.html
├── db/
│   └── init.sql              # Database initialization & seed data
├── scripts/
│   └── ec2-setup.sh          # Automated provisioning script for AWS EC2
├── docker-compose.yml        # Orchestration for all 3 tiers
├── .env.example              # Environment variables template
├── .env                      # Default local environment configuration
└── README.md
```

---

## 🛡️ Next Step: Integrating RAMGuard
Now that this 3-tier application is running, you can point your **RAMGuard** agent or daemon at the `ramguard-backend` container to monitor its memory slope, detect leaks before they cause OOM kills, and execute automated remediations!
