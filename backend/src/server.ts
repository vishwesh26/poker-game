import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed origins
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
// We export this to use in other backend files
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

import { initSockets } from './socket';

// Initialize Socket.io
const io = new Server(server, {
  cors: { origin: '*' }
});

initSockets(io);

const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', supabase: !!supabase });
});

server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
