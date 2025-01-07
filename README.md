# mucho

This is the `mucho`, a command-line tool designed to simplify the development
and testing of Solana blockchain programs. The tool provides an array of
commands to manage Solana Toolkit installations, clone and manage blockchain
fixtures (accounts, programs, etc), and simplifying the experience of running a
local test validator with all the required state for a consistent development
experience.

> `mucho` is in beta and subject to change. Please feel free to
> [open issues](https://github.com/solana-developers/mucho/issues) with any
> feedback, feature requests, or issues you experience.

**System Requirements:**

- NodeJS (version >= 22)

**Usage:**

```shell
npx mucho --help
```

This tool is not recommended to be installed as a global npm package on your
system. If installed globally, unexpected behavior may occur.

## Commands

- [`install`](#install) - Install and manage the Solana Toolkit's local
  development tooling on your system.
- [`clone`](#clone) - Clone accounts and programs (aka fixtures) from any Solana
  cluster desired and declared in the `Solana.toml`.
- [`validator`](#validator) - Run the `solana-test-validator` on your local
  machine, including loading all the cloned fixtures for your repo.
- [`build`](#build) - Build all or a single Solana program in your workspace.
- [`deploy`](#deploy) - Deploy a Solana program in your workspace.
- [`coverage`](#coverage) - Run code coverage tests on a Solana program.

### install

Install the Solana Toolkit local development tooling on your system.

**Usage:**

```shell
npx mucho install --help
```

The Solana Toolkit includes the following tools:

- [Rust and Cargo](https://solana.com/docs/intro/installation#install-rust) -
  The Rust program language and Cargo package manager are installed via
  [Rustup](https://rustup.rs/).
- [Agave CLI tool suite](https://solana.com/docs/intro/installation#install-the-solana-cli) -
  the standard tool suite required to build and deploy Solana programs (formerly
  known as the "Solana CLI tool suite").
- [solana-verify](https://github.com/Ellipsis-Labs/solana-verifiable-build) - A
  command line tool to build and verify Solana programs.
- [Anchor and AVM](https://www.anchor-lang.com/docs/installation#installing-using-anchor-version-manager-avm-recommended) -
  The Anchor framework and the Anchor Version Manager (AVM)
  - Yarn is currently installed as a dependency of Anchor. This dependency is
    expected to be removed in the near future.
- [Trident Fuzzer](https://ackee.xyz/trident/docs/latest/) - Rust-based fuzzing
  framework for Solana programs to help you ship secure code.
- [Zest](https://github.com/LimeChain/zest?tab=readme-ov-file) - Code coverage
  CLI tool for Solana programs.

### clone

Clone all the fixtures (accounts and programs) utilizing your `Solana.toml`
file.

**Usage:**

```shell
npx mucho clone --help
```

The default behavior for fixture cloning is as follows:

- All cloned fixtures are stored in the `fixtures` directory, unless overriden
  by your Solana.toml's `settings.accountDir`.
- All fixtures are cloned from Solana's mainnet cluster or the declared
  `settings.cluster` in Solana.toml.
- All fixtures are cloned from the same cluster, unless individually overriden.
- If any fixtures already exist, they are skipped from cloning.
- If a Solana account is cloned, the `owner` program will automatically be
  cloned from the same cluster, unless the program is explicitly declared in the
  Solana.toml.

To override the default cloning behavior for any fixture, declare the desired
override setting in your Solana.toml file. Some of the supported overrides
include:

- `cluster` - Desired cluster to clone the particular fixture from.
- `frequency` - Desired clone frequency when performing the clone operation.
- Each fixture type (account, program, etc) may support other specific
  overrides.

See the Solana.toml's [clone configuration](#clone-configuration) for details
about all options.

> The cloned fixtures are recommended to be version controlled via git in order
> to facilitate a consistent local Solana ledger (via [`validator`](#validator))
> and therefore reproducible and testable blockchain state for anyone with
> access to the repo.

### build

Build all or a single Solana program in your workspace.

**Usage:**

```shell
npx mucho build --help
```

### deploy

Deploy a Solana program in your workspace.

**Usage:**

```shell
npx mucho deploy --help
```

The default behavior for deploying is as follows:

- The `deploy` command will default to your Solana CLI declared cluster, unless
  overriden with the `-u, --url` flag.

### validator

Run the Solana test validator on your local machine, including loading all the
cloned fixtures for your repo.

**Usage:**

```shell
npx mucho validator --help
```

> Under the hood, the `validator` commands wraps the Agave tool suite's
> `solana-test-validator` command but also helps provide additional quality of
> life improvements for Solana developers. To view the generated
> `solana-test-validator` wrapper command, run
> `npx mucho validator --output-only`.

The default behavior for running the test validator is as follows:

- If the ledger does not already exist, or when resetting the ledger via the
  `--reset` flag, all the currently cloned fixtures will be loaded into the
  validator at genesis.
- All programs declared in your Solana.toml's `programs.localnet` declaration
  will be loaded into the validator at genesis.
- All loaded programs will have their upgrade authority set to your local
  keypair's address (via `settings.keypair`).

### coverage

Run code coverage tests on a Solana program, powered by the
[Zest CLI](https://github.com/LimeChain/zest?tab=readme-ov-file).

**Usage:**

```shell
npx mucho coverage --help
```

To pass additional arguments to the Zest CLI, append them at the end of this
tool's command starting with `--`. For example, to run the Zest CLI's help
command:

```shell
npx mucho coverage -- --help
```

## Solana.toml

The `Solana.toml` file is a framework agnostic manifest file containing metadata
and configuration settings to enable developers to more easily manage their
Solana program development processes.

The `Solana.toml` file is expected to be stored in the root a repo and committed
to git.

You can find an [example Solana.toml file](./tests/Solana.toml) here.

### `settings` configuration

Declare general defaults and configuration settings for use in various places.

- `cluster` - Desired cluster to clone all fixtures from (if not individually
  overriden per fixture). If not defined, defaults to Solana's mainnet.
  - Type: `enum`
  - Default: `mainnet`
  - Values: `mainnet`, `devnet`, or `testnet`
- `accountDir` - Path to store cloned fixtures (accounts and programs)
  - Type: `string`
  - Default: `fixtures`
- `keypair` - Path to the default local keypair file to use in various places
  (i.e. set as the upgrade authority for all cloned programs when running
  `mucho validator`)
  - Type: `string`
  - Default: `~/.config/solana/id.json` (same as the Agave CLI tool suite)

```toml
[settings]
accountDir = "fixtures" # default="fixtures"
# accountDir = ".cache/accounts" # default="fixtures"

cluster = "mainnet" # default="mainnet"
# cluster = "devnet"
# cluster = "testnet"

# keypair = "any/local/path" # default="~/.config/solana/id.json"
```

### `programs` configuration

The addresses of the programs in the workspace.

```toml
[programs.localnet]
counter = "AgVqLc7bKvnLL6TQnBMsMAkT18LixiW9isEb21q1HWUR"
[programs.devnet]
counter = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
[programs.testnet]
counter = "BmDHboaj1kBUoinJKKSRqKfMeRKJqQqEbUj1VgzeQe4A"
[programs.mainnet]
counter = "AgVqLc7bKvnLL6TQnBMsMAkT18LixiW9isEb21q1HWUR"
```

These addresses will be used to load programs using the `mucho validator` at
genesis.

### `clone` configuration

The Solana.toml's `clone` configuration settings are used to provide a framework
agnostic, consistent, and declarative way to clone data from the Solana
blockchain for use in local development and testing. Including more fine grain
control and quality of life improvements for Solana developers.

The cloned data (accounts, programs, etc) are referred to as "fixtures".

Each fixture type may support specific configuration settings and the following
individual overrides via their Solana.toml declaration:

- `cluster` - Desired cluster to clone the particular fixture from. If not
  declared, defaults to [`settings.cluster`](#settings-configuration).
- `frequency` - Desired clone frequency when performing the clone operation.
  - Type: `enum`
  - Values:
    - `cached` - (default) Only clone the fixture if it does not already exist
      locally.
    - `always` - Every time a clone operation is performed, this specific
      fixture will always be forced cloned from the cluster.

#### `clone.account`

To clone any account from a Solana cluster, use the `clone.account.<name>`
declaration.

Cloned accounts are stored as `json` files in the repo's
[`settings.accountDir`](#settings-configuration) directory.

When account cloning occurs, the account's `owner` program will be automatically
cloned from the same cluster and with the frequency. This helps ensure the
cloned/stored account fixture will have the same program that knows its data
structure and enables developers to correctly interact with the account while
running their local test validator.

**Usage:**

```toml filename="Solana.toml"
[clone.account.wallet]
# this is a random wallet account, owned by system program
address = "GQuioVe2yA6KZfstgmirAvugfUZBcdxSi7sHK7JGk3gk"
# override the cluster for a particular account, if not defined: uses `settings.cluster`
cluster = "devnet"
frequency = "always"

[clone.account.bonk]
# BONK mint address
address = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
cluster = "mainnet"

[clone.account.tm-rando]
# random metaplex token metadata account
address = "5uZQ4GExZXwwKRNmpxwxTW2ZbHxh8KjDDwKne7Whqm4H"
# this account is owned by: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
# and will be auto clone the program without needing to declare it anywhere
```

The example above will clone the 3 accounts from the network(s) and the owner
program for the `5uZQ4GExZXwwKRNmpxwxTW2ZbHxh8KjDDwKne7Whqm4H` account (which
happens to be `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`).

#### `clone.program`

To clone any program from a Solana cluster, use the `clone.program.<name>`
declaration.

Cloned accounts are stored as `so` binary files in the repo's
[`settings.accountDir`](#settings-configuration) directory.

```toml filename="Solana.toml"
[clone.program.bubblegum]
address = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
cluster = "mainnet"
# if you want to always force clone the account
# frequency = "always"

[clone.program.tm-metadata]
address = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
# `cluster` is not defined => fallback to `settings.cluster`
# `frequency` is not defined => will only clone if the program binary is missing locally
```

## Anchor Compatibility

This tool may support similar functionality and configuration enabled via the
`Anchor.toml` file. If an Anchor.toml file is detected, this tool will make a
best attempt to process the Anchor.toml file's configuration for functionality
that this tool supports.

The `Solana.toml` settings will normally take priority over the `Anchor.toml`
file's configuration.

The following Anchor.toml configuration settings are supported:

- `[programs.<network>]` - Anchor's CLI requires the program address to be
  declared for each respective cluster. This tool will use the Anchor.toml
  declared program ids for each program and cluster defined, unless the same
  address is declared in the Solana.toml.
- `[[test.validator.clone]]` - The program `address` listed will be cloned using
  the Anchor.toml declared `test.validator.url` value as the cluster, unless the
  same address is declared in the Solana.toml.
- `[[test.validator.account]]` - The account `address` listed will be cloned
  using the Anchor.toml declared `test.validator.url` value as the cluster,
  unless the same address is declared in the Solana.toml. No matter the cluster,
  the account's `owner` program will automatically be cloned from that same
  cluster.

Some general difference between how Anchor may handle similar functionality that
this tool supports include:

- Cloned accounts/programs into the repo - This tool [clones accounts](#clone)
  and programs into the repo and expects these fixtures to be committed to git.
  Accounts are stored as `.json` files and programs as `.so` binary files.
- Clone cache - Cloned fixtures are cached by default (in the repo), helping to
  reduce the load on RPC providers. This also helps developers working on the
  same source repository to have a consistent ledger state when performing local
  development and testing via [`mucho validator`](#validator).
- Mix-and-match cloning - This tool allows more
  [fine grain control](#cloneaccount) over which cluster any specific
  account/program gets cloned from. For example, if you want `account1` to come
  from mainnet and `account2` to come from devnet, you can easily accomplish
  this via Solana.toml.
