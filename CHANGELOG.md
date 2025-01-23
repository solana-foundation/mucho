# mucho

## 0.5.0

### Minor Changes

- [#23](https://github.com/solana-developers/mucho/pull/23)
  [`ecceb3d`](https://github.com/solana-developers/mucho/commit/ecceb3d55f912d0c271ecd82c126c8913a1c913f)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - improved version info
  and listing node version with the 'info' command

- [#34](https://github.com/solana-developers/mucho/pull/34)
  [`4119090`](https://github.com/solana-developers/mucho/commit/411909086c4a796279b23c1dcb7b54f22ec598ab)
  Thanks [@arrayappy](https://github.com/arrayappy)! - add the docs command that
  opens websites for each of the tools used by mucho

- [#30](https://github.com/solana-developers/mucho/pull/30)
  [`bea50ff`](https://github.com/solana-developers/mucho/commit/bea50ff2ed8773de976a6483eccf7e8ce370d758)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - add the inspect command

### Patch Changes

- [#32](https://github.com/solana-developers/mucho/pull/32)
  [`fbd29d7`](https://github.com/solana-developers/mucho/commit/fbd29d701f71c9410232ab08f360dcec66b150bc)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - refactor the
  warnMessage vs warnOutro

- [#39](https://github.com/solana-developers/mucho/pull/39)
  [`fa402c6`](https://github.com/solana-developers/mucho/commit/fa402c6e2c47cad08a499e76cd6a6513b8c82c00)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - fix `install` command
  force changing anchor version to match avm version

- [#27](https://github.com/solana-developers/mucho/pull/27)
  [`d8e8156`](https://github.com/solana-developers/mucho/commit/d8e81561bced8feff6ee446bf2601efceb8097bd)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - upgrade web3js to using
  v2

## 0.4.1

### Patch Changes

- [#21](https://github.com/solana-developers/mucho/pull/21)
  [`6c6b531`](https://github.com/solana-developers/mucho/commit/6c6b53106ff1ee80d37b99522699a766f02ba2e7)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - fix self installer to
  correctly detect installed mucho version. also to always install the latest
  version

- [#19](https://github.com/solana-developers/mucho/pull/19)
  [`1404279`](https://github.com/solana-developers/mucho/commit/14042795532516ae05c0835e044902eb389636b5)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - handle error when no
  cli config is set. also improve error handling around no keypair file existing

## 0.4.0

### Minor Changes

- [#13](https://github.com/solana-developers/mucho/pull/13)
  [`836be5d`](https://github.com/solana-developers/mucho/commit/836be5d6843bc74bcf1e92e68ee2b13d7d5cfb6c)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - add self updating to
  the cli

- [#9](https://github.com/solana-developers/mucho/pull/9)
  [`b496a9d`](https://github.com/solana-developers/mucho/commit/b496a9d28a65665fa2f2df074d16a0195ea51cc0)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - added special validator
  version handing to return the test validator version and mucho version

### Patch Changes

- [#12](https://github.com/solana-developers/mucho/pull/12)
  [`220cc86`](https://github.com/solana-developers/mucho/commit/220cc86f5db02ed2e9dd67827ba056bf7a7f0be7)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - refactor using all test
  validator args and options

## 0.3.0

### Minor Changes

- [#6](https://github.com/solana-developers/mucho/pull/6)
  [`40097b5`](https://github.com/solana-developers/mucho/commit/40097b5cf9811776a9cbde1bbf705be44af59a98)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - check for updates of
  the cargo based tooling (like avm, trident, and zest)

- [#8](https://github.com/solana-developers/mucho/pull/8)
  [`9c35f52`](https://github.com/solana-developers/mucho/commit/9c35f52a55c97ea2c871b5a066fd423aa9ad1e4f)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - added the `info`
  command to help troubleshoot issues

### Patch Changes

- [#4](https://github.com/solana-developers/mucho/pull/4)
  [`79007a1`](https://github.com/solana-developers/mucho/commit/79007a17fb45c3c2433150bbb9a49df212562e01)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - fix typo and make
  spinner fail text red

- [#7](https://github.com/solana-developers/mucho/pull/7)
  [`61c9535`](https://github.com/solana-developers/mucho/commit/61c9535852eaba39c9a7b4cd7819143d3ab296d6)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - update readme to add
  beta disclaimer

## 0.2.0

### Minor Changes

- [#1](https://github.com/solana-developers/mucho/pull/1)
  [`c5d54c5`](https://github.com/solana-developers/mucho/commit/c5d54c5e4b94d32256a6a891abab2d4bd8598314)
  Thanks [@nickfrosty](https://github.com/nickfrosty)! - add support for pass
  through args on the test validator command
