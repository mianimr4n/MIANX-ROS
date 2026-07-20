# ⚙️ CI/CD PIPELINE CONFIGURATION

> GitHub Actions workflow configuration for Telepizza Platform

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | DevOps & CI/CD |
| Document | CICD_PIPELINE_SETUP.md |
| Version | 1.0 |
| Status | Active |
| Owner | DevOps Team |
| Classification | Infrastructure Guide |

---

# CI/CD Pipeline Overview

```
Code Push
   ↓
Code Lint & Format
   ↓
Unit Tests
   ↓
Build
   ↓
Integration Tests
   ↓
Security Scan
   ↓
Docker Build & Push
   ↓
Deploy to Staging
   ↓
E2E Tests
   ↓
Deploy to Production (Manual Approval)
```

---

# GitHub Actions Workflows

## Setup Instructions

1. Create `.github/workflows/` directory
2. Add workflow YAML files
3. Configure secrets in GitHub
4. Push to repository

---

# Required Secrets

Configure in GitHub Settings → Secrets and Variables:

```
DOCKER_USERNAME
DOCKER_PASSWORD
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DATABASE_URL_STAGING
DATABASE_URL_PRODUCTION
JWT_SECRET
```

---

# Workflow 1: CI Pipeline (test-and-build.yml)

Create `.github/workflows/test-and-build.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install PNPM
        run: npm install -g pnpm@10
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run linter
        run: pnpm lint
      
      - name: Run formatter check
        run: pnpm format:check

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: telepizza_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install PNPM
        run: npm install -g pnpm@10
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/telepizza_test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install PNPM
        run: npm install -g pnpm@10
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build backend
        run: cd backend/api && pnpm build
      
      - name: Build frontend
        run: cd apps/website && pnpm build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            backend/api/dist
            apps/website/.next
```

---

# Workflow 2: Docker Build & Push

Create `.github/workflows/docker-build.yml`:

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./backend/api
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/telepizza-api:latest
            ${{ secrets.DOCKER_USERNAME }}/telepizza-api:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/telepizza-api:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/telepizza-api:buildcache,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./apps/website
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/telepizza-frontend:latest
            ${{ secrets.DOCKER_USERNAME }}/telepizza-frontend:${{ github.sha }}
```

---

# Workflow 3: Security Scan

Create `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Upload Snyk results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: 'javascript, typescript'
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: trivy-results.sarif
```

---

# Workflow 4: Deploy to Staging

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster staging-cluster \
            --service telepizza-api \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster staging-cluster \
            --services telepizza-api
      
      - name: Run smoke tests
        run: |
          curl -f http://staging-api.telepizza.local/health || exit 1

  notify:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployment to Staging Complete",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ Staging deployment successful\n*Commit:* ${{ github.sha }}\n*Branch:* ${{ github.ref }}"
                  }
                }
              ]
            }
```

---

# Workflow 5: Deploy to Production

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Create deployment
        id: deployment
        run: |
          aws ecs update-service \
            --cluster production-cluster \
            --service telepizza-api \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster production-cluster \
            --services telepizza-api
      
      - name: Health check
        run: |
          curl -f https://api.telepizza.com/health || exit 1
      
      - name: Smoke tests
        run: |
          npm run test:smoke:production
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: Production deployment complete
```

---

# Workflow 6: Pull Request Checks

Create `.github/workflows/pr-checks.yml`:

```yaml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check PR title
        uses: actions/github-script@v6
        with:
          script: |
            const title = context.payload.pull_request.title;
            const pattern = /^(feat|fix|docs|style|refactor|test|chore):.*/;
            if (!pattern.test(title)) {
              core.setFailed('PR title must follow conventional commits');
            }
      
      - name: Check for conflicts
        run: |
          if git merge-base --is-ancestor origin/main HEAD; then
            echo "No conflicts detected";
          else
            echo "Branch has conflicts with main";
            exit 1;
          fi
      
      - name: Run size-limit
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_script: pnpm build
          package_manager: pnpm
```

---

# GitHub Actions Secrets

Set these in your GitHub repository settings:

```bash
DOCKER_USERNAME = <your-docker-username>
DOCKER_PASSWORD = <your-docker-password>
AWS_ACCESS_KEY_ID = <aws-access-key>
AWS_SECRET_ACCESS_KEY = <aws-secret-key>
DATABASE_URL_STAGING = postgresql://...
DATABASE_URL_PRODUCTION = postgresql://...
JWT_SECRET = <secret-key>
SLACK_WEBHOOK = <slack-webhook-url>
SNYK_TOKEN = <snyk-token>
```

---

# Local Testing

Test workflows locally using `act`:

```bash
# Install act
brew install act

# Run specific workflow
act -j build -s GITHUB_TOKEN=<token>

# Run all workflows
act --all
```

---

# Monitoring & Alerts

## GitHub Status Checks

Monitor in repository:
- Branches → Branch protection rules
- Set required status checks
- Require PR reviews
- Require passing tests

## Slack Notifications

Configure in workflow files for build status updates.

---

# Best Practices

✅ **Do:**
- Run tests before deploy
- Use environment secrets
- Tag production releases
- Require approval for production
- Cache dependencies
- Keep workflows DRY
- Use matrix strategy for multiple configs

❌ **Don't:**
- Commit secrets to repository
- Skip security scans
- Deploy without tests
- Use hardcoded credentials
- Ignore workflow failures
- Deploy to production without approval

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
