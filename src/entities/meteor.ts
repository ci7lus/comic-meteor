import { Entity, PrimaryColumn, Column } from "typeorm"

@Entity("episodes")
export class Episode {
  @PrimaryColumn()
  title: string

  @PrimaryColumn()
  episodeId: string

  @Column()
  updatedAt: Date

  constructor(partial: Partial<Episode>) {
    Object.assign(this, partial)
  }
}
