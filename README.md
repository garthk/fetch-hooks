# fetch-hooks

[![Build status](https://travis-ci.org/garthk/fetch-hooks.svg?branch=master)](https://travis-ci.org/garthk/fetch-hooks)
[![Greenkeeper badge](https://badges.greenkeeper.io/garthk/fetch-hooks.svg)](https://greenkeeper.io/)

Hook a WhatWG-compatible `fetch` function with customised behaviour, e.g.:

* Handling [`data:`](#hooking-data-urls-for-methods-get-and-head) URIs
* Handling [`file:`](#hooking-file-urls-for-methods-get-and-head) URLs
* Handling [`s3:`](#hooking-s3-urls-for-methods-get-head-put-and-delete) URLs
* Enforcing [`https:`](#enforcing-https) as your transport protocol

More experimentally:

* Dumping [`curl`](#troubleshooting-with-curl) command lines
* Logging to [`rsyslog`](#logging-to-a-remote-syslog-server)
* Adding your own custom [lifecycle hooks](#adding-your-own-lifecycle-hooks)

Being considered:

* [OpenZipkin B3 propagation](https://github.com/openzipkin/b3-propagation)

## Usage

```js
const { hook, fetch, hooks } = require('fetch-hooks');
const _fetch = hook(fetch, myHook); // construct a hooked fetch
const response = await _fetch(uri); // and use it as if it were normal
console.log(await response.text());
```

### Hooking `data:` URLs for methods `GET` and `HEAD`

Add `hooks.data` to support `data:` URIs:

```js
const _fetch = hook(fetch, hooks.data);
const response = await _fetch('data:text/ascii;base64,TUlORCBCTE9XTg==');
console.log(await response.text());
```

### Hooking `file:` URLs for methods `GET` and `HEAD`

Add a `hooks.file` return value to support S3 bucket access via `s3:` URIs:

```js
const _fetch = hook(fetch, hooks.file({ baseURI: process.cwd() }));
const response = await _fetch('file:test/data/smiley.txt');
console.log(await response.text());
```

File hooks are only active for request URIs within `baseURI`, which defaults to the process' current working directory _at request time_.

**WARNINGS:**

Due to quirks of `node-fetch` 2.1.1 (2018-03-05):

* If you request a relative `file:` URI, `hook` will resolve it against the process' current working directory _at request time_ before passing it to the hooks. This is necessary to survive the `Request` constructor.

* If you call `response.text()`, all files are read as if encoded in UTF-8, even if they aren't. I'm jamming `charset=UTF-8` into the `Content-Type` as fair warning. Try the `node-fetch` extensions `response.body.buffer` and `response.body.textConverted()` if this doesn't work for you.

### Hooking `s3:` URLs for methods `GET`, `HEAD`, `PUT`, and `DELETE`

Add a `hooks.s3` return value to support S3 bucket access:

```js
// construct an S3 Service object
const { S3 } = require('aws-sdk');
const s3 = new S3({
    region: 'ap-southeast-2',
    signatureVersion: 'v4',
});

// attach it to an S3 hook for your bucket's base URL:
const { hook, fetch, hooks } = require('fetch-hooks');
const s3hook = hooks.s3(s3, { baseURI: 's3://bucket', acl: 'private' });
const _fetch = hook(fetch, s3hook);

// fetch content from the bucket
const response = await _fetch('s3://bucket/key');
console.log(await response.text());
```

S3 URIs give the bucket name where you'd expect the host name, consistent with the [`aws s3`][aws-cli-s3] command line.

[aws-cli-s3]: https://docs.aws.amazon.com/cli/latest/reference/s3/index.html

S3 hooks are only active for request URIs within `baseURI`, which defaults to `s3:/` to match any bucket.

The `acl` option specifies a [canned ACL][canned-acl], and defaults to `private`.

[canned-acl]: https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl

### Enforcing HTTPS

Add `hooks.httpsOnly` to enforce that you're only willing to speak over the HTTPS protocol.

```js
const { hook, fetch, hooks } = require('fetch-hooks');
const _fetch = hook(fetch, /* other hooks, */ hooks.httpsOnly);
```

It's safe to use `hooks.httpsOnly` last in the chain, as the `file:` and `data:` hooks will have already responded, and the `s3:` hook will have changed the request to a signed `https:` request.

### Troubleshooting with `curl`

Add `hooks.curl` to write `curl` commands to standard error:

```js
const _fetch = hook(fetch, /* other hooks, */ hooks.curl);
```


You can also set the `DEBUG` environment variable to have useful information dumped to the console. See the [`debug`][debug] documentation for more detail.

[debug]: https://www.npmjs.com/package/debug

**WARNINGS:**

* **This part of the API is not yet stable**, the input handling in particular. I reserve the right to make breaking changes with minor or patch level version bumps until I see some sign of third party usage. I welcome PRs and suggestions.

* The commands assume any input for `PUT`, `POST` etc are in `/tmp/input`. The hook does _not_ write any such content to `/tmp/input`.

### Logging to a remote syslog server

Add `hooks.rsyslog` to send packets to an [RFC5424] compliant server.


```js
const _fetch = hook(fetch, /* other hooks, */ hooks.rsyslog({
  target_host: '127.0.0.1',
  target_port: 514,
}));
```

For full documentation of the options, see the [`rsyslog`][rsyslog] package.

**WARNINGS:**

* **This part of the API is not yet stable**, the output format in particular. I reserve the right to make breaking changes with minor or patch level version bumps until I see some sign of third party usage. I welcome PRs and suggestions.

* The `len=` segment requires some guesswork, and might not match the number of bytes on the wire, especially if the server omits or lies about the `content-length`.

[rsyslog]: https://www.npmjs.com/package/rsyslog
[RFC5424]: https://tools.ietf.org/html/rfc5424

### Adding your own lifecycle hooks

Return a function named `prereq`, `postreq`, or `error` to get called either before a request, after a request, or when a hook fails:

* `postreq(req, res, err)` will be called after a request is made, with either `res` or `err` set to `null` depending on whether the request crashed out or succeeded.

* `error(err)` will be called if a call to a hook or lifecycle hook function fails.

**WARNINGS:**

* **This part of the API is not yet stable**. I reserve the right to make breaking changes with minor or patch level version bumps until I see some sign of third party usage. I welcome PRs and suggestions.

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
