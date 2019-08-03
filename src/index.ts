import "reflect-metadata"
import Koa from "koa"
import Router from "koa-router"
import rssRouter from "./meteor"
import { createReadStream } from "fs"

const app = async () => {
    const app = new Koa()

    const router = new Router<any, any>()
    router.get("/", async ctx => {
        ctx.body = createReadStream(`${__dirname}/index.html`)
        ctx.type = "html"
    })

    app.use(router.routes())
    app.use(rssRouter.routes())

    const port = parseInt(process.env.PORT!) || 5000

    app.listen(port || 5000, () => {
        console.log(`listen on http://localhost:${port}`)
    })
}

app()
