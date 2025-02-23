import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, PagedResults, SourceTag, TagType, MangaUpdates } from "paperback-extensions-common"

const READMNGCOM_DOMAIN = 'https://www.readmng.com'

export class ReadmngCom extends Source {
    constructor(cheerio: CheerioAPI) {
        super(cheerio)
    }

    get version(): string { return '0.0.9' }
    get name(): string { return 'readmng.com' }
    get icon(): string { return 'logo.png' }
    get author(): string { return 'Vregat' }
    get authorWebsite(): string { return 'https://github.com/vregat/extensions-beta' }
    get description(): string { return 'Extension that pulls mangas from readmng.com' }
    get hentaiSource(): boolean { return false }
    get websiteBaseURL(): string { return READMNGCOM_DOMAIN }
    get rateLimit(): Number { return 5 }

    get sourceTags(): SourceTag[] {
        return [
            {
                text: "Notifications",
                type: TagType.GREEN
            }
        ]
    }

    getMangaDetailsRequest(ids: string[]): Request[] {
        let requests: Request[] = []
        for (let id of ids) {
            let metadata = { 'id': id }
            requests.push(createRequestObject({
                url: `${READMNGCOM_DOMAIN}/${id}`,
                metadata: metadata,
                method: 'GET'
            }))
        }
        return requests
    }

    getMangaDetails(data: any, metadata: any): Manga[] {
        let manga: Manga[] = []

        let $ = this.cheerio.load(data)
        let panel = $('.panel-body')
        let title = $('.img-responsive', panel).attr('alt') ?? ''
        let image = $('.img-responsive', panel).attr('src') ?? ''

        let titles = [title].concat($('.dl-horizontal > dd:nth-child(2)', panel).text().split(/,|;/))
        let status = $('.dl-horizontal > dd:nth-child(4)', panel).text().toString() == 'Completed' ? MangaStatus.COMPLETED : MangaStatus.ONGOING
        let views = +$('.dl-horizontal > dd:nth-child(10)', panel).text().split(',').join('')

        let genres = []
        for (let tagElement of $('.dl-horizontal > dd:nth-child(6)', panel).find('a').toArray()) {
            let id = $(tagElement).attr('href').replace(`${READMNGCOM_DOMAIN}/category/`, '')
            let text = $(tagElement).contents().text()
            genres.push(createTag({ id: id, label: text }))
        }

        let genresSection = createTagSection({ id: 'genre', label: 'Genre', tags: genres })

        let description = $('.movie-detail').text().trim()

        let castList = $('ul.cast-list')
        let authorElement = $('li:contains("Author")', castList)
        let author = $("li > a", authorElement).text().trim()

        let artistElement = $('li:contains("Artist")', castList)
        let artist = $("li > a", artistElement).text().trim()

        let rating = +$('div.progress-bar-success').attr('title').replace('%', '')

        manga.push(createManga({
            id: metadata.id,
            titles: titles,
            image: image,
            rating: rating,
            status: status,
            views: views,
            desc: description,
            tags: [genresSection],
            author: author,
            artist: artist
        }))

        return manga
    }

    getChaptersRequest(mangaId: string): Request {
        let metadata = { 'id': mangaId }
        return createRequestObject({
            url: `${READMNGCOM_DOMAIN}/${mangaId}`,
            metadata: metadata,
            method: 'GET'
        })
    }

    getChapters(data: any, metadata: any): Chapter[] {
        let $ = this.cheerio.load(data)
        let allChapters = $('ul.chp_lst')
        let chapters: Chapter[] = []
        let chNum: number = $('ul.chp_lst > li').toArray().length - 1

        for (let chapter of $('li', allChapters).toArray()) {
            let id: string = $('a', chapter).attr('href')?.split('/').pop() ?? ''
            let name: string = $('a > .val', chapter).text().trim() ?? ''

            let time = $('a > .dte', chapter).text().trim() ?? ''
            let timeValue = +time.split(' ')[0]

            let parsedDate = new Date(Date.now())

            if (time.includes('Second')) {
                parsedDate.setSeconds(parsedDate.getSeconds() - timeValue)
            } else if (time.includes('Minute')) {
                parsedDate.setMinutes(parsedDate.getMinutes() - timeValue)
            } else if (time.includes('Hour')) {
                parsedDate.setHours(parsedDate.getHours() - timeValue)
            } else if (time.includes('Day')) {
                parsedDate.setDate(parsedDate.getDate() - timeValue)
            } else if (time.includes('Week')) {
                parsedDate.setDate(parsedDate.getDate() - (timeValue * 7))
            } else if (time.includes('Month')) {
                parsedDate.setMonth(parsedDate.getMonth() - timeValue)
            } else if (time.includes('Year')) {
                parsedDate.setFullYear(parsedDate.getFullYear() - timeValue)
            }

            chapters.push(createChapter({
                id: id,
                mangaId: metadata.id,
                name: name,
                langCode: LanguageCode.ENGLISH,
                chapNum: chNum,
                time: parsedDate
            }))
            chNum--
        }
        return chapters
    }

    getChapterDetailsRequest(mangaId: string, chapId: string): Request {
        let metadata = { 'mangaId': mangaId, 'chapterId': chapId }
        return createRequestObject({
            url: `${READMNGCOM_DOMAIN}/${mangaId}/${chapId}/all-pages`,
            metadata: metadata,
            method: 'GET'
        })
    }

    getChapterDetails(data: any, metadata: any): ChapterDetails {
        let $ = this.cheerio.load(data)

        let pages: string[] = []
        for (const page of $('.page_chapter > .img-responsive').toArray()) {
            pages.push($(page).attr('src') ?? '')
        }

        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        })
        return chapterDetails
    }

    searchRequest(query: SearchRequest): Request | null {
        let title = (query.title ?? '').split(' ').join('+')
        let author = (query.author ?? '').split(' ').join('+')
        let artist = (query.artist ?? '').split(' ').join('+')

        let status = ''
        switch (query.status) {
            case 0:
                status = 'completed'
                break;
            case 1:
                status = 'ongoing'
                break;
            default:
                status = 'both'
                break;
        }

        return createRequestObject({
            url: `${READMNGCOM_DOMAIN}/service/advanced_search`,
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            data: {
                'type': 'all',
                'manga-name': title,
                'author-name': author,
                'artist-name': artist,
                'status': status
            }
        })
    }

    search(data: any, metadata: any): PagedResults | null {
        let $ = this.cheerio.load(data)

        let manga: MangaTile[] = []

        for (let item of $('.style-list > div.box').toArray()) {
            let id = $('.title a', item).attr('href')?.replace(`${READMNGCOM_DOMAIN}/`, '') ?? ''
            let title = $('.title a', item).attr('title') ?? ''
            let img = $('.body a > img', item).attr('src') ?? ''

            manga.push(createMangaTile({
                id: id,
                title: createIconText({ text: title }),
                image: img
            }))
        }

        return createPagedResults({
            results: manga
        })
    }

    getMangaShareUrl(mangaId: string): string | null { return `${READMNGCOM_DOMAIN}/${mangaId}` }

    getHomePageSectionRequest(): HomeSectionRequest[] {
        let latestRequest = createRequestObject({ url: `${READMNGCOM_DOMAIN}/latest-releases`, method: 'GET' })
        let hotRequest = createRequestObject({ url: `${READMNGCOM_DOMAIN}/hot-manga`, method: 'GET' })

        let latestSection = createHomeSection({
            id: 'latest_releases',
            title: 'LATEST RELEASES'
        })
        let hotSection = createHomeSection({
            id: 'hot_manga',
            title: 'HOT MANGA'
        })
        return [createHomeSectionRequest({ request: latestRequest, sections: [latestSection] }), createHomeSectionRequest({ request: hotRequest, sections: [hotSection] })]
    }

    getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
        if (sections[0].id == 'hot_manga') {
            sections[0].items = this.parseHotManga(data)
        }
        if (sections[0].id == 'latest_releases') {
            sections[0].items = this.parseLatestReleases(data)
        }
        return sections
    }

    parseLatestReleases(data: any): MangaTile[] {
        let result: MangaTile[] = []
        let $ = this.cheerio.load(data)
        let pages = $('div.content-list div.style-thumbnail')
        for (let item of $('li', pages).toArray()) {
            let id = $('.thumbnail', item).attr('href')?.replace(`${READMNGCOM_DOMAIN}/`, '') ?? ''
            let img = $('.thumbnail img', item).attr('src') ?? ''
            let title = $('.thumbnail', item).attr('title')?.replace(`${READMNGCOM_DOMAIN}/`, '') ?? ''

            result.push(createMangaTile({
                id: id,
                image: img,
                title: createIconText({ text: title })
            }))
        }
        return result
    }

    parseHotManga(data: any): MangaTile[] {
        let result: MangaTile[] = []
        let $ = this.cheerio.load(data)
        let pages = $('div.style-list')
        for (let item of $('div.box', pages).toArray()) {
            let id = $('.body > .left > a', item).attr('href')?.replace(`${READMNGCOM_DOMAIN}/`, '') ?? ''
            let img = $('.body > .left img', item).attr('src') ?? ''
            let title = $('.body > .left > a', item).attr('title')?.replace(`${READMNGCOM_DOMAIN}/`, '') ?? ''

            result.push(createMangaTile({
                id: id,
                image: img,
                title: createIconText({ text: title })
            }))
        }
        return result
    }

    createFilterUpdatedMangaRequest(metadata: any): Request {
        return createRequestObject({
            url: `${READMNGCOM_DOMAIN}/latest-releases/${metadata.page}`,
            metadata: metadata,
            method: 'GET'
        })
    }

    filterUpdatedMangaRequest(ids: any, time: Date): Request {
        time.setHours(0, 0, 0, 0) //website does not use hours/minutes/seconds
        let metadata = { 'ids': ids, 'time': time, page: 1 }
        return this.createFilterUpdatedMangaRequest(metadata)
    }

    filterUpdatedManga(data: any, metadata: any): MangaUpdates {
        let passedTime = false
        let $ = this.cheerio.load(data)
        let updatedManga = $('.manga_updates')

        let returnObject: MangaUpdates = {
            ids: [],
            nextPage: undefined
        }

        for (let manga of $('dl', updatedManga).toArray()) {
            let item = $('dt', manga)
            let mangaInfo = $('a.manga_info', item).attr('href').replace(`${READMNGCOM_DOMAIN}/`, '')
            let updatedDate = $('span.time', item).contents().text().split('/')
            let parsedDate = new Date(+updatedDate[2], (+updatedDate[1]) - 1, +updatedDate[0])

            let numChapters = $('dd', manga).toArray().length

            passedTime = parsedDate < metadata.time
            if (!passedTime) {
                if (metadata.ids.includes(mangaInfo)) {
                    for (let c = 0; c < numChapters; c++) {
                        returnObject.ids.push(mangaInfo)
                    }
                }
            } else {
                break
            }
        }

        if (!passedTime) {
            metadata.page++;
            returnObject.nextPage = this.createFilterUpdatedMangaRequest(metadata)
        }

        return createMangaUpdates(returnObject)
    }
}