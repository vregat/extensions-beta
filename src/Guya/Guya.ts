import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  MangaTile,
  HomeSectionRequest,
  HomeSection,
  SearchRequest,
  Request,
  LanguageCode,
  MangaStatus,
  MangaUpdates,
  PagedResults
} from "paperback-extensions-common";

const GUYA_API_BASE = "https://guya.moe";
const GUYA_SERIES_API_BASE = `${GUYA_API_BASE}/api/series`;
const GUYA_ALL_SERIES_API = `${GUYA_API_BASE}/api/get_all_series/`;
const GUYA_LANG = "en";
const SPLIT_VAR = "|";

export class Guya extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }

  get version(): string {
    return "1.0.3";
  }
  get name(): string {
    return "Guya";
  }
  get icon(): string {
    return "icon.png";
  }
  get author(): string {
    return "funkyhippo";
  }
  get authorWebsite(): string {
    return "https://github.com/funkyhippo";
  }
  get description(): string {
    return "Extension that pulls manga from guya.moe";
  }
  get language(): string {
    return GUYA_LANG;
  }
  get hentaiSource(): boolean {
    return false;
  }
  get rateLimit(): Number {
    return 2
  }

  get websiteBaseURL(): string { return GUYA_API_BASE }

  getMangaDetailsRequest(ids: string[]): Request[] {
    return [
      createRequestObject({
        metadata: { ids },
        url: GUYA_ALL_SERIES_API,
        method: "GET",
      }),
    ];
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let result = typeof data === "string" ? JSON.parse(data) : data;

    let mangas = [];
    for (let series in result) {
      let seriesDetails = result[series];
      if (metadata.ids.includes(seriesDetails["slug"])) {
        mangas.push(
          createManga({
            id: seriesDetails["slug"],
            titles: [series],
            image: `${GUYA_API_BASE}/${seriesDetails["cover"]}`,
            rating: 5,
            status: MangaStatus.ONGOING,
            artist: seriesDetails["artist"],
            author: seriesDetails["author"],
            desc: seriesDetails["description"],
          })
        );
      }
    }

    return mangas;
  }

  getChaptersRequest(mangaId: string): Request {
    return createRequestObject({
      metadata: { mangaId },
      url: `${GUYA_SERIES_API_BASE}/${mangaId}/`,
      method: "GET",
    });
  }

  getChapters(data: any, metadata: any): Chapter[] {
    let result = typeof data === "string" ? JSON.parse(data) : data;
    let rawChapters = result["chapters"];
    let groupMap = result["groups"];

    let chapters = [];
    for (let chapter in rawChapters) {
      let chapterMetadata = rawChapters[chapter];
      for (let group in chapterMetadata["groups"]) {
        chapters.push(
          createChapter({
            id: `${chapter}${SPLIT_VAR}${group}`,
            mangaId: metadata.mangaId,
            chapNum: Number(chapter),
            langCode: LanguageCode.ENGLISH,
            name: chapterMetadata["title"],
            volume: chapterMetadata["volume"],
            group: groupMap[group],
            time: new Date(
              Number(chapterMetadata["release_date"][group]) * 1000
            ),
          })
        );
      }
    }
    return chapters;
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    return createRequestObject({
      metadata: { mangaId, chapId },
      url: `${GUYA_SERIES_API_BASE}/${mangaId}/`,
      method: "GET",
    });
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let result = typeof data === "string" ? JSON.parse(data) : data;
    let rawChapters = result["chapters"];
    let [chapter, group] = metadata["chapId"].split(SPLIT_VAR);
    return createChapterDetails({
      id: metadata["chapId"],
      longStrip: false,
      mangaId: metadata["mangaId"],
      pages: rawChapters[chapter]["groups"][group].map(
        (page: string) =>
          `${GUYA_API_BASE}/media/manga/${metadata["mangaId"]}/chapters/${rawChapters[chapter]["folder"]}/${group}/${page}`
      ),
    });
  }

  searchRequest(query: SearchRequest): Request | null {
    return createRequestObject({
      metadata: { query: query.title },
      url: GUYA_ALL_SERIES_API,
      method: "GET",
    });
  }

  search(data: any, metadata: any): PagedResults | null {
    let result = typeof data === "string" ? JSON.parse(data) : data;
    let query = metadata["query"].toLowerCase();

    let filteredResults = Object.keys(result).filter((e) =>
      e.toLowerCase().includes(query)
    );

    let tiles =  filteredResults.map((series) => {
      let seriesMetadata = result[series];
      return createMangaTile({
        id: seriesMetadata["slug"],
        image: `${GUYA_API_BASE}/${seriesMetadata["cover"]}`,
        title: createIconText({ text: series }),
      });
    });

    return createPagedResults({
      results: tiles
    })
  }

  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    return [
      createHomeSectionRequest({
        request: createRequestObject({
          url: GUYA_ALL_SERIES_API,
          method: "GET",
        }),
        sections: [createHomeSection({ id: "all_guya", title: "ALL GUYA" })],
      }),
    ];
  }

  getHomePageSections(
    data: any,
    sections: HomeSection[]
  ): HomeSection[] | null {
    let result = typeof data === "string" ? JSON.parse(data) : data;

    return sections.map((section) => {
      let mangas = [];
      for (let series in result) {
        let seriesDetails = result[series];
        mangas.push(
          createMangaTile({
            id: seriesDetails["slug"],
            image: `${GUYA_API_BASE}/${seriesDetails["cover"]}`,
            title: createIconText({ text: series }),
          })
        );
      }
      section.items = mangas;
      return section;
    });
  }

  filterUpdatedMangaRequest(
    ids: string[],
    time: Date
  ): Request | null {
    let metadata = { ids: ids, referenceTime: time };

    return createRequestObject({
      metadata,
      url: GUYA_ALL_SERIES_API,
      method: "GET",
    });
  }

  filterUpdatedManga(data: any, metadata: any): MangaUpdates {
    let result = typeof data === "string" ? JSON.parse(data) : data;

    let ids = [];
    let moreResults = false;

    for (let series in result) {
      let seriesDetails = result[series];
      let seriesUpdated = new Date(seriesDetails["last_updated"] * 1000);
      if (
        seriesUpdated >= metadata.referenceTime &&
        metadata.ids.includes(series)
      ) {
        ids.push(series);
      }
    }
    return createMangaUpdates({ ids });
  }

  getMangaShareUrl(mangaId: string) {
    return `${GUYA_API_BASE}/read/manga/${mangaId}/`;
  }
}
