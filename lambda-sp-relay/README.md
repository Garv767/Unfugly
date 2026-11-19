# Unfugly AWS Lambda Edge Relay (ap-south-1 Mumbai)

Dedicated edge relay for proxying requests from Render (Singapore/US) to SRMIST Student Portal (`sp.srmist.edu.in`) via native Indian AWS IP addresses in Mumbai (`ap-south-1`).

## Setup in 2 Minutes on AWS Free Tier

### 1. Create Function
1. Log in to AWS Console and switch region in the top right to **Asia Pacific (Mumbai) `ap-south-1`**.
2. Open **AWS Lambda** → Click **Create function**.
   - **Function name**: `unfugly-sp-relay`
   - **Runtime**: `Node.js 20.x` or `Node.js 22.x`
   - **Architecture**: `arm64` (recommended) or `x86_64`
3. Expand **Advanced settings**:
   - Check **Enable function URL**
   - **Auth type**: `NONE`
   - Check **Configure cross-origin resource sharing (CORS)**
     - Allow origin: `*`
     - Allow methods: `GET, POST, HEAD, OPTIONS`
     - Allow headers: `*`
4. Click **Create function**.

### 2. Upload Code
- In the **Code source** editor, replace the contents of `index.mjs` with [lambda-sp-relay/index.mjs](file:///c:/Users/garvr/Cooking/Unfugly/lambda-sp-relay/index.mjs), then click **Deploy**.
- (Or click **Upload from** → **.zip file** and select [lambda-sp-relay/function.zip](file:///c:/Users/garvr/Cooking/Unfugly/lambda-sp-relay/function.zip)).

### 3. Copy Function URL & Configure Render
1. Copy the generated **Function URL** (looks like `https://abcdef123456.lambda-url.ap-south-1.on.aws/`).
2. Go to **Render Dashboard** → `unfugly-backend` → **Environment**.
3. Update `SP_RELAY_URL`:
   ```env
   SP_RELAY_URL=https://abcdef123456.lambda-url.ap-south-1.on.aws
   ```
4. Click **Save Changes** (Render will auto-deploy).
