import { WechatyBuilder, Wechaty } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import config from './config.js';
import { replyMessage, replyImageMessage } from './chatgpt.js';

const drawImagePattern = RegExp(`^画[\\s]*`);

let bot: Wechaty;
initProject();
async function onMessage(msg) {
  const botSelf = bot.currentUser;
  const contact = msg.talker();
  const content = msg.text().trim();
  const room = msg.room();
  const isText = msg.type() === bot.Message.Type.Text;
  if (msg.self()) {
    return;
  }
  try {
    const alias = (await contact.alias()) || (await contact.name());

    if (room && isText) {
      const topic = await room.topic();
      console.log(
        `Group name: ${topic} talker: ${await contact.name()} content: ${content}`
      );

      const pattern = RegExp(`@${botSelf.name()}[\\s]*`);

      if (await msg.mentionSelf()) {
        if (pattern.test(content)) {
          const groupContent = content.replace(pattern, '');
          if (drawImagePattern.test(groupContent)) {
            await replyImageMessage(room, groupContent);
          } else {
            await replyMessage(room, groupContent);
          }
          return;
        } else {
          console.log(
            'Content is not within the scope of the customizition format'
          );
        }
      }
    } else if (isText) {
      console.log(`talker: ${alias} content: ${content}`);
      if (config.autoReply) {
        if (content.startsWith(config.privateKey)) {
          const privateContent = content
            .substring(config.privateKey.length)
            .trim();
          if (drawImagePattern.test(privateContent)) {
            await replyImageMessage(contact, privateContent);
          } else {
            await replyMessage(contact, privateContent);
          }
        } else {
          console.log(
            'Content is not within the scope of the customizition format'
          );
        }
      }
    }
  } catch (e: any) {
    console.log('onMessage error:', e.message);
  }
}

function onScan(qrcode) {
  qrcodeTerminal.generate(qrcode); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('');

  console.log(qrcodeImageUrl);
}

async function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  if (config.autoReply) {
    console.log(`Automatic robot chat mode has been activated`);
  }
}

function onLogout(user) {
  console.log(`${user} has logged out`);
}

async function onFriendShip(friendship) {
  if (friendship.type() === 2) {
    if (config.friendShipRule.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

async function initProject() {
  try {
    // await initChatGPT();
    bot = WechatyBuilder.build({
      name: 'WechatTest',
      puppet: 'wechaty-puppet-padlocal', // 如果有token，记得更换对应的puppet
      puppetOptions: {
        // uos: true,
        token: process.env.TOKEN || config.token,
      },
    });

    bot
      .on('scan', onScan)
      .on('login', onLogin)
      .on('logout', onLogout)
      .on('message', onMessage);
    if (config.friendShipRule) {
      bot.on('friendship', onFriendShip);
    }

    bot
      .start()
      .then(() => console.log('Start to log in wechat...'))
      .catch((e) => console.error(e));
  } catch (error: any) {
    console.log('init error: ', error.message);
  }
}
