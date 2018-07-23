namespace :sitemap do
  desc "Generate a sitemap."
  task generate: :environment do
    require 'big_sitemap'
    require 'json'
    require "cgi"

    directory = (!Environment.config['sitemap'].nil? && !Environment.config['sitemap']['directory'].nil?) ? Environment.config['sitemap']['directory'] : 'public/sitemap'

    ping_google = (!Environment.config['sitemap'].nil?) && (Environment.config['sitemap']['ping_google'] ? true : false)
    ping_bing = (!Environment.config['sitemap'].nil?) && (Environment.config['sitemap']['ping_bing'] ? true : false)
    ping_yahoo = (!Environment.config['sitemap'].nil?) && (Environment.config['sitemap']['ping_yahoo'] ? true : false)
    yahoo_app_id = (Environment.config['sitemap'].nil?) ? nil : Environment.config['sitemap']['yahoo_app_id']
    ping_ask = (!Environment.config['sitemap'].nil?) && (Environment.config['sitemap']['ping_ask'] ? true : false)
    ping_yandex = (!Environment.config['sitemap'].nil?) && (Environment.config['sitemap']['ping_yandex'] ? true : false)

    BigSitemap.generate(
      base_url: "https://oversight.garden/",
      document_root: directory,
      url_path: "sitemap",
      ping_google: ping_google,
      ping_bing: ping_bing,
      ping_yahoo: ping_yahoo,
      yahoo_app_id: yahoo_app_id,
      ping_ask: ping_ask,
      ping_yandex: ping_yandex) do

      # Add homepage and list of inspectors
      add "/", change_frequency: "daily"
      add "/inspectors", change_frequency: "monthly"

      # Skip search results and search result Atom feeds

      # Add each inspector landing page
      inspectors_raw = File.read("config/inspectors.json")
      inspectors = JSON.parse(inspectors_raw)
      inspectors.each do |inspector|
        add "/inspector/" + inspector['slug'], change_frequency: "weekly"
      end

      # Add each report landing page
      data_dir = Environment.config['inspectors']['data']
      Dir.foreach(data_dir) do |inspector|
        next if inspector == "." or inspector == ".."
        next if not File.directory?(File.join(data_dir, inspector))
        Dir.foreach(File.join(data_dir, inspector)) do |year|
          next if year == "." or year == ".."
          next if not File.directory?(File.join(data_dir, inspector, year))
          Dir.foreach(File.join(data_dir, inspector, year)) do |report_id|
            next if report_id == "." or report_id == ".."
            next if not File.directory?(File.join(data_dir, inspector, year, report_id))
            next if not File.exist?(File.join(data_dir, inspector, year, report_id, "report.json"))
            add "/reports/" + inspector + "/" + CGI.escape(report_id), change_frequency: "monthly"
          end
        end
      end
    end
  end
end
