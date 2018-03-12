# fetch-hooks

A ~~means~~ **INCOMPLETE WORK IN PROGRESS** to provide a WhatWG-compatible `fetch` function with customised behaviour.

[![Build Status](https://travis-ci.org/garthk/fetch-hooks.svg?branch=master)](https://travis-ci.org/garthk/fetch-hooks)

## Usage

```js
const { hook, fetch, hooks } = require('fetch-hooks');
const _fetch = hook(fetch, myHook); // construct a hooked fetch
const response = await _fetch(uri); // and use it as if it were normal
console.log(await response.text());
```

### Hooking `data:` URLs

```js
const _fetch = hook(fetch, hooks.data);
const response = await _fetch('data:text/ascii;base64,TUlORCBCTE9XTg==');
console.log(await response.text());
```

### Hooking `s3:` URLs

```js
// construct an S3 Service object
const { S3 } = require('aws-sdk');
const s3 = new S3({
    region: 'ap-southeast-2',
    signatureVersion: 'v4',
});

// attach it to an S3 hook for your bucket's base URL:
const { hook, fetch, hooks } = require('fetch-hooks');
const s3hook = hooks.s3(s3, 's3://bucket/');
const _fetch = hook(fetch, s3hook);

// fetch content from the bucket
const response = await _fetch('s3://bucket/key');
console.log(await response.text());
```

### Troubleshooting

Set the `DEBUG` environment variable for useful information.

You can also get `curl` commands for debugging purposes spat to standard error, though they assume any input on `PUT`, `POST` etc are in `/tmp/input`:

```js
const _fetch = hook(fetch /* , ... other hooks */, hooks.curl);
```

## Under the Covers

```js
const { hook, fetch, hooks } = require('fetch-hooks');
const _fetch = hook(fetch /* , ... hooks */);
const response = await _fetch(uri);
console.log(await response.text());
```

A hooked `fetch` will construct a `Request` using `node-fetch` and then, for each of its hooks:

* Call the hook
* `await` its return value
* Ignore the hook if the return value is falsey
* Resolve with the return value's `response` property if found
* Continue with the return value's `request` property if found

If there are no more hooks, a hooked `fetch` will:

* Pass through to its upstream `fetch` (its first argument) if no hooks are left, or
* Reject with an error if its upstream `fetch` is `null`

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

* I'm not writing it in TypeScript, though, because some JavaScript programmers seem to break out in a rash when they touch it.

To be fair to those who are wary of TypeScript, I was frustrated by the differences between `@types/node-fetch` and the official TypeScript definitions of `Request` in the browser (aka `dom`). For now, I'm dodging the problem by providing my own typings for `node-fetch`.

You might not want to take a dependency on the `dom` typings because they declare many globals that you won't actually have. I'm tempted to clone all the polyfillable `Request` etc typings out of `lib.es2017.full.d.ts` into a `globals.d.ts` (see `@types/react` for an example), but it'll take more time than I have spare right now.
