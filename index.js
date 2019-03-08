const moment = require('moment')
const feed = require('feed')
const { Feed } = feed
const rp = require('request-promise')
const jsdom = require('jsdom')
const { JSDOM } = jsdom;
const express = require('express')
const app = express()


app.get('/rss2/:title(\\w+)', (req, res) => {
    const site_url = `https://comic-meteor.jp/${req.params.title}/`
    rp(site_url)
        .then(function (htmlString) {
            const now = moment()
            const regex = new RegExp('(\\d{1,2}).(\\d{1,2})')
            const dom = new JSDOM(htmlString)
            const title_feed = new Feed({
                title: dom.window.document.title,
                description: dom.window.document.head.querySelector('meta[name="description"]').getAttribute('content'),
                link: site_url,
            })
            const episode_box = dom.window.document.querySelector('.work_episode_box')
            if (episode_box) {
                episode_box.querySelectorAll('.work_episode_table').forEach(episode_table => {
                    const atag = episode_table.querySelector('a[target="_blank"]')
                    if (atag) {
                        const link = atag.getAttribute('href')
                        const title = episode_table.querySelector('.work_episode_txt').textContent.split('\n').map(function (mapText) {
                            return mapText.trim().replace("　", " ")
                        }).filter(function (filterText) {
                            return (filterText)
                        })
                        if (title.length == 2) {
                            const match = regex.exec(title[1])
                            if (match) {
                                title_feed.addItem({
                                    title: title[0],
                                    id: link,
                                    link: link,
                                    date: new Date(now.year(), match[1], match[2]),
                                })
                                return
                            }
                        }
                        title_feed.addItem({
                            title: title[0],
                            id: link,
                            link: link
                        })
                    }
                })
            }
            res.set({'Content-Type': 'application/atom+xml; charset=utf-8'})
            res.send(title_feed.rss2())
            res.end()
        })
        .catch(function (err) {
            console.error(err);
            res.status(404).end()
        })
})

module.exports = app

if (process.env.NODE_ENV != 'production') {
    app.listen(3000)
    console.log('Express started on: http://localhost:3000')
}