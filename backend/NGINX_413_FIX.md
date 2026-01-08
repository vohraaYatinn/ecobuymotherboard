# Fix 413 Error on VPS - Nginx Configuration

## Problem
Getting `413 Request Entity Too Large` error when uploading files to:
```
https://api.safartax.com/api/learning-resources/upload
```

This means **Nginx is blocking the request** before it reaches Node.js.

## Solution: Update Nginx Configuration

### Step 1: Find Your Nginx Config File

```bash
# Usually one of these locations:
/etc/nginx/sites-available/api.elecobuy.com
/etc/nginx/sites-available/default
/etc/nginx/nginx.conf
```

### Step 2: Edit the Configuration

Add or update these settings in your Nginx server block:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name api.elecobuy.com;

    # CRITICAL: Increase client body size limit (default is 1MB)
    # This must be larger than your max file size
    client_max_body_size 500M;

    # Increase timeouts for large file uploads
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Buffer settings
    client_body_buffer_size 128k;
    
    # IMPORTANT: Disable buffering for file uploads
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://localhost:5000;  # Change port if different
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Critical for file uploads
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # Specific configuration for upload endpoint
    location /api/learning-resources/upload {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL: Must match or exceed server block setting
        client_max_body_size 500M;
        
        # Timeouts
        client_body_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Disable buffering
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

### Step 3: Also Check Main Nginx Config

If the above doesn't work, check `/etc/nginx/nginx.conf` and add in the `http` block:

```nginx
http {
    # Add this in the http block (affects all server blocks)
    client_max_body_size 500M;
    client_body_timeout 300s;
    
    # ... rest of config
}
```

### Step 4: Test and Reload

```bash
# Test the configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
# OR
sudo service nginx reload
```

### Step 5: Verify

Check Nginx error logs to confirm:
```bash
sudo tail -f /var/log/nginx/error.log
```

You should NOT see errors like:
- `client intended to send too large body`
- `413 Request Entity Too Large`

## Quick Test Command

Test if the fix worked:
```bash
curl -X POST https://api.safartax.com/api/health/upload \
  -H "Content-Type: application/json"
```

## Common Issues

### Issue 1: Still getting 413 after changes
- Make sure you reloaded Nginx: `sudo systemctl reload nginx`
- Check if there are multiple Nginx config files
- Verify the correct server block is being used: `sudo nginx -T | grep server_name`

### Issue 2: 504 Gateway Timeout
- Increase timeout values further
- Check if Node.js server is running: `pm2 list` or `systemctl status your-app`

### Issue 3: Changes not taking effect
- Make sure you edited the correct config file
- Check which config file is active: `sudo nginx -T`
- Restart Nginx instead of reload: `sudo systemctl restart nginx`

## Verification

After fixing, the upload should work. Check server logs:
```bash
# Node.js logs (if using PM2)
pm2 logs

# Or check your application logs
tail -f /path/to/your/app/logs
```

You should see:
```
📥 [LEARNING RESOURCES] Incoming upload request: ...
📦 [LEARNING RESOURCES] Request size: X.XX MB
📤 [LEARNING RESOURCES] Starting file upload processing...
```

If you still see 413 errors, the request is being blocked by Nginx before reaching Node.js.



