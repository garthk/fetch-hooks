# fetch-hooks

A ~~means~~ **INCOMPLETE WORK IN PROGRESS** to provide a WhatWG-compatible `fetch` function with customised behaviour.

## Usage

```js
const FetchHookManager = require('fetch-hooks');
const FetchHookManager = require('.');
const manager = new FetchHookManager({
    hooks: [ /* ... */ ],
    upstream: FetchHookManager.upstream, // === require('node-fetch')
});
const request = await manager.fetch('https://example.com/');
console.log(await request.text());
```

`FetchHookManager.fetch` will construct a `Request` using `node-fetch`, call each function in `hooks`, `await` its return value, and then:

* Ignore the hook if the return value is falsey
* Resolve with the return value's `response` property if found
* Continue with the return value's `request` property if found

If there are no more hooks, `FetchHookManager.fetch` will:

* Pass through to `config.upstream` if no hooks are left, or
* Reject with an error if `config.upstream` is `null`

`FetchHookManager.upstream` contains a default `fetch` from `node-fetch`, also providing access to its handy `Request`, `Response`, and `Headers` constructors.

## Typings

I'm supplying my own typings for `node-fetch`, which _might_ interfere with yours. Please let me know how it turns out.

## Background

A few small things bother me about using WhatWG [`fetch`][WHATWGF] for back end programming:

* I can't use `fetch` for protocols other than `http:` and `https:`, making it hard to use when I'm receiving a trusted URI that could reasonably have a `file:` or `data:` protocol.

* If my packages take a `fetch` as part of their configuration, I need to mock `fetch` during tests. I'd like that to be easier.

* If they don't, I have to have them take an `agent` as part of their configuration if they expect HTTPS. I also have to stand up an HTTPS server.

* It'd sometimes be handy to apply different outbound headers for different hosts, but I don't want to make the code making the requests responsible for that application.

This repository is an experiment which might end up in [proof by contradiction][WPBC]. My premise is:

* An API-compatible `fetch` with the ability to register [hooks][WH] could solve all the above, and possibly open some exciting possibilities.

[WHATWGF]: https://github.github.io/fetch/
[WPBC]: https://en.wikipedia.org/wiki/Proof_by_contradiction
[WH]: https://en.wikipedia.org/wiki/Hooking

## Attitude Problems

* I'm writing this for Node 8 and above, not earlier Node, and not your browser.

* I'm maintaining my own TypeScript typings, rather than leaving that to the community.

* I'm not writing it in TypeScript, though, because some JavaScript programmers seem to break out in a rash when they touch it. To be fair to them, the differences between `@types/node-fetch` and the official TypeScript definitions of `Request` et al drove me to quite some frustration, hence my own typings for `node-fetch`.
