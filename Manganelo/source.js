(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Madara = void 0;
const Source_1 = require("./Source");
const Manga_1 = require("../models/Manga");
class Madara extends Source_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    //This is to let Madara sources override selectors without needing to override whole methods
    get titleSelector() { return 'div.post-title h1'; }
    get authorSelector() { return 'div.author-content'; }
    get genresSelector() { return 'div.genres-content a'; }
    get artistSelector() { return 'div.artist-content'; }
    get ratingSelector() { return 'span#averagerate'; }
    get thumbnailSelector() { return 'div.summary_image img'; }
    get thumbnailAttr() { return 'src'; }
    get chapterListSelector() { return 'li.wp-manga-chapter'; }
    get pageListSelector() { return 'div.page-break'; }
    get pageImageAttr() { return 'src'; }
    get searchMangaSelector() { return 'div.c-tabs-item__content'; }
    get searchCoverAttr() { return 'src'; }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: this.MadaraDomain + "/manga/" + id,
                metadata: metadata,
                method: 'GET'
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b;
        let manga = [];
        let $ = this.cheerio.load(data);
        let title = $(this.titleSelector).first().children().remove().end().text().trim();
        let titles = [title];
        titles.push.apply(titles, $('div.summary-content').eq(2).text().trim().split(", "));
        let author = $(this.authorSelector).text().trim();
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
        for (let genre of $(this.genresSelector).toArray()) {
            let id = (_b = (_a = $(genre).attr("href")) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let tag = $(genre).text();
            tagSections[0].tags.push(createTag({ id: id, label: tag }));
        }
        let status = ($("div.summary-content").last().text() == "Completed") ? Manga_1.MangaStatus.COMPLETED : Manga_1.MangaStatus.ONGOING;
        let averageRating = $(this.ratingSelector).text().trim();
        let src = $(this.thumbnailSelector).attr(this.thumbnailAttr);
        //Not sure if that double slash happens with any Madara source, but added just in case
        src = (src === null || src === void 0 ? void 0 : src.startsWith("http")) ? src : this.MadaraDomain + (src === null || src === void 0 ? void 0 : src.replace("//", ""));
        let artist = $(this.artistSelector).text().trim();
        let description = ($("div.description-summary  div.summary__content").find("p").text() != "") ? $("div.description-summary  div.summary__content").find("p").text().replace(/<br>/g, '\n') : $("div.description-summary  div.summary__content").text();
        return [createManga({
                id: metadata.id,
                titles: titles,
                image: src,
                avgRating: Number(averageRating),
                rating: Number(averageRating),
                author: author,
                artist: artist,
                desc: description,
                status: status,
                tags: tagSections,
                langName: this.language,
                langFlag: this.langFlag
            })];
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapters(data, metadata) {
        let $ = this.cheerio.load(data);
        let chapters = [];
        for (let elem of $(this.chapterListSelector).toArray()) {
            let name = $(elem).find("a").first().text().trim();
            let id = /[0-9.]+/.exec(name)[0];
            let imgDate = $(elem).find("img").attr("alt");
            let time = (imgDate != undefined) ? this.convertTime(imgDate) : this.parseChapterDate($(elem).find("span.chapter-release-date i").first().text());
            chapters.push(createChapter({
                id: id !== null && id !== void 0 ? id : '',
                chapNum: Number(id),
                mangaId: metadata.id,
                name: name,
                time: time,
                langCode: this.langCode,
            }));
        }
        return chapters;
    }
    parseChapterDate(date) {
        if (date.toLowerCase().includes("ago")) {
            return this.convertTime(date);
        }
        if (date.toLowerCase().startsWith("yesterday")) {
            //To start it at the beginning of yesterday, instead of exactly 24 hrs prior to now
            return new Date((Math.floor(Date.now() / 86400000) * 86400000) - 86400000);
        }
        if (date.toLowerCase().startsWith("today")) {
            return new Date(Math.floor(Date.now() / 86400000) * 8640000);
        }
        if (/\d+(st|nd|rd|th)/.test(date)) {
            let match = /\d+(st|nd|rd|th)/.exec(date)[0];
            let day = match.replace(/\D/g, "");
            return new Date(date.replace(match, day));
        }
        return new Date(date);
    }
    getChapterDetailsRequest(mangaId, chId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}/chapter-${chId.replace('.', '-')}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapterDetails(data, metadata) {
        var _a;
        let pages = [];
        let $ = this.cheerio.load(data);
        let pageElements = $(this.pageListSelector);
        for (let page of pageElements.toArray()) {
            pages.push((_a = $(page)) === null || _a === void 0 ? void 0 : _a.find("img").first().attr(this.pageImageAttr).trim());
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    constructSearchRequest(query, page) {
        var _a;
        let url = `${this.MadaraDomain}/page/${page}/?`;
        let author = query.author || '';
        let artist = query.artist || '';
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(",");
        let paramaters = { "s": query.title, "post_type": "wp-manga", "author": author, "artist": artist, "genres": genres };
        return createRequestObject({
            url: url + new URLSearchParams(paramaters).toString(),
            method: 'GET',
            metadata: {
                request: query,
                page: page
            }
        });
    }
    searchRequest(query) {
        var _a;
        return (_a = this.constructSearchRequest(query, 1)) !== null && _a !== void 0 ? _a : null;
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let mangas = [];
        for (let manga of $(this.searchMangaSelector).toArray()) {
            let id = (_b = (_a = $("div.post-title a", manga).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/")[4]) !== null && _b !== void 0 ? _b : '';
            if (!id.endsWith("novel")) {
                let cover = $("img", manga).first().attr(this.searchCoverAttr);
                cover = (cover === null || cover === void 0 ? void 0 : cover.startsWith("http")) ? cover : this.MadaraDomain + (cover === null || cover === void 0 ? void 0 : cover.replace("//", "/"));
                let title = $("div.post-title a", manga).text();
                let author = $("div.summary-content > a[href*=manga-author]", manga).text().trim();
                let alternatives = $("div.summary-content", manga).first().text().trim();
                mangas.push(createMangaTile({
                    id: id,
                    image: cover,
                    title: createIconText({ text: title !== null && title !== void 0 ? title : '' }),
                    subtitleText: createIconText({ text: author !== null && author !== void 0 ? author : '' })
                }));
            }
        }
        return createPagedResults({
            results: mangas,
            nextPage: (_c = this.constructSearchRequest(metadata.query, metadata.page + 1)) !== null && _c !== void 0 ? _c : undefined
        });
    }
}
exports.Madara = Madara;

},{"../models/Manga":11,"./Source":3}],3:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }
    /**
     * An optional field where the author may put a link to their website
     */
    get authorWebsite() { return null; }
    /**
     * An optional field that defines the language of the extension's source
     */
    get language() { return 'all'; }
    /**
     * An optional field of source tags: Little bits of metadata which is rendered on the website
     * under your repositories section
     */
    get sourceTags() { return []; }
    // <-----------        OPTIONAL METHODS        -----------> //
    requestModifier(request) { return request; }
    getMangaShareUrl(mangaId) { return null; }
    getCloudflareBypassRequest() { return null; }
    /**
     * Returns the number of calls that can be done per second from the application
     * This is to avoid IP bans from many of the sources
     * Can be adjusted per source since different sites have different limits
     */
    get rateLimit() { return 2; }
    /**
     * (OPTIONAL METHOD) Different sources have different tags available for searching. This method
     * should target a URL which allows you to parse apart all of the available tags which a website has.
     * This will populate tags in the iOS application where the user can use
     * @returns A request object which can provide HTML for determining tags that a source uses
     */
    getTagsRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getTags}
     * and generate a list of {@link TagSection} objects, determining what sections of tags an app has, as well as
     * what tags are associated with each section
     * @param data HTML which can be parsed to get tag information
     */
    getTags(data) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle generating a request for determining whether or
     * not a manga has been updated since a specific reference time.
     * This method is different depending on the source. A current implementation for a source, as example,
     * is going through multiple pages of the 'latest' section, and determining whether or not there
     * are entries available before your supplied date.
     * @param ids The manga IDs which you are searching for updates on
     * @param time A {@link Date} marking the point in time you'd like to search up from.
     * Eg, A date of November 2020, when it is currently December 2020, should return all instances
     * of the image you are searching for, which has been updated in the last month
     * @param page A page number parameter may be used if your update scanning requires you to
     * traverse multiple pages.
     */
    filterUpdatedMangaRequest(ids, time) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.filterUpdatedMangaRequest}
     * and generate a list manga which has been updated within the timeframe specified in the request.
     * @param data HTML which can be parsed to determine whether or not a Manga has been updated or not
     * @param metadata Anything passed to the {@link Request} object in {@link Source.filterUpdatedMangaRequest}
     * with the key of metadata will be available to this method here in this parameter
     * @returns A list of mangaID which has been updated. Also, a nextPage parameter is required. This is a flag
     * which should be set to true, if you need to traverse to the next page of your search, in order to fully
     * determine whether or not you've gotten all of the updated manga or not. This will increment
     * the page number in the {@link Source.filterUpdatedMangaRequest} method and run it again with the new
     * parameter
     */
    filterUpdatedManga(data, metadata) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should generate a {@link HomeSectionRequest} with the intention
     * of parsing apart a home page of a source, and grouping content into multiple categories.
     * This does not exist for all sources, but sections you would commonly see would be
     * 'Latest Manga', 'Hot Manga', 'Recommended Manga', etc.
     * @returns A list of {@link HomeSectionRequest} objects. A request for search section on the home page.
     * It is likely that your request object will be the same in all of them.
     */
    getHomePageSectionRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getHomePageSectionRequest}
     * and finish filling out the {@link HomeSection} objects.
     * Generally this simply should update the parameter objects with all of the correct contents, and
     * return the completed array
     * @param data The HTML which should be parsed into the {@link HomeSection} objects. There may only be one element in the array, that is okay
     * if only one section exists
     * @param section The list of HomeSection objects which are unfinished, and need filled out
     */
    getHomePageSections(data, section) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart a page
     * and generate different {@link MangaTile} objects which can be found on it
     * @param data HTML which should be parsed into a {@link MangaTile} object
     * @param key
     */
    getViewMoreItems(data, key, metadata) { return null; }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
}
exports.Source = Source;

},{}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Madara"), exports);
__exportStar(require("./Source"), exports);

},{"./Madara":2,"./Source":3}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":4,"./models":19}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],9:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],12:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],13:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],14:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],15:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],16:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],18:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],19:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);

},{"./Chapter":6,"./ChapterDetails":7,"./Constants":8,"./HomeSection":9,"./Languages":10,"./Manga":11,"./MangaTile":12,"./MangaUpdate":13,"./PagedResults":14,"./RequestObject":15,"./SearchRequest":16,"./SourceTag":17,"./TagSection":18}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manganelo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MN_DOMAIN = 'https://manganelo.com';
class Manganelo extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    get version() { return '1.3.0'; }
    get name() { return 'Manganelo'; }
    get icon() { return 'icon.png'; }
    get author() { return 'Daniel Kovalevich'; }
    get authorWebsite() { return 'https://github.com/DanielKovalevich'; }
    get description() { return 'Extension that pulls manga from Manganelo, includes Advanced Search and Updated manga fetching'; }
    get hentaiSource() { return false; }
    getMangaShareUrl(mangaId) { return `${MN_DOMAIN}/manga/${mangaId}`; }
    get websiteBaseURL() { return MN_DOMAIN; }
    get rateLimit() {
        return 2;
    }
    get sourceTags() {
        return [
            {
                text: "Notifications",
                type: paperback_extensions_common_1.TagType.GREEN
            }
        ];
    }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: `${MN_DOMAIN}/manga/`,
                metadata: metadata,
                method: 'GET',
                param: id
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b, _c, _d, _e;
        let manga = [];
        let $ = this.cheerio.load(data);
        let panel = $('.panel-story-info');
        let title = (_a = $('.img-loading', panel).attr('title')) !== null && _a !== void 0 ? _a : '';
        let image = (_b = $('.img-loading', panel).attr('src')) !== null && _b !== void 0 ? _b : '';
        let table = $('.variations-tableInfo', panel);
        let author = '';
        let artist = '';
        let rating = 0;
        let status = paperback_extensions_common_1.MangaStatus.ONGOING;
        let titles = [title];
        let follows = 0;
        let views = 0;
        let lastUpdate = '';
        let hentai = false;
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
        for (let row of $('tr', table).toArray()) {
            if ($(row).find('.info-alternative').length > 0) {
                let alts = $('h2', table).text().split(/,|;/);
                for (let alt of alts) {
                    titles.push(alt.trim());
                }
            }
            else if ($(row).find('.info-author').length > 0) {
                let autart = $('.table-value', row).find('a').toArray();
                author = $(autart[0]).text();
                if (autart.length > 1) {
                    artist = $(autart[1]).text();
                }
            }
            else if ($(row).find('.info-status').length > 0) {
                status = $('.table-value', row).text() == 'Ongoing' ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
            }
            else if ($(row).find('.info-genres').length > 0) {
                let elems = $('.table-value', row).find('a').toArray();
                for (let elem of elems) {
                    let text = $(elem).text();
                    let id = (_e = (_d = (_c = $(elem).attr('href')) === null || _c === void 0 ? void 0 : _c.split('/').pop()) === null || _d === void 0 ? void 0 : _d.split('-').pop()) !== null && _e !== void 0 ? _e : '';
                    if (text.toLowerCase().includes('smut')) {
                        hentai = true;
                    }
                    tagSections[0].tags.push(createTag({ id: id, label: text }));
                }
            }
        }
        table = $('.story-info-right-extent', panel);
        for (let row of $('p', table).toArray()) {
            if ($(row).find('.info-time').length > 0) {
                let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''));
                lastUpdate = time.toDateString();
            }
            else if ($(row).find('.info-view').length > 0) {
                views = Number($('.stre-value', row).text().replace(/,/g, ''));
            }
        }
        rating = Number($('[property=v\\:average]', table).text());
        follows = Number($('[property=v\\:votes]', table).text());
        let summary = $('.panel-story-info-description', panel).text();
        manga.push(createManga({
            id: metadata.id,
            titles: titles,
            image: image,
            rating: Number(rating),
            status: status,
            artist: artist,
            author: author,
            tags: tagSections,
            views: views,
            follows: follows,
            lastUpdate: lastUpdate,
            desc: summary,
            hentai: hentai
        }));
        return manga;
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${MN_DOMAIN}/manga/`,
            metadata: metadata,
            method: 'GET',
            param: mangaId
        });
    }
    getChapters(data, metadata) {
        var _a, _b, _c, _d, _e, _f;
        let $ = this.cheerio.load(data);
        let allChapters = $('.row-content-chapter', '.body-site');
        let chapters = [];
        for (let chapter of $('li', allChapters).toArray()) {
            let id = (_b = (_a = $('a', chapter).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let name = (_c = $('a', chapter).text()) !== null && _c !== void 0 ? _c : '';
            let chNum = Number((_e = ((_d = /Chapter (\d*)/g.exec(name)) !== null && _d !== void 0 ? _d : [])[1]) !== null && _e !== void 0 ? _e : '');
            let time = new Date((_f = $('.chapter-time', chapter).attr('title')) !== null && _f !== void 0 ? _f : '');
            chapters.push(createChapter({
                id: id,
                mangaId: metadata.id,
                name: name,
                langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                chapNum: chNum,
                time: time
            }));
        }
        return chapters;
    }
    getChapterDetailsRequest(mangaId, chId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${MN_DOMAIN}/chapter/`,
            method: "GET",
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                Cookie: 'content_lazyload=off'
            },
            param: `${mangaId}/${chId}`
        });
    }
    getChapterDetails(data, metadata) {
        var _a;
        let $ = this.cheerio.load(data);
        let pages = [];
        for (let item of $('img', '.container-chapter-reader').toArray()) {
            pages.push((_a = $(item).attr('src')) !== null && _a !== void 0 ? _a : '');
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    filterUpdatedMangaRequest(ids, time) {
        let metadata = { 'ids': ids, 'referenceTime': time, page: 1 };
        return createRequestObject({
            url: `${MN_DOMAIN}/genre-all/`,
            method: 'GET',
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            param: `${metadata.page}`
        });
    }
    filterUpdatedManga(data, metadata) {
        var _a, _b;
        let $ = this.cheerio.load(data);
        let returnObject = {
            ids: [],
            nextPage: undefined
        };
        let passedReferenceTime = false;
        let panel = $('.panel-content-genres');
        for (let item of $('.content-genres-item', panel).toArray()) {
            let id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let time = new Date($('.genres-item-time').first().text());
            // site has a quirk where if the manga what updated in the last hour
            // it will put the update time as tomorrow
            if (time > new Date(Date.now())) {
                time = new Date(Date.now() - 60000);
            }
            passedReferenceTime = time <= metadata.referenceTime;
            if (!passedReferenceTime) {
                if (metadata.ids.includes(id)) {
                    returnObject.ids.push(id);
                }
            }
            else
                break;
        }
        if (!passedReferenceTime) {
            metadata.page++;
            returnObject.nextPage = createRequestObject({
                url: `${MN_DOMAIN}/genre-all/`,
                method: 'GET',
                metadata: metadata,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                param: `${metadata.page}`
            });
        }
        return createMangaUpdates(returnObject);
    }
    constructGetViewMoreRequest(key, page) {
        let metadata = { page: page };
        let param = '';
        switch (key) {
            case 'latest_updates': {
                param = `/genre-all/${metadata.page}`;
                break;
            }
            case 'new_manga': {
                param = `/genre-all/${metadata.page}?type=newest`;
                break;
            }
            default: return undefined;
        }
        return createRequestObject({
            url: `${MN_DOMAIN}`,
            method: 'GET',
            param: param,
            metadata: {
                key, page
            }
        });
    }
    getHomePageSectionRequest() {
        let request = createRequestObject({ url: `${MN_DOMAIN}`, method: 'GET', });
        let section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' });
        let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: this.constructGetViewMoreRequest('latest_updates', 1) });
        let section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: this.constructGetViewMoreRequest('new_manga', 1) });
        return [createHomeSectionRequest({ request: request, sections: [section1, section2, section3] })];
    }
    getHomePageSections(data, sections) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let $ = this.cheerio.load(data);
        let topManga = [];
        let updateManga = [];
        let newManga = [];
        for (let item of $('.item', '.owl-carousel').toArray()) {
            let id = (_b = (_a = $('a', item).first().attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
            topManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: $('a', item).first().text() }),
                subtitleText: createIconText({ text: $('[rel=nofollow]', item).text() })
            }));
        }
        for (let item of $('.content-homepage-item', '.panel-content-homepage').toArray()) {
            let id = (_e = (_d = $('a', item).first().attr('href')) === null || _d === void 0 ? void 0 : _d.split('/').pop()) !== null && _e !== void 0 ? _e : '';
            let image = (_f = $('img', item).attr('src')) !== null && _f !== void 0 ? _f : '';
            let itemRight = $('.content-homepage-item-right', item);
            let latestUpdate = $('.item-chapter', itemRight).first();
            updateManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: $('a', itemRight).first().text() }),
                subtitleText: createIconText({ text: $('.item-author', itemRight).text() }),
                primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
                secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
            }));
        }
        for (let item of $('a', '.panel-newest-content').toArray()) {
            let id = (_h = (_g = $(item).attr('href')) === null || _g === void 0 ? void 0 : _g.split('/').pop()) !== null && _h !== void 0 ? _h : '';
            let image = (_j = $('img', item).attr('src')) !== null && _j !== void 0 ? _j : '';
            let title = (_k = $('img', item).attr('alt')) !== null && _k !== void 0 ? _k : '';
            newManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title })
            }));
        }
        sections[0].items = topManga;
        sections[1].items = updateManga;
        sections[2].items = newManga;
        return sections;
    }
    searchRequest(query) {
        var _a, _b, _c, _d, _e, _f;
        let metadata = { page: 1, search: '' };
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).concat((_b = query.includeDemographic) !== null && _b !== void 0 ? _b : []).join('_');
        let excluded = ((_c = query.excludeGenre) !== null && _c !== void 0 ? _c : []).concat((_d = query.excludeDemographic) !== null && _d !== void 0 ? _d : []).join('_');
        let status = "";
        switch (query.status) {
            case 0:
                status = 'completed';
                break;
            case 1:
                status = 'ongoing';
                break;
            default: status = '';
        }
        let keyword = ((_e = query.title) !== null && _e !== void 0 ? _e : '').replace(/ /g, '_');
        if (query.author)
            keyword += ((_f = query.author) !== null && _f !== void 0 ? _f : '').replace(/ /g, '_');
        let search = `s=all&keyw=${keyword}`;
        search += `&g_i=${genres}&g_e=${excluded}`;
        if (status) {
            search += `&sts=${status}`;
        }
        metadata.search = search;
        return createRequestObject({
            url: `${MN_DOMAIN}/advanced_search?`,
            method: 'GET',
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            param: `${search}&page=${metadata.page}`
        });
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let panel = $('.panel-content-genres');
        let manga = [];
        for (let item of $('.content-genres-item', panel).toArray()) {
            let id = (_b = (_a = $('.genres-item-name', item).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let title = $('.genres-item-name', item).text();
            let subTitle = $('.genres-item-chap', item).text();
            let image = (_c = $('.img-loading', item).attr('src')) !== null && _c !== void 0 ? _c : '';
            let rating = $('.genres-item-rate', item).text();
            let updated = $('.genres-item-time', item).text();
            manga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subTitle }),
                primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
            }));
        }
        metadata.page = metadata.page++;
        let nextPage = this.isLastPage($) ? undefined : {
            url: `${MN_DOMAIN}/advanced_search?`,
            method: 'GET',
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            param: `${metadata.search}&page=${metadata.page}`
        };
        return createPagedResults({
            results: manga,
            nextPage: nextPage
        });
    }
    getTagsRequest() {
        return createRequestObject({
            url: `${MN_DOMAIN}/advanced_search?`,
            method: 'GET',
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            }
        });
    }
    getTags(data) {
        var _a;
        let $ = this.cheerio.load(data);
        let panel = $('.advanced-search-tool-genres-list');
        let genres = createTagSection({
            id: 'genre',
            label: 'Genre',
            tags: []
        });
        for (let item of $('span', panel).toArray()) {
            let id = (_a = $(item).attr('data-i')) !== null && _a !== void 0 ? _a : '';
            let label = $(item).text();
            genres.tags.push(createTag({ id: id, label: label }));
        }
        return [genres];
    }
    getViewMoreRequest(key) {
        let metadata = { page: 1 };
        let param = '';
        switch (key) {
            case 'latest_updates': {
                param = `/genre-all/${metadata.page}`;
                break;
            }
            case 'new_manga': {
                param = `/genre-all/${metadata.page}?type=newest`;
                break;
            }
            default: return undefined;
        }
        return createRequestObject({
            url: `${MN_DOMAIN}`,
            method: 'GET',
            param: param,
            metadata: metadata
        });
    }
    getViewMoreItems(data, key, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let manga = [];
        if (key == 'latest_updates' || key == 'new_manga') {
            let panel = $('.panel-content-genres');
            for (let item of $('.content-genres-item', panel).toArray()) {
                let id = (_b = ((_a = $('a', item).first().attr('href')) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
                let image = (_c = $('img', item).attr('src')) !== null && _c !== void 0 ? _c : '';
                let title = $('.genres-item-name', item).text();
                let subtitle = $('.genres-item-chap', item).text();
                let time = new Date($('.genres-item-time').first().text());
                if (time > new Date(Date.now())) {
                    time = new Date(Date.now() - 60000);
                }
                let rating = $('.genres-item-rate', item).text();
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subtitle }),
                    primaryText: createIconText({ text: rating, icon: 'star.fill' }),
                    secondaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' })
                }));
            }
        }
        else
            return null;
        let nextPage = undefined;
        console.log(!this.isLastPage($));
        if (!this.isLastPage($)) {
            metadata.page = metadata.page++;
            let param = '';
            switch (key) {
                case 'latest_updates': {
                    param = `/genre-all/${metadata.page}`;
                    break;
                }
                case 'new_manga': {
                    param = `/genre-all/${metadata.page}?type=newest`;
                    break;
                }
                default: return null;
            }
            nextPage = {
                url: `${MN_DOMAIN}`,
                method: 'GET',
                param: param,
                metadata: metadata
            };
            console.log(nextPage.url);
            console.log(nextPage.method);
            console.log(nextPage.param);
        }
        return createPagedResults({
            results: manga,
            nextPage: nextPage
        });
    }
    /**
     * Manganelo image requests for older chapters and pages are required to have a referer to it's host
     * @param request
     */
    requestModifier(request) {
        let headers = request.headers == undefined ? {} : request.headers;
        headers['Referer'] = `${MN_DOMAIN}`;
        return createRequestObject({
            url: request.url,
            method: request.method,
            headers: headers,
            data: request.data,
            metadata: request.metadata,
            timeout: request.timeout,
            param: request.param,
            cookies: request.cookies,
            incognito: request.incognito
        });
    }
    isLastPage($) {
        var _a;
        let current = $('.page-select').text();
        let total = $('.page-last').text();
        if (current) {
            total = ((_a = /(\d+)/g.exec(total)) !== null && _a !== void 0 ? _a : [''])[0];
            return (+total) === (+current);
        }
        return true;
    }
}
exports.Manganelo = Manganelo;

},{"paperback-extensions-common":5}]},{},[20])(20)
});
