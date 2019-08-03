import Router from "koa-router"
import axios from "axios"
import { createConnection, Entity, PrimaryColumn, Column, getRepository } from "typeorm"
import { Feed } from "feed"
import { JSDOM } from "jsdom"
import { Episode } from "./entities/meteor"

const client = axios.create({
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.87 Safari/537.36",
    },
    responseType: "text",
    validateStatus: code => {
        return code < 500
    },
})

const setup = async () => {
    await createConnection({
        type: "sqlite",
        entities: [Episode],
        database: "./.data/meteor.db",
        synchronize: true,
        dropSchema: true,
    })
}
setup()

const router = new Router<any, any>()

router.get("/:title(\\w+).rss2", async ctx => {
    const repository = await getRepository(Episode)
    const titleId = ctx.params.title
    const titleUri = `https://comic-meteor.jp/${titleId}/`
    const r = await client.get(titleUri)
    if (r.status != 200) return ctx.throw(r.status)
    const dom = new JSDOM(r.data)
    const author = (() => {
        const author = dom.window.document.querySelector("#contents > div.work_episode > div:nth-child(3)")
        return author ? author.textContent! : "©COMICメテオ"
    })()
    const titleFeed = new Feed({
        title: dom.window.document.title,
        description: (() => {
            const descriptionTag = dom.window.document.head.querySelector('meta[name="description"]')
            if (descriptionTag) {
                const content = descriptionTag.getAttribute("content")
                return content ? content : ""
            } else {
                return ""
            }
        })(),
        link: titleUri,
        id: titleUri,
        generator: "comic-meteor rss generator",
        copyright: author,
    })
    const episodeBox = dom.window.document.querySelector(".work_episode_box")
    if (episodeBox) {
        await Promise.all(
            Array.from(episodeBox.querySelectorAll(".work_episode_table")).map(async episodeTable => {
                const linkTag = episodeTable.querySelector('a[target="_blank"]')
                if (!linkTag) return
                const link = linkTag.getAttribute("href")!
                const parsed = link.match(/ptdata\/(\w+)\/(\d+)/)!
                const episodeId = parseInt(parsed[2])
                const titleParts = await Promise.all(
                    episodeTable
                        .querySelector(".work_episode_txt")!
                        .textContent!.split("\n")
                        .map(async splitted => {
                            return splitted.trim().replace("　", " ")
                        })
                )
                if (titleParts.length < 3) return
                const title = titleParts[1]
                const updatedAt = await (async () => {
                    const episode = await repository.findOne({ where: { title: titleId, episodeId: episodeId } })
                    if (episode) {
                        return episode.updatedAt
                    } else {
                        const newEpisode = await repository.save(
                            new Episode({
                                title: titleId,
                                episodeId: episodeId,
                                updatedAt: new Date(),
                            })
                        )
                        return newEpisode.updatedAt
                    }
                })()
                titleFeed.addItem({
                    title: title,
                    id: link,
                    link: link,
                    date: updatedAt,
                })
            })
        )
    }
    ctx.body = titleFeed.rss2()
    ctx.type = "application/atom+xml; charset=utf-8"
})

export default router
