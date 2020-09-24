import { Source, Manga, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, Request, MangaUpdates, MangaStatus, LanguageCode, PagedResults } from "paperback-extensions-common"

export class MangaReader extends Source {

  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '1.1.0' }
  get name(): string { return 'MangaReader' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'Syn' }
  get authorWebsite(): string { return 'https://github.com/Synstress' }
  get description(): string { return 'Extension that pulls manga from MangReader, includes Advanced Search and Updated manga fetching' }
  get hentaiSource(): boolean { return false }

  get rateLimit() { return 100 }

  getMangaDetailsRequest(ids: string[]): Request[] {
    return [createRequestObject({
      metadata: ids[0],
      url: "https://mangareader.net/" + ids[0],
      method: 'GET'
    })]
  }
  getMangaDetails(data: any, metadata: any): Manga[] {
    let $ = this.cheerio.load(data)
    let status = $("#main table.d41 tr:nth-child(4) td:nth-child(2)").text().toLowerCase()


    return [createManga({
      id: metadata,
      titles: [$("#main .d40").text().replace(/\s?(manga)\s?$/gi, '')],
      image: $('#main .d38 img').attr('src')!.replace(/^(\/\/)/gi, 'https://'),
      rating: 0,
      status: status == "ongoing" ? MangaStatus.ONGOING : MangaStatus.COMPLETED,
      artist: $("#main table.d41 tr:nth-child(6) td:nth-child(2)").text(),
      author: $("#main table.d41 tr:nth-child(5) td:nth-child(2)").text(),
      desc: $("#main .d46 p").text().replace(/\&amp\;quot\;/gi, "'"), hentai: false
    })]
  }

  getChaptersRequest(mangaId: string): Request {
    return createRequestObject({
      metadata: mangaId,
      url: "https://mangareader.net/" + mangaId,
      method: 'GET'
    })
  }
  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let chapters = $("#main table.d48 tr:not([class])").toArray()
    let chapterList = []
    let nameRegex = /^(.+)(?=\s\d)/gi
    let chapterNumberRegex = /(\d+$)/gi
    for (let chapter of chapters) {
      let chapterTitleAnchor = $('a', chapter)
      let chapterNumber = chapterTitleAnchor.text().match(chapterNumberRegex)
      // paste stuff here from now on
      chapterList.push(createChapter({
        id: chapterNumber != null ? chapterNumber[0].toString() : "0",
        chapNum: Number(chapterNumber != null ? chapterNumber[0].toString() : "0"),
        langCode: LanguageCode.ENGLISH,
        volume: 0,
        mangaId: metadata,
        name: "",
        time: new Date($("td:nth-child(2)", chapter).text()),
      }))
    }
    return chapterList
  }

  searchRequest(query: SearchRequest): Request | null {
    return createRequestObject({
      url: "https://www.mangareader.net/search/?nsearch=&msearch=" + encodeURI(query.title ?? ""),
      method: "GET"
    })
  }
  search(data: any, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let searchResults = $("#ares table tr").toArray()

    let mangas = []
    for (let result of searchResults) {
      mangas.push(createMangaTile({
        id: $("a", result).attr('href')!.toString().replace(/\//gi, ''),
        image: $("div[data-src]", result).attr('data-src')!.toString().replace(/^(\/\/)/g, 'https://').replace(/-r(?=\d)/gi, '-l'),
        title: createIconText({ text: $("a", result).text() })
      }))
    }

    //TODO: This source did not include multi-page searching origionally, it still will need added for advanced search methods
    return createPagedResults({
      results: mangas
    })
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    return createRequestObject({
      url: "https://mangareader.net/" + mangaId + "/" + chapId,
      method: 'GET',
      cookies: [createCookie({
        name: "drs",
        value: "2",
        domain: "https://www.mangareader.net"
      })],
      metadata: {
        chapId: chapId,
        mangaId: mangaId
      }
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let $ = this.cheerio.load(data, { xmlMode: false })

    let allPages: any = eval("let document = {}; " + $("#main script").html() + "; document['mj'];")

    let pages = []
    for (let page of allPages.im) {
      pages.push(page.u.replace(/^(\/\/)/g, 'https://'))
    }

    return createChapterDetails({
      id: metadata.chapId,
      longStrip: false,
      mangaId: metadata.mangaId,
      pages: pages
    })
  }
  getHomePageSectionRequest(): HomeSectionRequest[] {
    let request1 = createRequestObject({
      url: 'https://www.mangareader.net/popular',
      method: "GET"
    })
    let section1 = createHomeSection({ id: 'popular_manga', title: 'POPULAR MANGA' })
    return [
      createHomeSectionRequest({
        request: request1,
        sections: [section1]
      })
    ]
  }
  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    let $ = this.cheerio.load(data)
    return sections.map(section => {
      switch (section.id) {
        case 'popular_manga':
          section.items = this.parsePopularMangaTitles($)
          break;
      }

      return section
    })
  }
  parsePopularMangaTitles($: CheerioSelector): MangaTile[] {
    let searchResults = $("#main .d38 table tr").toArray()

    let mangas = []
    for (let result of searchResults) {
      mangas.push(createMangaTile({
        id: $("a", result).attr('href')!.toString().replace(/\//gi, ''),
        image: $("div[data-src]", result).attr('data-src')!.toString().replace(/^(\/\/)/g, 'https://').replace(/-r(?=\d)/gi, '-l'),
        title: createIconText({ text: $("a", result).text() })
      }))
    }

    return mangas
  }
}