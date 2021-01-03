import cheerio from 'cheerio'
import { APIWrapper, Source } from 'paperback-extensions-common';
import { ReadmngCom } from '../ReadmngCom/ReadmngCom';

describe('ReadmngCom Tests', function () {
    var wrapper: APIWrapper = new APIWrapper();
    var source: Source = new ReadmngCom(cheerio);
    var chai = require('chai'), expect = chai.expect, should = chai.should();
    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    var mangaId = "versatile-mage";

    it("Get Manga Details", async () => {
        let details = await wrapper.getMangaDetails(source, [mangaId]);
        expect(details, `No results found for ID: ${mangaId}`).to.be.an('array');
        expect(details).to.not.have.lengthOf(0, "Empty response");

        let data = details[0];
        expect(data.id, "Missing link").to.be.not.empty;
        expect(data.image, "Missing thumbnail").to.be.not.empty;
        expect(data.status, "Missing status").to.exist;
        expect(data.desc, "Missing description of manga").to.be.not.empty;
        expect(data.titles, "Missing titles").to.be.not.empty;
    });

    it("Get Chapters", async () => {
        let data = await wrapper.getChapters(source, mangaId);

        expect(data, `No chapters present for ID: ${mangaId}`).to.not.be.empty;

        let entry = data[0]
        expect(entry.id, "No link present").to.not.be.empty;
        expect(entry.time, "No date present").to.exist
        expect(entry.name, "No title available").to.not.be.empty
    });

    it("Get Chapter Details", async () => {

        let chapters = await wrapper.getChapters(source, mangaId);
        let data = await wrapper.getChapterDetails(source, mangaId, chapters[0].id);

        expect(data, "No response").to.exist;
        expect(data, "Empty response").to.not.be.empty;

        expect(data.id, "Missing link").to.be.not.empty;
        expect(data.mangaId, "Missing mangaId").to.be.not.empty;
        expect(data.pages, "No pages found").to.be.not.empty;
    });
})