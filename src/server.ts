import app from './app';

const PORT = process.env.PORT || 5000;

import os from 'os';

app.listen(Number(PORT), '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
      }
    }
  }
  console.log(`🚀 Backend server running on http://${localIP}:${PORT}`);
});
