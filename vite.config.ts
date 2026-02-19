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
      allowedHosts: [
        'localhost',
        'dev.appli.global'
      ],
      watch: {
        ignored: ['**/contacts.csv']
      }
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
