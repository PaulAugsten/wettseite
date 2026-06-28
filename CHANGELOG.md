## [1.0.1](https://github.com/PaulAugsten/wettseite/compare/v1.0.0...v1.0.1) (2026-06-28)


### Bug Fixes

* moved release and deploy workflow into ci to prevent name-spoofing by a fork ([#14](https://github.com/PaulAugsten/wettseite/issues/14)) ([c9a9bb2](https://github.com/PaulAugsten/wettseite/commit/c9a9bb29765c6a3904b7a6d4d42532a59274bcc7))

# 1.0.0 (2026-06-26)


### Bug Fixes

* accidentially disabled writing matches to database ([de888ee](https://github.com/PaulAugsten/wettseite/commit/de888ee6b4b730260440e74aa9a5900237d30d72))
* added missing winner_id to type Match ([35412d9](https://github.com/PaulAugsten/wettseite/commit/35412d9454afdcd4eff390ef3ed784794cc1c8c7))
* adjusted cron job to only work once per day to satisfy vercel constraints ([719d2ce](https://github.com/PaulAugsten/wettseite/commit/719d2ce76cb24ec88bb25f54f9146ad4c408e57e))
* changed id to early, should be done later ([d142a3b](https://github.com/PaulAugsten/wettseite/commit/d142a3b4df36475d55521b8cb1b4db776c26d2d2))
* changed node version to 22 in workflow ([6953d70](https://github.com/PaulAugsten/wettseite/commit/6953d704c4887d0579f8645b52073e96fd115a6b))
* cron job had no route ([d3d93e0](https://github.com/PaulAugsten/wettseite/commit/d3d93e093bf48d0e213db37713ab316384abb71b))
* deno script caused errors, just put it in comments as it isn't being used right now ([0a3a237](https://github.com/PaulAugsten/wettseite/commit/0a3a237aeee00a017808bd96ff5c76aa56adb093))
* deprecated scraper caused error during building ([6eb3795](https://github.com/PaulAugsten/wettseite/commit/6eb3795b86230ba6f2e81e028342bc5313a0047c))
* finished matches now appear latest first; swiss stage now has the right stage value ([3c66f51](https://github.com/PaulAugsten/wettseite/commit/3c66f5109b419d3e1a3a034edb0c8a45929b16f0))
* fixed deploy bug in vercel ([#12](https://github.com/PaulAugsten/wettseite/issues/12)) ([056865e](https://github.com/PaulAugsten/wettseite/commit/056865ee4cb16638bc6308029ada34fe593e04e5))
* fixed deploy production ([#11](https://github.com/PaulAugsten/wettseite/issues/11)) ([371c70e](https://github.com/PaulAugsten/wettseite/commit/371c70ec6c991ce7f189ff77282b22f89e8d2574))
* fixed some things for deployment ([680641d](https://github.com/PaulAugsten/wettseite/commit/680641d5b74a88163950662504d90eef539bc287))
* fixed something with the insert logic and added sorting matches by date when inserting into db ([9719e34](https://github.com/PaulAugsten/wettseite/commit/9719e34df7d98ffa49bcc66469db6ffd9f9d5090))
* mandatory id for tournaments and matches ([a620cdc](https://github.com/PaulAugsten/wettseite/commit/a620cdc4978b09740063894d3b32a8a0ad65f134))
* prediction upsert had a typo; style: added css for predictions ([31d8e0b](https://github.com/PaulAugsten/wettseite/commit/31d8e0baad4680264dd4e234f57dcc9f05436cd0))
* predictions were allowed after the start of the match ([2624a81](https://github.com/PaulAugsten/wettseite/commit/2624a81d5c90060ebfa230e670ee427e13a62a0e))
* signup didn't work because of missing data and wrong trigger in spabase ([abb9bbd](https://github.com/PaulAugsten/wettseite/commit/abb9bbde1322869eb6bd3fc339b46a8f52075ee2))
* swissstage wasn't detected by match scraper ([3ce7ae5](https://github.com/PaulAugsten/wettseite/commit/3ce7ae5caefe7ed602024f3d0b44f0d6624f8386))
* updated package.json to fix some vulnerabilities ([e1739df](https://github.com/PaulAugsten/wettseite/commit/e1739dfd081ba63109a8151fd40624c91bba330a))
* workflow scope error ([efde972](https://github.com/PaulAugsten/wettseite/commit/efde972c4ec2a42ec2665ca8f9ac75ee4370de70))


### Features

* added coloring to wrong/right predictions ([c36f488](https://github.com/PaulAugsten/wettseite/commit/c36f48869c18c34b98a3eebc45bfc850ba4cc6d5))
* added direct link to all live tournaments on homepage ([b0d3a48](https://github.com/PaulAugsten/wettseite/commit/b0d3a4813775e273e5317b7080762b49f6a466ba))
* added gradient to prediction bar ([ec32520](https://github.com/PaulAugsten/wettseite/commit/ec325208cdaa10bb174c8ffe2bb49a8b19c693a4))
* added highlighting of current tab in the nav bar and fixed an issue with the login system ([2dd7bbc](https://github.com/PaulAugsten/wettseite/commit/2dd7bbc086ddbc45ef4b4dbe3c3e7921626774b6))
* added match listing to the frontend ([f6b99a4](https://github.com/PaulAugsten/wettseite/commit/f6b99a4829397596be7b55e443920dea2b769647))
* added navbar ([d24a630](https://github.com/PaulAugsten/wettseite/commit/d24a6303494f63ffd771a5333e6bf1792adcdc0a))
* added option to only get matches from chosen tournaments ([2898b73](https://github.com/PaulAugsten/wettseite/commit/2898b737df37e2666578f44b1c78793f28a58ed6))
* added prediction logic ([ca0094d](https://github.com/PaulAugsten/wettseite/commit/ca0094d9f097c550380fdff00cc66d7fcbe267bb))
* added prediction standings ([3c6c728](https://github.com/PaulAugsten/wettseite/commit/3c6c728a7fb704becdcde94bcb54cadc70b18c80))
* added proper css for signup page ([c168958](https://github.com/PaulAugsten/wettseite/commit/c168958ab9183cade616197a27a273f37791c9e9))
* added pwa install prompts for ios and android ([abbd659](https://github.com/PaulAugsten/wettseite/commit/abbd659dfcdcc8a57ed85325b9a8d230f78bd780))
* added pwa support ([2c4a479](https://github.com/PaulAugsten/wettseite/commit/2c4a479c69dfc58a2fe10896e96c6e10f88bfe00))
* migrated match ids to be independent of the wiki ids ([fdd511a](https://github.com/PaulAugsten/wettseite/commit/fdd511a5611661be83571654e279b77c87cc14cc))
* updated logic of live status for tournaments as the last match often exceeds the tournament date range ([5d37f26](https://github.com/PaulAugsten/wettseite/commit/5d37f26e645395274dd064a05d9501e9290157ec))
