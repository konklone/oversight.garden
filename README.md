## Oversight.io

Bringing into sight the work of the United States government's oversight community.

A small website (in progress!) at [oversight.io](https://oversight.io).

### Getting started

Oversight.io is primarily a Node application, and uses Ruby for some data manipulation tasks.

Elasticsearch is used for text search *and* as a primary datastore.

#### Installing Node, Elasticsearch, and Ruby

Install [Node](http://nodejs.org/) by either:

* Downloading the latest tarball from [nodejs.org](http://nodejs.org/) and compiling/installing from source.
* Installing [nvm](https://github.com/creationix/nvm) and running `nvm install 0.10` and `nvm alias default 0.10`.

Install [Elasticsearch](http://elasticsearch.org/) **version 1.3 and up** by either:

* [Installing Elasticsearch on Linux](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/setup-repositories.html) through apt or yum.
* [Installing Elasticsearch on Mac OS X](http://stackoverflow.com/a/22855889/16075) through [Homebrew](http://brew.sh/).
* [Downloading the latest tarball](http://www.elasticsearch.org/download/) and compiling/installing from source.

Install [Ruby](https://www.ruby-lang.org/en/) 2.1.2 by either:

* Using [rbenv](https://github.com/sstephenson/rbenv) to run `rbenv install 2.1.2`.
* Using [brew](http://brew.sh/) to run `brew install ruby`.
* Some [other method](https://www.ruby-lang.org/en/installation/). Don't use `apt`, which will install a too-old version of Ruby.

Then install Bundler (a Ruby dependency manager) with:

```
gem install bundler
```

#### Setting up the application

Install Node dependencies with:

```
npm install
```

Install Ruby dependencies with:

```
bundle install
```

Symlink a `data` dir that points to the location of your downloaded inspector general report data from the [unitedstates/inspectors-general](https://github.com/unitedstates/inspectors-general) project.

```
ln -s data /path/to/ig/data
```

Then copy the config example file:

```
cp config/config.js.example config/config.js
```

You probably don't need to make any changes to `config.js`. It looks for Elasticsearch at `http://localhost:9200` by default, and for IG report data in the `data` directory you symlinked above.

#### Running the app

Launch the app:

```
node app
```

Then visit the application at `http://localhost:3000`. It should work! But you won't see any data in it.

#### Loading app data

Once, **before the first time you load data**, you need to tell Elasticsearch to optimize loaded report text for efficient highlighting.

Use `rake` (which ships with Ruby) to run:

```
rake elasticsearch:init
```

You can add `force=true` to the end of the command to empty the database and reload the mappings.

Then, to actually load report data, run:

```
node tasks/inspectors.js
```

This defaults to loading every report for the current year. See [the full list of supported options](tasks/inspectors.js) for data loading.

If this all worked, you should be up and running!

### License

All code original to this project is released as free, open source software under the [General Public License, Version 3](http://www.gnu.org/licenses/gpl-3.0.txt).

All prose original to this project is released under a <a href="http://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a> license.
