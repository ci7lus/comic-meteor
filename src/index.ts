import "reflect-metadata"
import Koa from "koa"
import Router from "koa-router"
import { createReadStream } from "fs"
import { createConnection } from "typeorm"
import { Episode } from "./entities/meteor"
import rssRouter from "./meteor"

const app = async () => {
    await createConnection({
        type: "sqlite",
        entities: [Episode],
        database: ".data/meteor.db",
        synchronize: true,
        // dropSchema: true,
    })

    const app = new Koa()

    const router = new Router<any, any>()
    router.get("/", async ctx => {
        ctx.body = createReadStream(`${__dirname}/index.html`)
        ctx.type = "html"
    })

    app.use(router.routes())
    app.use(rssRouter.routes())

    const port = parseInt(process.env.PORT!) || 5000

    app.listen(port, () => {
        console.log(`listen on http://localhost:${port}`)
    })
}

app()
