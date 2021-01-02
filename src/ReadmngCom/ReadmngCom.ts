import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, PagedResults, SourceTag, TagType, MangaUpdates } from "paperback-extensions-common"

const READMNGCOM_DOMAIN = 'https://www.readmng.com'
const DEBUG = true

export class ReadmngCom extends Source {
    constructor(cheerio: CheerioAPI) {
        super(cheerio)
    }

    get version(): string { return '0.0.2' }
    get name(): string { return 'readmng.com' }
    get icon(): string { return 'logo.png' }
    get author(): string { return 'Vregat' }
    get description(): string { return 'Extension that pulls mangas from readmng.com' }
    get hentaiSource(): boolean { return false }
    get websiteBaseURL(): string { return READMNGCOM_DOMAIN }
    get rateLimit(): Number { return 5 }

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
        let status = $('.dl-horizontal > dd:nth-child(3)', panel).text() == "Completed" ? MangaStatus.COMPLETED : MangaStatus.ONGOING
        let views = Number($('.dl-horizontal > dd:nth-child(10)', panel).text().replace(',', ''))
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]

        for (let tagElement of $('.dl-horizontal > dd:nth-child(6)', panel).find('a').toArray()) {
            let id = $(tagElement).attr('href').replace(`${READMNGCOM_DOMAIN}/`, '')
            let text = $(tagElement).contents().text()
            tagSections[0].tags.push(createTag({ id: id, label: text }))
        }

        let description = $('.movie-detail').text().trim()

        let author = '' //TODO
        let artist = '' //TODO

        let rating = 0 //TODO

        manga.push(createManga({
            id: metadata.id,
            titles: titles,
            image: image,
            rating: rating,
            status: status,
            views: views,
            desc: description,
            tags: tagSections,
            author: author,
            artist: artist
        }))

        if (DEBUG) {
            console.log('Viewing manga details', metadata.id, titles, image, rating, status, views, description, tagSections, author, artist)
        }

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
        let allChapters = $('div.panel-body')
        let chapters: Chapter[] = []
        let chNum: number = $('div.panel-body > ul.chp_lst > li').toArray().length - 1

        if (DEBUG) {
            console.log('Data', data)
            console.log('Chapter count', chNum)
        }

        for (let chapter of $('li', allChapters).toArray()) {
            /*let id: string = $('a', chapter).attr('href')?.split('/').pop() ?? ''
            let name: string = $('a > .val', chapter).text().trim() ?? ''
            let time: Date = new Date($('a > .dte', chapter).attr('title').replace('Published on', '').trim() ?? '')

            if (DEBUG) {
                console.log('Found chapter', id, name, time, chNum)
            }

                        chapters.push(createChapter({
                            id: id,
                            mangaId: metadata.mangaId,
                            name: name,
                            langCode: LanguageCode.ENGLISH,
                            chapNum: chNum,
                            time: time
                        }))
            */
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

            if (DEBUG) {
                console.log('Found page', $(page).attr('src') ?? '')
            }
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
        let title = query.title ?? ''
        return createRequestObject({
            url: `${READMNGCOM_DOMAIN}/service/advanced_search`,
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            data: {
                'type': 'all',
                'manga-name': query.title,
                'author-name': '',
                'artist-name': '',
                'status': 'both'
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

            if (DEBUG) {
                console.log('Found manga', id, title, img)
            }

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
}