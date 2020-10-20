import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, PagedResults } from "paperback-extensions-common"

const READCOMICSONLINE_DOMAIN = 'https://readcomicsonline.ru'

export class ReadComicsOnline extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '0.2.3' }
  get name(): string { return 'ReadComicsOnline' }
  get description(): string { return 'Extension that pulls western comics from ReadComicsOnline.ru' }
  get author(): string { return 'Conrad Weiser' }
  get authorWebsite(): string { return 'http://github.com/conradweiser'}
  get icon(): string { return "logo.png" } // The website has SVG versions, I had to find one off of a different source
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { return `${READCOMICSONLINE_DOMAIN}/comic/${mangaId}`}
  get websiteBaseURL(): string { return READCOMICSONLINE_DOMAIN }
  get rateLimit(): Number {
    return 2
  }


  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {
      let metadata = { 'id': id }
      requests.push(createRequestObject({
        url: `${READCOMICSONLINE_DOMAIN}/comic/${id}`,
        metadata: metadata,
        method: 'GET'
      }))
    }
    return requests
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)
    
    let titles = [$($('.listmanga-header').toArray()[0]).text().trim()]
    let image = $('img', $('.boxed')).attr('src')
    
    let status, author, released, views, rating: number = 0
    let tags: TagSection[] = [createTagSection({id: 'genres', label: 'genres', tags: []})]
    let i = 0
    for(let item of $('dd', $('.dl-horizontal')).toArray()) {
        switch(i) {
            case 0: {
                i++
                continue
            }
            case 1: {
                // Comic Status
                if($(item).text().toLowerCase().includes("ongoing")) {
                    status = MangaStatus.ONGOING
                }
                else {
                    status = MangaStatus.COMPLETED
                }
                i++
                continue
            }
            case 2: {
                // Date of release
                released = ($(item).text().trim()) ?? undefined
                i++
                continue
            }
            case 3: {
                i++
                continue
            }
            case 4: {
                // Genres (Cannot be parsed due to ::before and ::after tags, look into this later)
                i++
                continue
            }
            case 5: {
                views = Number($(item).text()) ?? -1
                i++
                continue
            }
            case 6: {
                // Rating
                rating = Number($('#item-rating', $(item)).attr('data-score')) ?? -1
                i++
                continue
            }
        }
        i = 0
    }

    let summary = $('p', $('.well')).text().trim()

    return [createManga({
        id: metadata.id,
        rating: rating,
        titles: titles,
        image: `http:${image!}`,
        status: Number(status),
        lastUpdate: released,
        tags: tags,
        desc: summary
    })]
  }

  getChaptersRequest(mangaId: string): Request {
    let metadata = { 'id': mangaId }
    return createRequestObject({
      url: `${READCOMICSONLINE_DOMAIN}/comic/${mangaId}`,
      method: "GET",
      metadata: metadata
    })
  }

  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let chapters: Chapter[] = []
    
    for(let obj of $('li', $('.chapters')).toArray()) {
        let id = $('a', $(obj)).attr('href')?.replace(`${READCOMICSONLINE_DOMAIN}/comic/${metadata.id}/`, '')
        let chapNum = Number(id)
        let name = $('a', $(obj)).text().trim()
        let time = new Date($('.date-chapter-title-rtl', $(obj)).text().trim())

        // If we parsed a bad ID out, don't include this in our list
        if(!id) {
            continue
        }

        chapters.push(createChapter({
            id: id,
            mangaId: metadata.id,
            chapNum: chapNum,
            langCode: LanguageCode.ENGLISH,
            name: name,
            time: time
        }))
    }

    return chapters
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    let metadata = { 'mangaId': mangaId, 'chapterId': chapId }
    return createRequestObject({
      url: `${READCOMICSONLINE_DOMAIN}/comic/${mangaId}/${chapId}`,
      metadata: metadata,
      method: 'GET',
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let $ = this.cheerio.load(data)
    let pages: string[] = []

    // Get all of the pages
    let pageListContext = $('#page-list').toArray()[0]
    let numPages = $('option', $(pageListContext)).toArray().length

    for(let i = 1; i <= numPages; i++) {
        
        // Pages when below 10 are listed as 01, 02 etc. Enforce this
        let y
        if(i < 10) {
            y = '0' + i + '.jpg'
        }
        else {
            y = i + '.jpg'
        }
        
        pages.push(`${READCOMICSONLINE_DOMAIN}/uploads/manga/${metadata.mangaId}/chapters/${metadata.chapterId}/${y}`)
    }

    return createChapterDetails({
        id: metadata.chapterId,
        mangaId: metadata.mangaId,
        pages: pages,
        longStrip: false
    })
  }


  searchRequest(query: SearchRequest): Request | null {

    let metadata = {searchQuery: query.title}

    return createRequestObject({
      url: `${READCOMICSONLINE_DOMAIN}/search`,
      timeout: 4000,
      metadata: metadata,
      method: "GET"
    })
  }

  search(data: any, metadata: any): PagedResults {

    let mangaTiles: MangaTile[] = []

    let obj = JSON.parse(data)

    // Parse the json context
    for(let entry of obj.suggestions) {
        // Is this relevent to the query?
        if(entry.value.includes(metadata.searchQuery)) {
            let image = `${READCOMICSONLINE_DOMAIN}/uploads/manga/${entry.data}/cover/cover_250x350.jpg`

            mangaTiles.push(createMangaTile({
                id: entry.data,
                title: createIconText({text: entry.value}),
                image: image
            }))
        }
    }

    // Because we're reading JSON, there will never be another page to search through
    return createPagedResults({
      results: mangaTiles
    })

  }

  getHomePageSectionRequest(): HomeSectionRequest[] | null {

    let request = createRequestObject({ url: `${READCOMICSONLINE_DOMAIN}`, method: 'GET', })
    let homeSection = createHomeSection({ id: 'latest_comics', title: 'LATEST COMICS' })
    return [createHomeSectionRequest({ request: request, sections: [homeSection] })]

  }

  getHomePageSections(data: any, section: HomeSection[]): HomeSection[] | null {
    let popularComics: MangaTile[] = []
    let $ = this.cheerio.load(data)

    let context = $('.list-container').toArray()[2]
    for(let obj of $('.col-sm-6', $(context)).toArray()) {
        let img = `https:${$('img', $(obj)).attr('src')}`
        let id = $('a', $(obj)).attr('href')?.replace(`${READCOMICSONLINE_DOMAIN}/comic/`, '')
        let title = $('strong', $(obj)).text().trim()

        // If there was not a valid ID parsed, skip this entry
        if(!id) {
            continue
        }

        // Ensure that this title doesn't exist in the tile list already, as it causes weird glitches if so.
        // This unfortunately makes this method O(n^2) but there never will be many elements
        let foundItem = false
        for(let item of popularComics) {
          if(item.id == id) {
            foundItem = true
            break
          }
        }

        if(foundItem) {
          continue
        }

        popularComics.push(createMangaTile({
            id: id,
            title: createIconText({text: title}),
            image: img
        }))
    }

    section[0].items = popularComics
    return section
  }

}
