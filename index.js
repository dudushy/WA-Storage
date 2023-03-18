require('dotenv').config();

//? Variables
const qrcode = require('qrcode-terminal');

// const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { Client, LocalAuth } = require('whatsapp-web.js');

const fs = require('fs');

// const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'; //! UNUSED

const bot = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    // executablePath: CHROME_PATH, //! UNUSED
    headless: process.argv[2] == '--show' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

//? Functions
function createFilesFolder() {
  if (!fs.existsSync('./files')) {
    fs.mkdirSync('./files', { recursive: true });
    console.log('[createFilesFolder] created');
  } else {
    console.log('[createFilesFolder] already exists');
  }
}

function deleteFilesFolder() {
  fs.rmSync('./files', { recursive: true });

  console.log('[clearFilesFolder] deleted');
}

const exit = () => {
  bot.destroy();
  console.log('[bot] finished.');
};

// eslint-disable-next-line no-unused-vars
function sleep(seconds) {
  return new Promise(resolve => { console.log(`[sleep] ${seconds}s`); setTimeout(resolve, seconds * 1000); });
}

bot.on('qr', qr => {
  console.log('[bot#qr] generating...');
  qrcode.generate(qr, { small: true });

  deleteFilesFolder();
  createFilesFolder();
});

bot.on('loading_screen', (percent, message) => {
  console.log(`[bot#loading_screen] ${percent}%`, message);
});

bot.on('authenticated', (session) => {
  console.log('[bot#authenticated] client is authenticated!', session);
});

bot.on('auth_failure', error => {
  console.error('[bot#auth_failure] ERROR', error);
});

bot.on('ready', async () => {
  console.log('[bot#ready] client is ready!');

  console.log('[bot#ready] WhatsApp Web version:', await bot.getWWebVersion());
  console.log('[bot#ready] WWebJS version:', require('whatsapp-web.js').version);

  if (process.argv[2] == '--debug') {
    const chatId = await bot.getNumberId(process.env.CONTACT);
    console.log('[bot#ready/debug] chatId', chatId._serialized);

    const msg = '*# WA-Storage*\nEstou pronto para salvar arquivos!';

    await bot.sendMessage(chatId._serialized, msg);
    console.log('[bot#ready/debug] sent', msg);
  }
});

bot.on('disconnected', (reason) => {
  console.log('[bot#disconnected] client disconnected', reason);
});

bot.on('message', msg => {
  console.log('[bot#message] received', msg);

  if (msg.body == '!ping') {
    msg.reply('pong');
  }
});

//? Main
console.log('\n[bot] starting...');

createFilesFolder();

bot.initialize();

process.on('SIGINT', exit);  // CTRL+C
process.on('SIGQUIT', exit); // Keyboard quit
process.on('SIGTERM', exit); // `kill` command
