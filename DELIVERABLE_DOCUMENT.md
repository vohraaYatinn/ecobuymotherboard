# EcoBuy Motherboard

## Project Delivery Document

**Project Name:** EcoBuy Motherboard  
**Document Type:** Technical Deliverable / Deployment Handover  
**Prepared For:** Project Handover and Deployment Reference  
**Source Code Reference:** [ecobuymotherboard-main.zip](https://drive.google.com/file/d/1pjGXXgaBtq-Mv5CW78siZ0cCtewjAGFy/view?usp=sharing)

---

## 1. Executive Summary

This project is a multi-application ecommerce platform composed of:

- a `backend` API application
- a `ecommerce` customer-facing web application
- a `vendor` seller-facing web application
- Android app packaging support for customer and vendor apps through Capacitor

The solution is designed around a Node.js backend, Next.js frontends, MongoDB for data storage, and deployment behind Nginx with PM2 used for process management where server processes are required.

---

## 2. Solution Architecture

### Applications Included

| Module | Purpose | Primary Tech |
|---|---|---|
| `backend` | Core REST API, auth, orders, vendors, notifications, uploads, cron jobs | Node.js, Express, MongoDB |
| `ecommerce` | Customer website and customer Android app web layer | Next.js, React, Tailwind, Capacitor |
| `vendor` | Seller dashboard website and seller Android app web layer | Next.js, React, Tailwind, Capacitor |

### High-Level Flow

1. Users access the customer or vendor application using the configured domain.
2. Nginx receives public traffic and routes requests to the correct destination.
3. PM2 keeps long-running Node.js processes alive, especially the backend API and any server-rendered web app.
4. The frontend applications call the backend API through `https://api.elecobuy.com`.
5. Capacitor packages the customer and vendor web apps into Android applications.

---

## 3. Technology Stack

### Backend

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB with Mongoose |
| Authentication | JWT, bcrypt |
| File Uploads | Multer |
| Background Jobs | node-cron |
| Email | Nodemailer / SMTP |
| Push Notifications | Firebase Admin |
| Reporting / Documents | PDFKit, XLSX |

### Frontend

| Area | Technology |
|---|---|
| Framework | Next.js 16 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Components | Radix UI |
| Forms / Validation | React Hook Form, Zod |
| Mobile Bridge | Capacitor 7 |

### Mobile

| App | Capacitor App ID | Output Mode |
|---|---|---|
| Customer app (`ecommerce`) | `com.ecobuymotherboard.customer` | Static export for mobile build |
| Vendor app (`vendor`) | `com.ecobuymotherboard.vendor` | Static export |

---

## 4. Repository Structure

```text
ecobuymotherboard/
├── backend/      # API server
├── ecommerce/    # Customer web app + customer Android app source
└── vendor/       # Vendor web app + vendor Android app source
```

---

## 5. Prerequisites

The following should be installed on the target machine:

- Node.js 18+ (Node 20/22 LTS recommended)
- npm
- MongoDB or MongoDB Atlas access
- PM2
- Nginx
- Android Studio
- JDK 17
- ADB / Android SDK tools

Recommended global install for PM2:

```bash
npm install -g pm2
```

---

## 6. Environment Configuration

### Backend `.env`

Create `backend/.env` with values similar to:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ecobuy
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
BACKEND_URL=https://api.elecobuy.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=your-email@example.com
ADMIN_EMAIL_PASSWORD=your-app-password
```

Additional services may require configuration depending on feature usage:

- Firebase Admin credentials
- OTP / MessageCentral configuration
- payment or logistics provider keys if those flows are enabled

### Frontend `.env.local`

For `ecommerce/.env.local` and `vendor/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.elecobuy.com
```

For local development, replace with your local backend URL if needed:

```env
NEXT_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5000
```

---

## 7. How To Run The Project Locally

## 7.1 Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

Production mode:

```bash
cd backend
npm install
npm start
```

Default backend port: `5000`

Important runtime notes:

- The backend binds to `0.0.0.0`, which allows LAN/mobile testing.
- CORS is already configured for localhost, Capacitor origins, and `*.elecobuy.com`.
- API health endpoint: `GET /api/health`

## 7.2 Customer Web App

```bash
cd ecommerce
npm install
npm run dev
```

For production web build:

```bash
cd ecommerce
npm run build
npm run start
```

## 7.3 Vendor Web App

```bash
cd vendor
npm install
npm run dev
```

For production build:

```bash
cd vendor
npm run build
```

Note:

- The vendor application is configured as a static export application.
- The generated production files are expected in `vendor/out`.
- For production hosting, serving `vendor/out` via Nginx is the cleanest approach.

---

## 8. How To Create Android Apps Using Capacitor

This project already includes Capacitor configuration for both customer and vendor applications.

## 8.1 Customer Android App (`ecommerce`)

### First-Time Setup

```bash
cd ecommerce
npm install
npx cap add android
```

### Build Web Assets For Mobile

```bash
npm run build:mobile
npx cap sync android
```

Or use the combined command:

```bash
npm run cap:build
```

### Open Android Studio

```bash
npm run cap:android
```

### Build APK From Terminal

```bash
npm run android:build
```

### Build Release APK

```bash
npm run android:build:release
```

### Install On Connected Device

```bash
npm run android:install
npm run android:run
```

### Customer Android Output

- Debug APK: `ecommerce/android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `ecommerce/android/app/build/outputs/apk/release/app-release.apk`

## 8.2 Vendor Android App (`vendor`)

### First-Time Setup

```bash
cd vendor
npm install
npx cap add android
```

### Build And Sync

```bash
npm run build
npx cap sync android
```

Or use the combined script:

```bash
npm run cap:build
```

### Open Android Studio

```bash
npm run cap:android
```

### Build APK

```bash
npm run android:build
```

### Build Release APK

```bash
npm run android:build:release
```

### Install And Launch

```bash
npm run android:install
npm run android:run
```

### Vendor Android Output

- Debug APK: `vendor/android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `vendor/android/app/build/outputs/apk/release/app-release.apk`

## 8.3 Android Build Notes

- Android Studio is recommended for Gradle sync, emulator use, signing, and release packaging.
- After any frontend code changes, rebuild and run `npx cap sync android` again.
- For the customer app, use `npm run build:mobile` or `npm run cap:build` before syncing. Do not use plain `npm run build` for Android packaging.
- Ensure `NEXT_PUBLIC_API_URL` points to a reachable backend URL before generating the APK.

---

## 9. Production Hosting Approach

The deployment model should be split into two layers:

1. **PM2** for long-running Node.js processes
2. **Nginx reverse proxy** for domains, SSL, routing, and public exposure

### Recommended Hosting Layout

| Component | Recommended Runtime |
|---|---|
| `backend` | PM2 managed Node.js process |
| `ecommerce` web | PM2 managed Next.js server |
| `vendor` web | Static export served by Nginx |
| Android apps | Built APK/AAB files, not hosted on server |

### Why This Layout Fits This Repository

- `backend` is a persistent Node.js API service and should run under PM2.
- `ecommerce` supports a normal `next build` + `next start` web deployment, which fits PM2 well.
- `vendor` is configured with `output: 'export'`, so it is best served as static files from `vendor/out`.

---

## 10. PM2 Deployment Commands

## 10.1 Backend With PM2

```bash
cd /var/www/ecobuymotherboard/backend
npm install
pm2 start server.js --name ecobuy-backend
pm2 save
pm2 startup
```

## 10.2 Ecommerce Web With PM2

```bash
cd /var/www/ecobuymotherboard/ecommerce
npm install
npm run build
pm2 start npm --name ecobuy-web -- run start
pm2 save
```

## 10.3 Optional Vendor Hosting Through PM2

If you want PM2 to serve the static vendor build as well:

```bash
cd /var/www/ecobuymotherboard/vendor
npm install
npm run build
pm2 serve out 3002 --name ecobuy-vendor --spa
pm2 save
```

If possible, serving `vendor/out` directly through Nginx is preferable to PM2 for this specific app.

### Useful PM2 Commands

```bash
pm2 list
pm2 logs
pm2 restart ecobuy-backend
pm2 restart ecobuy-web
pm2 restart ecobuy-vendor
```

---

## 11. Nginx Reverse Proxy Configuration

### 11.1 API Domain

Example for `api.elecobuy.com`:

```nginx
server {
    server_name api.elecobuy.com;

    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

This configuration is especially important because the backend supports large uploads and extended timeouts.

### 11.2 Customer Web Domain

Example for `elecobuy.com`:

```nginx
server {
    server_name elecobuy.com www.elecobuy.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Assumption:

- `ecommerce` runs behind PM2 on port `3000`

### 11.3 Vendor Web Domain

Example for `vendor.elecobuy.com` using static files:

```nginx
server {
    server_name vendor.elecobuy.com;
    root /var/www/ecobuymotherboard/vendor/out;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 12. SSL, Domain, and Reverse Proxy Notes

Recommended production flow:

1. Point domain DNS to the VPS/server public IP.
2. Configure Nginx virtual hosts for each domain/subdomain.
3. Obtain SSL certificates using Certbot.
4. Reload Nginx after validation.
5. Keep Node.js applications internal on localhost ports and expose only Nginx publicly.

Example SSL commands:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot --nginx -d elecobuy.com -d www.elecobuy.com -d api.elecobuy.com -d vendor.elecobuy.com
sudo nginx -t
sudo systemctl reload nginx
```

---

## 13. Deployment Checklist

- Source code uploaded to the server
- Node.js and npm installed
- MongoDB configured or Atlas URI available
- Backend `.env` created
- Frontend `.env.local` created
- PM2 installed
- Backend started under PM2
- Ecommerce started under PM2
- Vendor built to `out/`
- Nginx configured for all required domains
- SSL configured
- API reachable at `https://api.elecobuy.com/api/health`
- Android builds tested after API URL verification

---

## 14. Operational Notes

- Backend includes cron jobs that start automatically when the server starts.
- The backend supports uploads and therefore needs Nginx upload and timeout limits aligned with backend capacity.
- Mobile apps depend on a valid public or local-network API URL.
- For Android builds, any change in frontend code should be followed by a fresh web build and Capacitor sync.

---

## 15. Final Delivery Summary

This project is production-ready in terms of architecture layout and supports:

- customer web experience
- vendor web experience
- backend API and business logic
- Android app packaging through Capacitor
- production hosting using PM2 and Nginx reverse proxy

The recommended deployment model is:

- `backend` on PM2 behind `api.elecobuy.com`
- `ecommerce` on PM2 behind `elecobuy.com`
- `vendor` static build via Nginx behind `vendor.elecobuy.com`

If required, this document can be extended further into:

- a client-facing handover version
- a server setup SOP
- a QA / UAT checklist
- a deployment runbook
