const { io } = require('socket.io-client');

// Konfigurasi
const API_BASE_URL = process.env.API_BASE_URL || 'https://d1a7ddfc-5415-44f9-92c0-a278e94f8f08-00-1i8qhqy6zm7hx.sisko.replit.dev';
const ROOM_ID = '386'; // ID room target (Indonesia) - pastikan string
const JOIN_DELAY = 3000; // Jeda antar bot masuk (3 detik agar lebih stabil)
const MSG_DELAY_MIN = 8000; 
const MSG_DELAY_MAX = 20000; 

// Daftar nama bot
const botNames = [
  "damayanti",
  "ningsih",
  "triangle",
  "mama_user",
  "srikandi",
  "purnama",
  "mentari",
  "lestari",
  "bintang",
  "pelangi"
];

const botMessages = [
  "Halo semuanya!",
  "MIG33 Classic emang asik",
  "Lagi apa nih?",
  "Cek speed server...",
  "Hadir gan",
  "Server aman?",
  "Room rame ya",
  "Salam kenal",
  "Wuih cepet juga responnya"
];

async function runLoadTest() {
  console.log(`🚀 Memulai Load Test dengan ${botNames.length} bot di Room ${ROOM_ID}...`);
  
  for (let i = 0; i < botNames.length; i++) {
    const username = botNames[i];
    
    console.log(`[Bot ${i+1}] Mencoba login/koneksi sebagai ${username}...`);
    
    // Hubungkan ke namespace /chat
    const socket = io(`${API_BASE_URL}/chat`, {
      transports: ['websocket'],
      forceNew: true,
      query: { 
        username: username,
        userId: (1000 + i).toString() // Kirim userId dummy
      }
    });

    socket.on('connect', () => {
      console.log(`[Bot ${i+1}] ${username} TERHUBUNG (ID: ${socket.id})`);
      
      // Tunggu sebentar setelah connect sebelum join
      setTimeout(() => {
        console.log(`[Bot ${i+1}] ${username} mencoba JOIN ke room ${ROOM_ID}...`);
        socket.emit('room:join', { 
          roomId: parseInt(ROOM_ID), 
          userId: (1000 + i).toString(),
          username: username 
        });
      }, 1000);
    });

    socket.on('room:joined', (data) => {
      console.log(`[Bot ${i+1}] ${username} BERHASIL masuk ke room: ${data.roomName}`);
      startMessaging(socket, i + 1, username);
    });

    socket.on('room:error', (err) => {
      console.error(`[Bot ${i+1}] ${username} GAGAL masuk room:`, err);
    });

    socket.on('chat:message', (msg) => {
      // Monitor pesan dari bot pertama
      if (i === 0) {
        console.log(`[Monitor] ${msg.username}: ${msg.text}`);
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`[Bot ${i+1}] ${username} KONEKSI ERROR:`, err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Bot ${i+1}] ${username} TERPUTUS: ${reason}`);
    });

    // Jeda antar bot masuk
    await new Promise(resolve => setTimeout(resolve, JOIN_DELAY));
  }
}

function startMessaging(socket, botIndex, username) {
  const sendNext = () => {
    if (!socket.connected) return;
    
    const delay = Math.floor(Math.random() * (MSG_DELAY_MAX - MSG_DELAY_MIN)) + MSG_DELAY_MIN;
    
    setTimeout(() => {
      const text = botMessages[Math.floor(Math.random() * botMessages.length)];
      socket.emit('chat:message', {
        roomId: ROOM_ID,
        userId: (1000 + botIndex - 1).toString(),
        username: username,
        text: text
      });
      
      console.log(`[Pesan] ${username}: ${text}`);
      sendNext();
    }, delay);
  };
  
  sendNext();
}

runLoadTest();
