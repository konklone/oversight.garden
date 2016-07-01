## Dashboard

The [dashboard](https://oversight.garden/dashboard) stores, categorizes, and
displays errors and warnings from the
`[inspectors-general](https://github.com/unitedstates/inspectors-general)`
scrapers. Where relevant, URLs are provided as links. The dashboard displays
errors ahead of warnings, which simplifies triage.

#### Installation

To set up the dashboard, you will need to configure another index in
Elasticsearch, provide the scrapers with a URL to which results can be
uploaded, and configure a shared authentication token between the web app and
the scrapers.

1. Run `rake elasticsearch:init_dashboard` to create the index. Later, if you
need to re-create the index to make schema changes, you can do so with
`rake elasticsearch:init_dashboard force=true`. If it isn't set already, you
will need to specify an index name for this in `config/config.yaml`. See the
example configuration file for details.

1. In the `inspectors-general` directory, add a `dashboard` section to
`admin.yml`, following the structure shown in `admin.yml.example`. In the
`url` field, enter "https://<your_server_here>/dashboard/upload", substituting
in the hostname of the web server.

1. To avoid confusion from multiple scrapers uploading results to the same
server, the upload endpoint requires authentication. The scraper must include
a shared secret in the query string when uploading dashboard results to the
web server. Otherwise, the results are not accepted. First, create a random
string of characters for this purpose. Then, in the `inspectors-general`
directory, enter this in `admin.yml` in the `dashboard` section under the key
`secret`. In the `oversight.garden` directory, do the same with
`config/config.yaml`. Here too, the same string should be placed in the
`dashboard` section, under the key `secret`.

Once the above configuration is done, you should be able to restart the web
server, run a scraper, and see the results appear on the dashboard. Note that
results are only uploaded to the server right before Python exits; no
incremental results will be visible partway through.
