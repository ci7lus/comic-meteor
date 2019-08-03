import { Entity, PrimaryColumn, Column } from "typeorm"

@Entity("episodes")
export class Episode {
    @PrimaryColumn()
    title: string

    @PrimaryColumn()
    episodeId: number

    @Column()
    updatedAt: Date

    constructor(partial: Partial<Episode>) {
        Object.assign(this, partial)
    }
}
