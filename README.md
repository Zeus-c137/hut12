# Referral Miner Platform

A full-stack, AI-powered web application for referral mining and node subscriptions.

## Overview
This platform allows users to sign up, subscribe to "AI Mining Nodes" (Bronze, Silver, Gold), and earn daily passive income in UGX. Users can also refer friends, earn bonuses, complete VIP tasks, and withdraw their earnings. The application includes a comprehensive Admin Dashboard to manage users, transactions, the node catalog, and global configurations.

## Setup & Local Development

1. **Install Dependencies**
   Run the following command to install the required Node.js packages:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Copy the provided `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill out the `.env` file with your specific credentials, focusing on the `GEMINI_API_KEY` for AI features and the Zulupay configuration for payment processing.

3. **Firebase Configuration**
   The application relies on **Firebase Firestore** (using the Client-side Web SDK adapter) for database storage. It handles all persistent data (users, node catalog, investments, chat logs, configurations, and transaction requests).

   To configure Firebase:
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Cloud Firestore** in your Firebase project. Create a database instance (you can use the `(default)` database or create a custom one).
   - Go to your Firebase Project Settings, create a Web App, and copy the Firebase configuration object.
   - In the root of this repository, create or update a file named `firebase-applet-config.json` with your configuration details:
     ```json
     {
       "projectId": "your-firebase-project-id",
       "appId": "your-firebase-app-id",
       "apiKey": "your-firebase-api-key",
       "authDomain": "your-firebase-project-id.firebaseapp.com",
       "firestoreDatabaseId": "your-database-id-or-(default)",
       "storageBucket": "your-firebase-project-id.firebasestorage.app",
       "messagingSenderId": "your-messaging-sender-id"
     }
     ```
   
   *Note: Under the hood, the system uses a single-table client SDK adapter pattern centered around a primary Firestore collection. All items, configurations, and users are synchronized seamlessly.*

4. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment

This application uses Vite for the frontend and Express for the backend. The production build compiles the server into a single file and bundles the React frontend.

1. **Build the Application**
   ```bash
   npm run build
   ```
   This command creates the production assets in the `dist/` directory, including `dist/server.cjs`.

2. **Start the Production Server**
   ```bash
   npm run start
   ```

## Admin Setup & Activation

The application contains an Admin panel that requires seeding an initial admin user before first use. To securely seed the admin account without exposing default passwords, follow these steps:

1. **Set Admin Credentials in Environment Variables**
   Open your `.env` file and define the following variables:
   ```env
   ADMIN_PHONE="0774829717"
   ADMIN_PASSWORD="SecurePassword123!"
   ADMIN_USERNAME="AdminUser"
   ```
   *(If these are left blank, the system will fall back to default credentials, but it's strongly recommended to set them.)*

2. **Activate the Admin Account**
   Once your application is running, navigate to the following URL in your browser to seed the admin account securely:
   ```
   http://localhost:3000/#/admin/access/activate
   ```
   *(Replace `localhost:3000` with your production domain if deployed).*

   Accessing this URL triggers the `/api/admin/access/activate` endpoint which reads your environment variables and creates an admin user in the database.
   
   **Note**: The admin user is intentionally seeded with **0 funds** (0 points) for security reasons.

3. **Sign In to Admin Panel**
   After successful activation, you will be automatically redirected to the Admin Login page (or you can navigate manually to `#/admin/access`). Sign in using the `ADMIN_PHONE` and `ADMIN_PASSWORD` you provided in the environment variables.

## AI Assistant Configuration

The platform features an AI mentor (Gemini Copilot) that helps users understand the mining nodes and referral tiers. To enable this feature:

1. Obtain a Gemini API key from Google AI Studio.
2. Add it to your `.env` file as `GEMINI_API_KEY`.
3. Optionally, you can add `GEMINI_API_KEY_2` and `GEMINI_API_KEY_3` for rate limit rotation.

## Hosting on SmarterASP.NET (Windows IIS with iisnode)

SmarterASP.NET is a Windows IIS-based host. Since this is a full-stack Node.js (Express + React) application, it requires IIS's **iisnode** module to execute. 

Follow these steps to deploy successfully:

### 1. Build the Application Locally
Run the production build script locally to generate the optimized output:
```bash
npm run build
```
This will generate the static client files and compile the backend server bundle as `dist/server.cjs`.

### 2. Create the IIS Configuration (`web.config`)
Create a `web.config` file in your root folder (the folder containing `package.json` and `dist/`) to instruct IIS to route traffic to the `iisnode` handler for execution. Here is a production-grade template:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- Instruct IIS to process our server bundle with iisnode -->
    <handlers>
      <add name="iisnode" path="dist/server.cjs" verb="*" modules="iisnode" />
    </handlers>
    
    <rewrite>
      <rules>
        <!-- Do not interfere with debugging or static files inside dist/ -->
        <rule name="StaticContent" stopProcessing="true">
          <match url="^dist/(.*)" />
          <action type="None" />
        </rule>
        
        <!-- Redirect all other incoming HTTP traffic to the Express Node server -->
        <rule name="ExpressRoute">
          <match url="/*" />
          <action type="Rewrite" url="dist/server.cjs" />
        </rule>
      </rules>
    </rewrite>

    <security>
      <requestFiltering>
        <hiddenSegments>
          <!-- Keep sensitive folders hidden -->
          <add segment="node_modules" />
          <add segment=".git" />
        </hiddenSegments>
      </requestFiltering>
    </security>

    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

### 3. Deploy via FTP / File Manager
1. In your SmarterASP.NET control panel, make sure Node.js is enabled for your website.
2. Connect to your site via FTP or use the online File Manager.
3. Upload the following files and directories into your main web directory (typically `site1/wwwroot/`):
   - `dist/` (containing frontend assets and `server.cjs`)
   - `firebase-applet-config.json` (your Firestore configuration)
   - `package.json`
   - `web.config` (created in Step 2)
   - `.env` (your production secrets, including `GEMINI_API_KEY`, admin credentials, and payment API keys)

### 4. Install Dependencies on SmarterASP
1. In the SmarterASP.NET Control Panel, navigate to your web application settings.
2. Locate the **Node.js/NPM** console tool and execute `npm install --only=prod` to fetch necessary backend packages.

### 5. Activate and Login to Admin Panel
Once the site is live, activate the admin account by visiting:
```
https://your-domain.com/#/admin/access/activate
```
This securely registers the admin specified in your `.env` variables with 0 funds for supreme safety. Log in at `#/admin/access`.

## Hosting on Render.com (Recommended)

Render.com is a modern cloud hosting platform that natively supports Node.js applications and makes deployment incredibly easy by connecting directly to your GitHub repository.

Follow these steps to deploy to Render:

### 1. Push Your Code to GitHub
Ensure your entire project (excluding `node_modules` and `.env` which should be in `.gitignore`) is pushed to a GitHub repository. 

### 2. Create a Web Service on Render
1. Create an account on [Render.com](https://render.com) and log in.
2. Click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Connect your GitHub account and select your repository.

### 3. Configure the Web Service
Fill out the deployment settings exactly as follows:
- **Name**: Choose a name for your app (e.g., `referral-miner-app`)
- **Region**: Select the region closest to your users.
- **Branch**: `main` (or whichever branch you use)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

### 4. Set Environment Variables
Render needs the environment variables that you would normally put in your `.env` and `firebase-applet-config.json` files.

1. Scroll down to the **Environment Variables** section.
2. Add all the keys from your `.env` file (e.g., `GEMINI_API_KEY`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, etc.).
3. For the `firebase-applet-config.json`, the simplest approach on Render is to upload this file as a **Secret File**:
   - In the Render dashboard for your service, go to **Environment** -> **Secret Files**.
   - **Filename**: `firebase-applet-config.json`
   - **Contents**: Paste the exact JSON contents from your local `firebase-applet-config.json` file.
   - Click **Save**.

### 5. Deploy
1. Choose your instance type (the Free tier works, but may sleep after inactivity; Starter tier is recommended for production).
2. Click **Create Web Service**.
3. Render will now clone your repo, run the Build Command, and then run the Start Command. 

### 6. Activate and Login
Once Render shows the service as **Live**, navigate to the provided Render URL (e.g., `https://your-app-name.onrender.com/#/admin/access/activate`) to activate your admin account securely.

