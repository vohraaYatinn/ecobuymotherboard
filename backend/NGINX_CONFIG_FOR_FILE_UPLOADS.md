# Nginx Configuration for Large File Uploads

If file uploads work locally but fail on VPS, it's likely an Nginx configuration issue.

## Required Nginx Settings

Add these settings to your Nginx configuration file (usually `/etc/nginx/sites-available/your-site` or `/etc/nginx/nginx.conf`):

```nginx
server {
    listen 80;
    server_name api.elecobuy.com;

    # Increase client body size limit (default is 1MB)
    # Set to 500MB to match backend multer limit
    client_max_body_size 500M;

    # Increase timeouts for large file uploads
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Buffer settings for large uploads
    client_body_buffer_size 128k;
    proxy_buffering off;
    proxy_request_buffering off;

    # Increase buffer sizes
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;

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

        # Important: Disable buffering for file uploads
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # Specific location for file upload endpoints
    location /api/learning-resources/upload {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical settings for file uploads
        client_max_body_size 500M;
        client_body_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

## After Making Changes

1. Test the configuration:
   ```bash
   sudo nginx -t
   ```

2. If test passes, reload Nginx:
   ```bash
   sudo systemctl reload nginx
   # OR
   sudo service nginx reload
   ```

## Common Issues

### Issue 1: "413 Request Entity Too Large"
**Solution**: Increase `client_max_body_size` in Nginx config

### Issue 2: "504 Gateway Timeout"
**Solution**: Increase timeout values (`proxy_read_timeout`, `proxy_send_timeout`, etc.)

### Issue 3: Upload starts but fails midway
**Solution**: Disable proxy buffering (`proxy_buffering off` and `proxy_request_buffering off`)

### Issue 4: Connection reset during upload
**Solution**: Increase `client_body_timeout` and check firewall settings

## Testing

Test with a large file:
```bash
curl -X POST https://api.elecobuy.com/api/learning-resources/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large-file.pdf" \
  -F "title=Test" \
  -F "type=manual"
```

## Check Nginx Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

Look for errors like:
- `client intended to send too large body`
- `upstream timed out`
- `connection reset by peer`



