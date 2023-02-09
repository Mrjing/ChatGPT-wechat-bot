import { WechatyBuilder } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import config from './config.js';
import { replyMessage, initChatGPT } from './chatgpt.js';
let bot;
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
            console.log(`Group name: ${topic} talker: ${await contact.name()} content: ${content}`);
            const pattern = RegExp(`@${botSelf.name()}[\\s]*`);
            if (await msg.mentionSelf()) {
                if (pattern.test(content)) {
                    const groupContent = content.replace(pattern, '');
                    await replyMessage(room, groupContent);
                    return;
                }
                else {
                    console.log('Content is not within the scope of the customizition format');
                }
            }
        }
        else if (isText) {
            console.log(`talker: ${alias} content: ${content}`);
            if (config.autoReply) {
                if (content.startsWith(config.privateKey)) {
                    await replyMessage(contact, content.substring(config.privateKey.length).trim());
                }
                else {
                    console.log('Content is not within the scope of the customizition format');
                }
            }
        }
    }
    catch (e) {
        console.log('onMessage error:', e);
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
        await initChatGPT();
        bot = WechatyBuilder.build({
            name: 'WechatEveryDay1',
            puppet: 'wechaty-puppet-padlocal',
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
    }
    catch (error) {
        console.log('init error: ', error);
    }
}
