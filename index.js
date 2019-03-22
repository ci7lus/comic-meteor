const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const rp = require('request-promise')
const faunadb = require('faunadb')
const express = require('express')
const { promisify } = require('util')
const { Feed } = require('feed')
const { JSDOM } = require('jsdom')
const { map, filter, forEach } = require('p-iteration')
const faunaq = faunadb.query
const app = express()


app.get('/rss2/:title(\\w+)', (req, res, next) => {
    (async () => {
        const now = Date.now()
        const fauna = new faunadb.Client({ secret: process.env.FAUNADB })
        const site_url = `https://comic-meteor.jp/${req.params.title}/`
        const title = await rp(site_url)
        const dom = new JSDOM(title)
        const title_feed = new Feed({
            title: dom.window.document.title,
            description: dom.window.document.head.querySelector('meta[name="description"]').getAttribute('content'),
            link: site_url,
        })
        const episode_box = dom.window.document.querySelector('.work_episode_box')
        if (episode_box) {
            await forEach(episode_box.querySelectorAll('.work_episode_table'), async (episode_table) => {
                const atag = episode_table.querySelector('a[target="_blank"]')
                if (atag) {
                    const link = atag.getAttribute('href')
                    const title = await filter(await map(episode_table.querySelector('.work_episode_txt').textContent.split('\n'), async (mapText) => {
                        return mapText.trim().replace('　', ' ')
                    }), async (filterText) => {
                        return (filterText)
                    })
                    const episode_hash = crypto.createHash('sha256').update(link).digest('hex')
                    const episode_path = path.join('/tmp', episode_hash)
                    const updated_at = await (async() => {
                        try {
                            return new Date(Number(await promisify(fs.readFile)(episode_path)))
                        } catch (err) {
                           const lookup = await fauna.query(faunaq.Paginate(faunaq.Match(faunaq.Index('episode_by_hash'), episode_hash)))
                           const ts = await (async() => {
                            if (lookup.data.length == 0) {
                                await fauna.query(faunaq.Create(faunaq.Class('meteor'), { data: { hash: episode_hash, ts: now } }))
                                    .then((ret) => {
                                        return now
                                    })
                                    .catch((err) => {
                                        console.error(err)
                                        throw err
                                    })
                            } else {
                                return lookup.data[0]
                            }
                           })()
                           await promisify(fs.writeFile)(episode_path, String(ts))
                           return new Date(Number(ts))
                       }
                    })()

                    title_feed.addItem({
                        title: title[0],
                        id: link,
                        link: link,
                        date: updated_at
                    })
                }
            })
            res.set({'Content-Type': 'application/atom+xml; charset=utf-8'})
            res.send(title_feed.rss2())
            res.end()
        } else {
            res.sendStatus(404).end()
        }

    })().catch(next)
})

module.exports = app

if (process.env.NODE_ENV != 'production') {
    require('now-env')
    app.listen(3000)
    console.log('Express started on: http://localhost:3000')
}