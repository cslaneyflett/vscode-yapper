# YAPPER - Yet Another PhP-cs-fixER

## Why does this exist?
Because i got really annoyed with the other extensions.

## Why not use the 9000 other extensions?
Because they don't work right, literally none of them properly detect the binary.
- `vendor/bin`
- `tools/*/vendor/bin`
- `~/.composer/vendor/bin`
- and any paths you may want

It's really that simple, and yet every extension either
- bloated with features, while not getting the above right
- requires manual running because its not using formatter api
- will somehow balls up and eat the file content

INFURIATING!

## Goals
1. No obscure weirdness, absolutely nothing custom or out of the standard.
2. Minimal features, ONLY formatter API, nothing else.
3. No support for managing rule-sets or configs.
4. No support for any other tools.
5. No binaries included with the extension.

## What needs improving?
- Actual unit tests need writing
- Needs more thorough practical testing
    + I'm sure the async parts may be dodgy like some of the other extensions
