//? Variables
require('dotenv').config();

const qrcode = require('qrcode-terminal');

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const fs = require('fs');

// const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'; //! UNUSED

const TITLE = '*@WA-Storage*\n';
const COMMANDS = `${TITLE}Comandos:\n/ping - pong\n/list - lista arquivos\n/show [id] - mostra arquivo`;

const bot = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    // executablePath: CHROME_PATH, //! UNUSED
    headless: process.argv[2] == '--show' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

//? Functions
function createImagesFolder() {
  if (!fs.existsSync('./images')) {
    fs.mkdirSync('./images', { recursive: true });
    console.log('[createImagesFolder] created');
  } else {
    console.log('[createImagesFolder] already exists');
  }
}

function deleteImagesFolder() {
  fs.rmSync('./images', { recursive: true });

  console.log('[clearImagesFolder] deleted');
}

const exit = () => {
  bot.destroy();
  console.log('[bot] finished.');
};

// eslint-disable-next-line no-unused-vars
function sleep(seconds) {
  return new Promise(resolve => { console.log(`[sleep] ${seconds}s`); setTimeout(resolve, seconds * 1000); });
}

function filterChat(chat) { //* filter chat by id (CONTACT)
  const id = chat.replace('@c.us', '');
  console.log('[filterChat] id', id);

  const contacts = process.env.CONTACTS.split(' ');
  console.log('[filterChat] contacts', contacts);

  const result = contacts.includes(id);
  console.log('[filterChat] result', result);

  return result;
}

function saveImage(dataUrl, filename) {
  console.log('[saveFileBlob] filename', filename);

  fs.writeFile(`./images/${filename}.png`, dataUrl, 'base64', (err) => {
    if (err) throw err;
    console.log('[saveImage] saved', filename);
  });
}

function images2list() {
  const images = fs.readdirSync('./images');
  console.log('[images2list] images', images);

  let imagesList = '';

  for (const img of images) {
    console.log('[images2list] img', img);
    imagesList += `\n*${img.replace('.png', '')}*\n`;
  }

  return imagesList;
}

bot.on('qr', qr => {
  console.log('[bot#qr] generating...');
  qrcode.generate(qr, { small: true });

  deleteImagesFolder();
  createImagesFolder();
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
    for (const contact of process.env.CONTACTS.split(' ')) {
      const chatId = await bot.getNumberId(contact);
      console.log('[bot#ready/debug] chatId', chatId._serialized);

      await bot.sendMessage(chatId._serialized, COMMANDS);
      console.log('[bot#ready/debug] sent COMMANDS:', COMMANDS);

      const msg = `${TITLE}Estou pronto para salvar arquivos!`;
      await bot.sendMessage(chatId._serialized, msg);
      console.log('[bot#ready/debug] sent msg:', msg);
    }
  }
});

bot.on('disconnected', (reason) => {
  console.log('[bot#disconnected] client disconnected', reason);
});

bot.on('message', async msg => {
  console.log('[bot#message] received', msg);

  if (msg.body == '/ping') {
    console.log('[bot#message] command /ping');
    msg.reply('pong');
    return;
  }

  if (process.argv[2] == '--debug') if (!filterChat(msg.from)) return;

  if (msg.hasMedia) {
    console.log('[bot#message] hasMedia');

    // const media = await msg.downloadMedia(); //! OUT OF ORDER
    // console.log('[bot#message] media', media); //! OUT OF ORDER

    const dataUrl = msg._data.body;
    console.log('[bot#message] dataUrl', dataUrl);

    const filename = !msg._data.caption ? msg.id.id : msg._data.caption.replace(/ /g, '_');
    console.log('[bot#message] filename', filename);

    saveImage(dataUrl, filename);

    msg.reply(`${TITLE}Imagem salva!\n*id*: \`\`\`${filename}\`\`\``);
    return;
  }

  if (msg.body == '/list') {
    console.log('[bot#message] command /list');
    msg.reply(`${TITLE}Lista de arquivos:${images2list()}`);
    return;
  }

  if (msg.body.includes('/show ')) {
    console.log('[bot#message] command /show');

    const id = msg.body.replace('/show ', '');
    console.log('[bot#message] id', id);

    try {
      const media = MessageMedia.fromFilePath(`./images/${id}.png`);
      console.log('[bot#message] media', media);
      // msg.reply(media, {caption: `*${id}*`});
      msg.reply(media);
    } catch (error) {
      console.log('[bot#message] error', error);
      msg.reply(`${TITLE}Arquivo não encontrado!`);
    }

    return;
  }
});

//? Main
console.log('\n[bot] starting...');

createImagesFolder();

bot.initialize();

process.on('SIGINT', exit);  // CTRL+C
process.on('SIGQUIT', exit); // Keyboard quit
process.on('SIGTERM', exit); // `kill` command
