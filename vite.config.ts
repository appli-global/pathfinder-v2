import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Force config reload to pick up .env changes
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3002,
      host: '0.0.0.0',
      allowedHosts: true,
      watch: {
        ignored: ['**/contacts.csv']
      }
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api/save-contact', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const fs = await import('fs');
                  const csvLine = `"${data.name}","${data.contact}","${new Date().toISOString()}"\n`;

                  // Create header if file doesn't exist
                  if (!fs.existsSync('contacts.csv')) {
                    fs.writeFileSync('contacts.csv', '"Name","Contact","Timestamp"\n');
                  }

                  fs.appendFileSync('contacts.csv', csvLine);
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  console.error(e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Failed to save contact' }));
                }
              });
            } else {
              next();
            }
          });

          // Local dev handler for coupon validation
          server.middlewares.use('/api/validate-coupon', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', async () => {
                try {
                  const handler = (await import('./api/validate-coupon')).default;
                  const data = JSON.parse(body);
                  const mockReq = { method: 'POST', body: data };
                  const mockRes = {
                    statusCode: 200,
                    setHeader: () => {},
                    status(code: number) { this.statusCode = code; return this; },
                    json(obj: any) {
                      res.statusCode = this.statusCode;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(obj));
                    },
                  };
                  await handler(mockReq, mockRes);
                } catch (e) {
                  console.error('[validate-coupon dev]', e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ valid: false, message: 'Server error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
