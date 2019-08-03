import "reflect-metadata"
import Koa from "koa"
import rssRouter from "./meteor"

const app = async () => {
    const app = new Koa()

    app.use(rssRouter.routes())

    const port = parseInt(process.env.PORT!) || 5000

    app.listen(port || 5000, () => {
        console.log(`listen on http://localhost:${port}`)
    })
}

app()
