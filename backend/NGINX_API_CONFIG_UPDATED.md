# Updated Nginx Configuration for api.elecobuy.com

## Your Current Config (needs updates)

Add these settings to your existing `api.elecobuy.com` server block:

```nginx
server {
    server_name api.elecobuy.com;

    # CRITICAL: Add these settings for file uploads
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Buffer settings
    client_body_buffer_size 128k;
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL: Disable buffering for file uploads
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # Optional: Specific location for upload endpoint with extra settings
    location /api/learning-resources/upload {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Ensure these match or exceed server block settings
        client_max_body_size 500M;
        client_body_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
        proxy_buffering off;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/elecobuy.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/elecobuy.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
}
```

## Steps to Apply

1. **Edit the config file:**
   ```bash
   sudo nano /etc/nginx/sites-available/api.elecobuy.com
   # OR if using sites-enabled:
   sudo nano /etc/nginx/sites-enabled/api.elecobuy.com
   ```

2. **Add the settings** shown above (the `client_max_body_size` and timeout settings)

3. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

4. **If test passes, reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

5. **Verify it's working:**
   ```bash
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

## What Each Setting Does

- `client_max_body_size 500M` - Allows files up to 500MB (fixes 413 error)
- `client_body_timeout 300s` - How long to wait for client to send body
- `proxy_read_timeout 300s` - How long to wait for response from Node.js
- `proxy_send_timeout 300s` - How long to wait when sending to Node.js
- `proxy_request_buffering off` - Streams upload directly (important for large files)
- `proxy_buffering off` - Disables response buffering

## After Applying

Test the upload again. The 413 error should be resolved.



