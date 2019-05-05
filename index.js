const fs = require('fs'),
    Telegraf = require('telegraf'),
    markdown = require('telegraf/extra').markdown(),
    url = require('url'),
    qs = require('querystring'),
    pick = require('lodash.pick');

require('dotenv').config();

process.on('uncaughtException', e => console.error(e));

let bot;

{
    let agent;
    if (process.env.SOCKS_HOST && process.env.SOCKS_HOST.length) {
        const SocksAgent = require('socks5-https-client/lib/Agent');
        agent = new SocksAgent({
            socksHost: process.env.SOCKS_HOST,
            socksPort: process.env.SOCKS_PORT
        });
    }

    bot = new Telegraf(process.env.BOT_TOKEN, {
        telegram: agent ? { agent } : void 0,
    });
}

(async() => {
    bot.start((ctx) => ctx.reply('为您去掉链接的跟踪参数，现支持微信图文、utm_*的去除。\n开源地址： https://github.com/feef334r/link-aud-bot'));
    bot.on('inline_query', async ctx => {
        // 提取出被认为是链接的区域
        const queryStr = ctx.update.inline_query.query;
        if (!queryStr)
            return ctx.answerInlineQuery([], { cache_time: 0 });

        let ret = queryStr.replace(
            /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g,
            match => {
                let parsed = url.parse(match),
                    queries = qs.parse(parsed.query),
                    rebuilt_query = {};

                if (queries.__biz) {
                    // WeChat shares
                    rebuilt_query = pick(queries, '__biz,mid,idx,sn'.split(','));
                } else {
                    // Generic
                    let has_utm = false;
                    for (let [k, v] of Object.entries(queries)) {
                        if (/^utm_/.test(k)) {
                            has_utm = true;
                        } else
                            rebuilt_query[k] = v;
                    }

                    if (has_utm) rebuilt_query.from = void 0;
                }

                parsed.query = qs.stringify(rebuilt_query);

                return url.format(parsed);
            });

        ctx.answerInlineQuery([{
            type: 'article',
            id: 0,
            title: '不要追我！',
            input_message_content: {
                message_text: ret
            }
        }], { cache_time: 0 });
    });

    //const { username } = await bot.telegram.getMe();
    //console.log('Bot initialized with username:', username);
    //bot.options.username = username;

    bot.launch();

    console.log('Bot Running');
})();
